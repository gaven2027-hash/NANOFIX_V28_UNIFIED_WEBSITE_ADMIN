import { NextResponse, type NextRequest } from "next/server";
import { NANOFIX_ADMIN_APP_URL, isNanofixAdminAppHost, isNanofixProductionHost } from "@/lib/nanofix/domains";

type NanofixRole =
  | "super_admin"
  | "operations_admin"
  | "finance"
  | "content_admin"
  | "support"
  | "engineer"
  | "customer";

type VerifiedActor = {
  actorId: string;
  authUserId: string;
  role: NanofixRole;
  email?: string;
  authMode: "supabase" | "internal_secret" | "preview";
};

type PortalContext = "admin" | "customer" | "engineer";

const adminRoutes = [
  "/admin",
  "/dashboard",
  "/service-operations",
  "/website-management",
  "/social-media",
  "/advertising-center",
  "/ai-intelligence",
  "/customer-center",
  "/system-settings"
];

const loginRoutes = ["/login"];
const loginAliases: Record<string, PortalContext> = {
  "/admin-login": "admin",
  "/adminb": "admin",
  "/customer": "customer",
  "/customerlb": "customer",
  "/customer-login": "customer",
  "/engineer-login": "engineer",
  "/member-sign-up-login": "customer"
};
const registerAliases: Record<string, PortalContext> = {
  "/admin-register": "admin",
  "/customer-register": "customer",
  "/member-register": "customer"
};
const apiAdminRoutes = ["/api/admin", "/api/global-search", "/api/service-requests"];
const customerRoutes = ["/customer-portal", "/api/portal/customer"];
const engineerRoutes = ["/engineer-portal", "/api/portal/engineer"];

const adminRoles: NanofixRole[] = ["super_admin", "operations_admin", "finance", "content_admin", "support"];
const engineerRoles: NanofixRole[] = ["engineer", ...adminRoles];
const customerRoles: NanofixRole[] = ["customer", ...adminRoles];

function startsWithAny(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isLoginPath(pathname: string) {
  return startsWithAny(pathname, loginRoutes);
}

function isProtectedPath(pathname: string) {
  return (
    startsWithAny(pathname, adminRoutes) ||
    startsWithAny(pathname, apiAdminRoutes) ||
    startsWithAny(pathname, customerRoutes) ||
    startsWithAny(pathname, engineerRoutes)
  );
}

function allowedRolesFor(pathname: string): NanofixRole[] {
  if (startsWithAny(pathname, customerRoutes)) return customerRoles;
  if (startsWithAny(pathname, engineerRoutes)) return engineerRoles;
  return adminRoles;
}

function cleanIncomingAuthSpoofHeaders(headers: Headers) {
  [
    "x-nanofix-auth-verified",
    "x-admin-role",
    "x-admin-user-id",
    "x-admin-email",
    "x-admin-token",
    "x-nanofix-role",
    "x-nanofix-admin-role",
    "x-nanofix-admin-user-id"
  ].forEach((key) => headers.delete(key));
}

function normalizeRole(input: unknown): NanofixRole | null {
  const role = String(input || "").toLowerCase();
  if (role === "admin" || role === "ai_admin") return "content_admin";
  if (role === "finance_admin") return "finance";
  if (role === "support_admin") return "support";
  if (["super_admin", "operations_admin", "finance", "content_admin", "support", "engineer", "customer"].includes(role)) {
    return role as NanofixRole;
  }
  return null;
}

function adminAppUrl(pathname: string, search = "") {
  const url = new URL(NANOFIX_ADMIN_APP_URL);
  url.pathname = pathname;
  url.search = search;
  return url;
}

function redirectToAdminApp(request: NextRequest, pathname: string, search = request.nextUrl.search) {
  return NextResponse.redirect(adminAppUrl(pathname, search));
}

function shouldForceAdminAppHost(pathname: string, searchParams: URLSearchParams) {
  if (startsWithAny(pathname, [...adminRoutes, ...apiAdminRoutes])) return true;
  if (pathname === "/admin-login" || pathname === "/admin-register" || pathname === "/adminb") return true;
  if (pathname === "/login") return searchParams.get("role") === "admin";
  if (pathname === "/register") return searchParams.get("role") === "admin";
  return false;
}

function readBearerToken(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
}

function readJsonToken(value: string | undefined) {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as unknown;
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
    if (parsed && typeof parsed === "object") {
      const object = parsed as Record<string, unknown>;
      if (typeof object.access_token === "string") return object.access_token;
      const currentSession = object.currentSession as Record<string, unknown> | undefined;
      if (currentSession && typeof currentSession.access_token === "string") return currentSession.access_token;
    }
  } catch {
    return null;
  }
  return null;
}

