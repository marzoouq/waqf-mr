import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ALLOWED_ACTIONS = [
  "toggle_registration", "list_users", "update_email", "update_password",
  "confirm_email", "set_role", "delete_user", "create_user", "bulk_create_users",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Verify the caller using getClaims (faster than getUser)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

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
      if (!["admin", "beneficiary", "waqif"].includes(r)) throw new Error("دور غير صالح");
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
        const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 100 });
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
        if (!userId) throw new Error("userId required");
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
        if (!userId || !body.role) throw new Error("userId and role required");
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        const { error } = await adminClient.from("user_roles").insert({
          user_id: userId,
          role: body.role,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        if (!userId) throw new Error("userId required");
        await adminClient.from("beneficiaries").delete().eq("user_id", userId);
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

        return new Response(JSON.stringify({ success: true, user: newUser.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "bulk_create_users": {
        const { users } = body;
        if (!users || !Array.isArray(users) || users.length === 0) {
          throw new Error("users array is required");
        }

        const results = [];
        const errors = [];

        for (const u of users) {
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

            await adminClient.from("user_roles").insert({
              user_id: newUser.user.id,
              role: "beneficiary",
            });

            await adminClient.from("beneficiaries").insert({
              name: u.name,
              email: u.email,
              share_percentage: 0,
              user_id: newUser.user.id,
              national_id: u.national_id || null,
            });

            await adminClient.rpc('notify_admins', {
              p_title: 'مستفيد جديد',
              p_message: `تم تسجيل مستفيد جديد: ${u.name}`,
              p_type: 'info',
              p_link: '/dashboard/beneficiaries',
            });

            results.push({ email: u.email, userId: newUser.user.id, success: true });
          } catch (err) {
            errors.push({ email: u.email, error: err.message });
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
