import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const ALLOWED_ACTIONS = [
  "toggle_registration", "list_users", "update_email", "update_password",
  "confirm_email", "set_role", "delete_user", "create_user", "bulk_create_users",
];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller using getUser (reliable across all versions)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    // Check admin role using service role client to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, userId, email, password } = body;

    // Validate action against whitelist
    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation helpers
    const validateEmail = (e: string) => {
      if (!e || typeof e !== "string" || e.length > 255) throw new Error("بريد إلكتروني غير صالح");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("صيغة البريد الإلكتروني غير صالحة");
    };
    const validatePassword = (p: string) => {
      if (!p || typeof p !== "string" || p.length < 6 || p.length > 128) throw new Error("كلمة المرور يجب أن تكون بين 6 و 128 حرفاً");
    };
    const validateUuid = (id: string) => {
      if (!id || typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("معرف غير صالح");
    };
    const validateRole = (r: string) => {
      if (!["admin", "beneficiary", "waqif", "accountant"].includes(r)) throw new Error("دور غير صالح");
    };
    const validateNationalId = (nid: string | undefined) => {
      if (nid && (typeof nid !== "string" || !/^\d{10}$/.test(nid))) throw new Error("رقم الهوية يجب أن يكون 10 أرقام");
    };

    switch (action) {
      case "toggle_registration": {
        const enabled = body.enabled ? "true" : "false";
        const { error } = await adminClient
          .from("app_settings")
          .update({ value: enabled, updated_at: new Date().toISOString() })
          .eq("key", "registration_enabled");
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_users": {
        const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 500 });
        if (error) throw error;
        const { data: roles } = await adminClient.from("user_roles").select("*");

        const users = data.users.map((u) => ({
          id: u.id,
          email: u.email,
          email_confirmed_at: u.email_confirmed_at,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          role: roles?.find((r) => r.user_id === u.id)?.role || null,
        }));

        return new Response(JSON.stringify({ users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_email": {
        validateUuid(userId);
        validateEmail(email);
        if (!userId || !email) throw new Error("userId and email required");
        const { error } = await adminClient.auth.admin.updateUserById(userId, { email });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_password": {
        validateUuid(userId);
        validatePassword(password);
        if (!userId || !password) throw new Error("userId and password required");
        const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "confirm_email": {
        validateUuid(userId);
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "set_role": {
        validateUuid(userId);
        validateRole(body.role);
        if (userId === callerId) {
          return new Response(JSON.stringify({ error: "لا يمكنك تغيير دورك بنفسك" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!userId || !body.role) throw new Error("userId and role required");
        const { error } = await adminClient.from("user_roles")
          .upsert({ user_id: userId, role: body.role }, { onConflict: 'user_id' });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        validateUuid(userId);
        if (userId === callerId) {
          return new Response(JSON.stringify({ error: "لا يمكنك حذف حسابك الخاص" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // حماية البيانات المالية: فحص وجود توزيعات تاريخية مرتبطة بالمستفيد
        const { data: beneficiary } = await adminClient
          .from("beneficiaries")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (beneficiary) {
          const { count } = await adminClient
            .from("distributions")
            .select("id", { count: "exact", head: true })
            .eq("beneficiary_id", beneficiary.id);

          if (count && count > 0) {
            // فصل المستفيد عن حساب المستخدم بدلاً من حذفه (soft-delete)
            await adminClient
              .from("beneficiaries")
              .update({ user_id: null })
              .eq("id", beneficiary.id);
          } else {
            await adminClient.from("beneficiaries").delete().eq("user_id", userId);
          }
        }

        await adminClient.from("user_roles").delete().eq("user_id", userId);
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_user": {
        validateEmail(email);
        validatePassword(password);
        if (body.role) validateRole(body.role);
        if (body.nationalId) validateNationalId(body.nationalId);
        if (!email || !password) throw new Error("email and password required");
        const { data: newUser, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) throw error;

        if (body.role) {
          await adminClient.from("user_roles").insert({
            user_id: newUser.user.id,
            role: body.role,
          });
        }

        if (body.role === "beneficiary") {
          const { data: existingBeneficiary } = await adminClient
            .from("beneficiaries")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (existingBeneficiary) {
            const updateData: Record<string, unknown> = { user_id: newUser.user.id };
            if (body.nationalId) updateData.national_id = body.nationalId;
            if (body.name) updateData.name = body.name;
            await adminClient
              .from("beneficiaries")
              .update(updateData)
              .eq("id", existingBeneficiary.id);
          } else {
            await adminClient.from("beneficiaries").insert({
              name: body.name || email.split("@")[0],
              email: email,
              share_percentage: 0,
              user_id: newUser.user.id,
              national_id: body.nationalId || null,
            });
          }
        } else if (body.nationalId) {
          const { data: beneficiary } = await adminClient
            .from("beneficiaries")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (beneficiary) {
            await adminClient
              .from("beneficiaries")
              .update({ national_id: body.nationalId, user_id: newUser.user.id })
              .eq("id", beneficiary.id);
          }
        }

        if (body.role === "beneficiary") {
          await adminClient.rpc('notify_admins', {
            p_title: 'مستفيد جديد',
            p_message: `تم تسجيل مستفيد جديد: ${body.name || email}`,
            p_type: 'info',
            p_link: '/dashboard/beneficiaries',
          });
        }

        return new Response(JSON.stringify({ success: true, user: { id: newUser.user.id, email: newUser.user.email } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "bulk_create_users": {
        const { users } = body;
        if (!users || !Array.isArray(users) || users.length === 0) {
          throw new Error("users array is required");
        }
        if (users.length > 50) {
          throw new Error("Maximum 50 users at a time");
        }

        const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const results = [];
        const errors = [];

        for (const u of users) {
          if (!u.email || typeof u.email !== "string" || !EMAIL_RE.test(u.email) || u.email.length > 255) {
            errors.push({ email: u.email || "missing", error: "Invalid or missing email" });
            continue;
          }
          if (!u.password || typeof u.password !== "string" || u.password.length < 6 || u.password.length > 128) {
            errors.push({ email: u.email, error: "كلمة المرور يجب أن تكون بين 6 و128 حرفاً" });
            continue;
          }
          if (!u.name || typeof u.name !== "string" || u.name.trim().length === 0 || u.name.length > 200) {
            errors.push({ email: u.email, error: "Invalid or missing name" });
            continue;
          }

          try {
            const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
              email: u.email,
              password: u.password,
              email_confirm: true,
            });
            if (createError) {
              errors.push({ email: u.email, error: createError.message });
              continue;
            }

            const { error: roleError } = await adminClient.from("user_roles").insert({
              user_id: newUser.user.id,
              role: "beneficiary",
            });
            if (roleError) {
              await adminClient.auth.admin.deleteUser(newUser.user.id);
              errors.push({ email: u.email, error: "فشل تعيين الدور: " + roleError.message });
              continue;
            }

            const { error: benError } = await adminClient.from("beneficiaries").insert({
              name: u.name,
              email: u.email,
              share_percentage: 0,
              user_id: newUser.user.id,
              national_id: u.national_id || null,
            });
            if (benError) {
              await adminClient.from("user_roles").delete().eq("user_id", newUser.user.id);
              await adminClient.auth.admin.deleteUser(newUser.user.id);
              errors.push({ email: u.email, error: "فشل إنشاء المستفيد: " + benError.message });
              continue;
            }

            await adminClient.rpc('notify_admins', {
              p_title: 'مستفيد جديد',
              p_message: `تم تسجيل مستفيد جديد: ${u.name}`,
              p_type: 'info',
              p_link: '/dashboard/beneficiaries',
            }).catch(() => {});

            results.push({ email: u.email, userId: newUser.user.id, success: true });
          } catch (err) {
            errors.push({ email: u.email, error: (err as Error).message });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          created: results.length,
          failed: errors.length,
          results,
          errors
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