function readSupabaseAccessToken(request: NextRequest) {
  const bearer = readBearerToken(request);
  if (bearer) return bearer;
  const direct = request.cookies.get("sb-access-token")?.value || request.cookies.get("nanofix_admin_access_token")?.value;
  if (direct) return direct;
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")) {
      const token = readJsonToken(cookie.value);
      if (token) return token;
    }
  }
  return null;
}

async function getSupabaseUserIdAndEmail(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_SUPABASE")) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string; email?: string };
  return user.id ? { id: user.id, email: user.email } : null;
}

async function fetchProfileActor(authUserId: string, email?: string): Promise<VerifiedActor | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  const profileParams = new URLSearchParams({
    select: "profile_id,auth_user_id,email,role,is_active",
    auth_user_id: `eq.${authUserId}`,
    limit: "1"
  });
  const profileResponse = await fetch(`${url}/rest/v1/profiles?${profileParams.toString()}`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, accept: "application/json" },
    cache: "no-store"
  });
  if (profileResponse.ok) {
    const rows = (await profileResponse.json()) as Array<{ profile_id?: string; email?: string; role?: string; is_active?: boolean }>;
    const profile = rows[0];
    const role = normalizeRole(profile?.role);
    if (profile?.profile_id && role && profile.is_active !== false) {
      return { actorId: profile.profile_id, authUserId, email: profile.email || email, role, authMode: "supabase" };
    }
  }

  const adminParams = new URLSearchParams({
    select: "admin_id,auth_user_id,email,role,status",
    auth_user_id: `eq.${authUserId}`,
    status: "eq.active",
    limit: "1"
  });
  const adminResponse = await fetch(`${url}/rest/v1/admin_profiles?${adminParams.toString()}`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, accept: "application/json" },
    cache: "no-store"
  });
  if (!adminResponse.ok) return null;
  const rows = (await adminResponse.json()) as Array<{ admin_id?: string; email?: string; role?: string; status?: string }>;
  const admin = rows[0];
  const role = normalizeRole(admin?.role);
  if (!admin?.admin_id || !role || admin.status !== "active") return null;
  return { actorId: admin.admin_id, authUserId, email: admin.email || email, role, authMode: "supabase" };
}

async function actorFromSupabaseSession(request: NextRequest): Promise<VerifiedActor | null> {
  const accessToken = readSupabaseAccessToken(request);
  if (!accessToken) return null;
  const user = await getSupabaseUserIdAndEmail(accessToken);
  if (!user) return null;
  return fetchProfileActor(user.id, user.email);
}

function actorFromInternalSecret(request: NextRequest): VerifiedActor | null {
  if (process.env.NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED !== "true") return null;
  const expected = process.env.NANOFIX_ADMIN_API_TOKEN;
  const provided = readBearerToken(request) || request.cookies.get("nanofix_admin_session")?.value || "";
  if (!expected || expected.length < 32 || provided !== expected) return null;
  return {
    actorId: "00000000-0000-0000-0000-000000000000",
    authUserId: "00000000-0000-0000-0000-000000000000",
    email: "server-to-server@nanofix.internal",
    role: "super_admin",
    authMode: "internal_secret"
  };
}

function actorFromLocalPreview(): VerifiedActor | null {
  if (process.env.NODE_ENV === "production" || process.env.NANOFIX_ADMIN_PUBLIC_PREVIEW !== "true") return null;
  return {
    actorId: "00000000-0000-0000-0000-000000000001",
    authUserId: "00000000-0000-0000-0000-000000000001",
    email: "preview@nanofix.local",
    role: "super_admin",
    authMode: "preview"
  };
}

