import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, userId, email, password } = body;

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
        
        // Get roles for all users
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
        if (!userId || !email) throw new Error("userId and email required");
        const { error } = await adminClient.auth.admin.updateUserById(userId, { email });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_password": {
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
        if (!userId || !body.role) throw new Error("userId and role required");
        // Delete existing role
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        // Insert new role
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
        // Delete beneficiary records linked to this user
        await adminClient
          .from("beneficiaries")
          .delete()
          .eq("user_id", userId);
        // Delete user role
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        // Delete auth user
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_user": {
        if (!email || !password) throw new Error("email and password required");
        const { data: newUser, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) throw error;
        
        // Set role if provided
        if (body.role) {
          await adminClient.from("user_roles").insert({
            user_id: newUser.user.id,
            role: body.role,
          });
        }

        // Handle beneficiary linking/creation
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
        
        // Notify admins about new beneficiary
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
            // Create auth user
            const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
              email: u.email,
              password: u.password,
              email_confirm: true,
            });
            if (createError) {
              errors.push({ email: u.email, error: createError.message });
              continue;
            }

            // Set beneficiary role
            await adminClient.from("user_roles").insert({
              user_id: newUser.user.id,
              role: "beneficiary",
            });

            // Create beneficiary record
            await adminClient.from("beneficiaries").insert({
              name: u.name,
              email: u.email,
              share_percentage: 0,
              user_id: newUser.user.id,
              national_id: u.national_id || null,
            });

            // Notify admins about new beneficiary
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
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
