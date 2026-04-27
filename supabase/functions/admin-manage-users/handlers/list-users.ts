import { ok, type HandlerContext, type HandlerResult } from "./types.ts";

export async function listUsers({ admin, body, corsHeaders }: HandlerContext): Promise<HandlerResult> {
  const page = body.page || 1;
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 50 });
  if (error) throw error;

  const userIds = data.users.map((u) => u.id);
  const { data: roles } = await admin.from("user_roles").select("*").in("user_id", userIds);

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    email_confirmed_at: u.email_confirmed_at,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    role: roles?.find((r: { user_id: string; role: string }) => r.user_id === u.id)?.role || null,
  }));

  return ok({
    users,
    total: data.total ?? users.length,
    page,
    nextPage: users.length === 50 ? page + 1 : null,
  }, corsHeaders);
}
