/**
 * Supabase Edge Function: admin-users
 * - 统一的用户与角色管理接口
 * - 仅管理员可用（依据数据库函数 is_admin()）
 * - 兼容你的 Secrets 命名：SERVICE_ROLE_KEY/Project_URL 或 SUPABASE_SERVICE_ROLE_KEY/SUPABASE_URL
 *
 * Endpoints:
 *  - GET    /functions/v1/admin-users                            // 兼容旧 listAdmins，返回管理员列表
 *  - POST   /functions/v1/admin-users { action, ...payload }
 *      - list_roles
 *      - list_users         { page?, pageSize?, search?, role_id? }
 *      - create_user        { email, password, name?, role_id? }
 *      - set_user_role      { user_id, role_id }
 *      - reset_password     { user_id } -> { action_link }
 *      - toggle_active      { user_id, active }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type Json = Record<string, any>
type Role = { id: number; name: string; permissions?: any }
type UserRow = { id: string; email: string; name?: string; role_id: number; last_sign_in_at?: string; created_at?: string; active?: boolean }

const readEnv = (k: string, alt?: string) => Deno.env.get(k) ?? (alt ? Deno.env.get(alt) : undefined)
const SUPABASE_URL = readEnv("SUPABASE_URL", "Project_URL")
const SERVICE_ROLE_KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY")

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL/Project_URL or SUPABASE_SERVICE_ROLE_KEY/SERVICE_ROLE_KEY in Edge Function secrets")
}

function serviceClient(authHeader?: string) {
  // 使用 service role，但透传调用者的 Authorization，便于获取当前用户身份
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : undefined
    }
  })
}

async function ensureAdmin(sb: ReturnType<typeof serviceClient>) {
  const { data, error } = await sb.rpc("is_admin")
  if (error) throw new Error("is_admin() 调用失败: " + error.message)
  if (!data) {
    const e: any = new Error("forbidden")
    e.status = 403
    throw e
  }
}

function ok(data: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Vary": "Origin" }, ...init })
}
function bad(msg: string, code = 400) {
  return new Response(JSON.stringify({ error: msg }), { status: code, headers: { "Content-Type": "application/json" } })
}
function toBool(v: any) {
  if (typeof v === "boolean") return v
  const s = String(v ?? "").toLowerCase()
  return ["1","true","yes","on"].includes(s)
}

// 统一错误包装
async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  const authHeader = req.headers.get("Authorization") || undefined
  const sb = serviceClient(authHeader)

  try {
    if (req.method === "GET") {
      // 兼容旧接口：返回管理员列表（role_id in (0,1)）
      await ensureAdmin(sb)
      const { data, error } = await sb.from("profiles").select("user_id:id, created_at").in("role_id", [0,1])
      if (error) throw new Error(error.message)
      return ok({ admins: data || [] })
    }

    if (req.method !== "POST") return bad("method not allowed", 405)

    const body: Json = await req.json().catch(() => ({}))
    const action = String(body.action || "").trim()

    // 校验管理员
    await ensureAdmin(sb)

    switch (action) {
      case "list_roles": {
        const { data, error } = await sb.from("roles").select("*").order("id", { ascending: true })
        if (error) throw new Error(error.message)
        return ok({ roles: (data || []) as Role[] })
      }
      case "list_users": {
        const page = Math.max(1, Number(body.page || 1))
        const pageSize = Math.min(100, Math.max(1, Number(body.pageSize || 10)))
        const search = (body.search || "").trim()
        const role_id = body.role_id != null ? Number(body.role_id) : null

        // 查询 auth.users + profiles
        // 先查总数与分页用户
        let filter = ""
        if (search) {
          // email 或 name 模糊
          filter = ` where (au.email ilike '%${search.replaceAll("'","''")}%' or coalesce(p.name,'') ilike '%${search.replaceAll("'","''")}%')`
        }
        if (role_id != null) {
          filter += filter ? ` and p.role_id = ${role_id}` : ` where p.role_id = ${role_id}`
        }

        const offset = (page - 1) * pageSize
        // 使用 service role 允许访问 auth.users 视图
        const countSql = `select count(*)::int as n from auth.users au join public.profiles p on au.id = p.id${filter};`
        const listSql = `
          select au.id, au.email, p.name, p.role_id, au.last_sign_in_at, au.created_at, coalesce(au.banned_until is not null,false) as banned
          from auth.users au
          join public.profiles p on au.id = p.id
          ${filter}
          order by coalesce(au.last_sign_in_at, au.created_at) desc
          limit ${pageSize} offset ${offset};
        `
        const { data: cnt, error: e1 } = await sb.rpc("exec_sql", { q: countSql })
        if (e1) throw new Error(e1.message)
        const total = (cnt?.[0]?.n as number) ?? 0

        const { data: rows, error: e2 } = await sb.rpc("exec_sql", { q: listSql })
        if (e2) throw new Error(e2.message)

        const users: UserRow[] = (rows || []).map((r: any) => ({
          id: r.id, email: r.email, name: r.name, role_id: r.role_id, last_sign_in_at: r.last_sign_in_at, created_at: r.created_at, active: !r.banned
        }))
        return ok({ users, total })
      }
      case "create_user": {
        const email = String(body.email || "").trim()
        const password = String(body.password || "")
        const name = (body.name ? String(body.name) : "").trim()
        const role_id = body.role_id != null ? Number(body.role_id) : 3

        if (!email || !password) return bad("缺少邮箱或密码")
        // 创建 auth 用户
        const { data: created, error } = await sb.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: name ? { name } : undefined
        })
        if (error) throw new Error(error.message)

        const uid = created.user?.id
        if (!uid) throw new Error("创建用户失败：未返回ID")

        // 写入 profiles
        const { error: e3 } = await sb.from("profiles").upsert({ id: uid, name, role_id }, { onConflict: "id" })
        if (e3) throw new Error(e3.message)

        return ok({ user_id: uid })
      }
      case "set_user_role": {
        const user_id = String(body.user_id || "")
        const role_id = Number(body.role_id)
        if (!user_id) return bad("缺少 user_id")
        if (![0,1,2,3,4].includes(role_id)) return bad("非法 role_id")
        const { error } = await sb.from("profiles").update({ role_id }).eq("id", user_id)
        if (error) throw new Error(error.message)
        return ok({ ok: true })
      }
      case "reset_password": {
        const user_id = String(body.user_id || "")
        if (!user_id) return bad("缺少 user_id")
        const { data, error } = await sb.auth.admin.generateLink({ type: "recovery", user_id })
        if (error) throw new Error(error.message)
        // 返回一次性链接，由前端（管理员）复制给用户；若配置了 SMTP，Supabase 也会发邮件
        return ok({ ok: true, action_link: data?.properties?.action_link })
      }
      case "toggle_active": {
        const user_id = String(body.user_id || "")
        const active = toBool(body.active)
        if (!user_id) return bad("缺少 user_id")
        const { error } = await sb.auth.admin.updateUserById(user_id, { ban_duration: active ? "none" : "100y" })
        if (error) throw new Error(error.message)
        return ok({ ok: true })
      }
      default:
        return bad("unknown action")
    }
  } catch (e: any) {
    const code = e?.status ?? 500
    const msg = e?.message || "internal error"
    return bad(msg, code)
  }
}

serve(handler)