function attachActor(request: NextRequest, actor: VerifiedActor) {
  const headers = new Headers(request.headers);
  cleanIncomingAuthSpoofHeaders(headers);
  headers.set("x-nanofix-auth-verified", actor.authMode);
  headers.set("x-admin-user-id", actor.actorId);
  headers.set("x-admin-role", actor.role);
  headers.set("x-admin-auth-user-id", actor.authUserId);
  if (actor.email) headers.set("x-admin-email", actor.email);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function apiUnauthorized(message: string, status = 401) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: { "X-Robots-Tag": "noindex, nofollow" } });
}

function loginRoleForPath(pathname: string): PortalContext | null {
  if (startsWithAny(pathname, [...adminRoutes, ...apiAdminRoutes])) return "admin";
  if (startsWithAny(pathname, customerRoutes)) return "customer";
  if (startsWithAny(pathname, engineerRoutes)) return "engineer";
  return null;
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const role = loginRoleForPath(request.nextUrl.pathname);
  if (role) loginUrl.searchParams.set("role", role);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  if (reason) loginUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(loginUrl);
}

function redirectPortalAlias(request: NextRequest, pathname: "/login" | "/register", role: PortalContext) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  url.searchParams.set("role", role);
  return NextResponse.redirect(url);
}

function redirectByRole(request: NextRequest, role: NanofixRole) {
  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = role === "customer" ? "/customer-portal" : role === "engineer" ? "/engineer-portal" : "/dashboard";
  return NextResponse.redirect(url);
}

function refreshSupabaseCookies(request: NextRequest) {
  return NextResponse.next({ request });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.nextUrl.hostname;
  const productionHost = isNanofixProductionHost(host);

  if (productionHost && isNanofixAdminAppHost(host) && pathname === "/") {
    return redirectToAdminApp(request, "/login", "?role=admin");
  }
  if (productionHost && !isNanofixAdminAppHost(host) && shouldForceAdminAppHost(pathname, request.nextUrl.searchParams)) {
    return redirectToAdminApp(request, pathname, request.nextUrl.search);
  }

  const loginAliasRole = loginAliases[pathname];
  if (loginAliasRole) return redirectPortalAlias(request, "/login", loginAliasRole);
  const registerAliasRole = registerAliases[pathname];
  if (registerAliasRole) return redirectPortalAlias(request, "/register", registerAliasRole);

  const loginPath = isLoginPath(pathname);
  const protectedPath = isProtectedPath(pathname);
  const isProtectedApi = startsWithAny(pathname, [...apiAdminRoutes, ...customerRoutes.filter((r) => r.startsWith("/api")), ...engineerRoutes.filter((r) => r.startsWith("/api"))]);

  if (!protectedPath && !loginPath) return NextResponse.next();

  const actor = (await actorFromSupabaseSession(request)) ?? actorFromInternalSecret(request) ?? actorFromLocalPreview();

  if (loginPath) {
    if (!actor) return refreshSupabaseCookies(request);
    return redirectByRole(request, actor.role);
  }

  if (!actor) {
    if (isProtectedApi) return apiUnauthorized("Authenticated Supabase session required.");
    return redirectToLogin(request, "auth_required");
  }

  if (!allowedRolesFor(pathname).includes(actor.role)) {
    if (isProtectedApi) return apiUnauthorized("Insufficient role permission.", 403);
    return redirectByRole(request, actor.role);
  }

  return attachActor(request, actor);
}

export const config = {
  matcher: [
    "/",
    "/login/:path*",
    "/admin-login/:path*",
    "/adminb/:path*",
    "/customer/:path*",
    "/customerlb/:path*",
    "/customer-login/:path*",
    "/engineer-login/:path*",
    "/member-sign-up-login/:path*",
    "/admin-register/:path*",
    "/customer-register/:path*",
    "/member-register/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/service-operations/:path*",
    "/website-management/:path*",
    "/social-media/:path*",
    "/advertising-center/:path*",
    "/ai-intelligence/:path*",
    "/customer-center/:path*",
    "/system-settings/:path*",
    "/customer-portal/:path*",
    "/engineer-portal/:path*",
    "/api/admin/:path*",
    "/api/global-search/:path*",
    "/api/service-requests/:path*",
    "/api/portal/customer/:path*",
    "/api/portal/engineer/:path*"
  ]
};
