import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AdminRole =
  | 'super_admin'
  | 'operations_admin'
  | 'finance'
  | 'content_admin'
  | 'support'
  | 'engineer'
  | 'customer';

export type ApiActor = {
  profileId: string;
  authUserId: string;
  email: string | null;
  role: AdminRole;
};

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function isRole(value: string | null): value is AdminRole {
  return Boolean(value && ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer', 'customer'].includes(value));
}

function normalizeLegacyAdminRole(value: string | null): AdminRole | null {
  const role = (value ?? '').toLowerCase();
  if (role === 'admin' || role === 'ai_admin') return 'content_admin';
  if (role === 'finance_admin') return 'finance';
  if (role === 'support_admin') return 'support';
  return isRole(role) ? role : null;
}

async function profileFromAuthUser(authUserId: string, email: string | null | undefined): Promise<ApiActor | null> {
  const supabase = createAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('profile_id, auth_user_id, email, role, is_active')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!profileError && profile && profile.is_active !== false && isRole(profile.role)) {
    return {
      profileId: profile.profile_id,
      authUserId,
      email: profile.email ?? email ?? null,
      role: profile.role
    };
  }

  // Compatibility bridge for older website migrations that used admin_profiles.
  const { data: adminProfile, error: adminError } = await supabase
    .from('admin_profiles')
    .select('admin_id, auth_user_id, email, role, status')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  const bridgedRole = normalizeLegacyAdminRole(adminProfile?.role ?? null);
  if (!adminError && adminProfile && adminProfile.status === 'active' && bridgedRole) {
    return {
      profileId: adminProfile.admin_id,
      authUserId,
      email: adminProfile.email ?? email ?? null,
      role: bridgedRole
    };
  }

  return null;
}

async function actorFromBearerToken(request: NextRequest): Promise<ApiActor | null> {
  const accessToken = getBearerToken(request);
  if (!accessToken) return null;

  const supabase = createAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return null;
  return profileFromAuthUser(userData.user.id, userData.user.email);
}

function readSupabaseCookieToken(request: NextRequest) {
  const direct = request.cookies.get('sb-access-token')?.value || request.cookies.get('nanofix_admin_access_token')?.value;
  if (direct) return direct;
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith('sb-') || !cookie.name.endsWith('-auth-token')) continue;
    try {
      const decoded = decodeURIComponent(cookie.value);
      const parsed = JSON.parse(decoded) as unknown;
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0];
      if (parsed && typeof parsed === 'object') {
        const object = parsed as Record<string, unknown>;
        if (typeof object.access_token === 'string') return object.access_token;
        const currentSession = object.currentSession as Record<string, unknown> | undefined;
        if (currentSession && typeof currentSession.access_token === 'string') return currentSession.access_token;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function actorFromSessionCookies(request: NextRequest): Promise<ApiActor | null> {
  const accessToken = readSupabaseCookieToken(request);
  if (!accessToken) return null;
  const supabase = createAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return null;
  return profileFromAuthUser(userData.user.id, userData.user.email);
}

function actorFromExplicitInternalSecret(request: NextRequest): ApiActor | null {
  // Disabled by default. This is only for controlled server-to-server maintenance jobs.
  // Production UI and browser API calls must use Supabase JWT + profiles.role.
  if (process.env.ALLOW_ADMIN_API_SECRET_FALLBACK !== 'true' && process.env.NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED !== 'true') return null;

  const expected = process.env.ADMIN_API_SECRET || process.env.NANOFIX_ADMIN_API_TOKEN;
  const provided = request.headers.get('x-nanofix-admin-api-key') ?? getBearerToken(request) ?? '';
  if (!expected || expected.length < 32 || provided !== expected) return null;

  return {
    profileId: '00000000-0000-0000-0000-000000000000',
    authUserId: '00000000-0000-0000-0000-000000000000',
    email: 'server-to-server@nanofix.internal',
    role: 'super_admin'
  };
}

export async function requireActorApi(
  request: NextRequest,
  allowedRoles: AdminRole[] = ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer', 'customer']
) {
  const actor = (await actorFromBearerToken(request)) ?? (await actorFromSessionCookies(request)) ?? actorFromExplicitInternalSecret(request);

  if (!actor) {
    return { ok: false as const, response: jsonError('Authenticated Supabase session required.', 401) };
  }

  if (!allowedRoles.includes(actor.role)) {
    return { ok: false as const, response: jsonError('Insufficient role permission.', 403) };
  }

  return { ok: true as const, role: actor.role, actor };
}

export async function requireAdminApi(
  request: NextRequest,
  allowedRoles: AdminRole[] = ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support']
) {
  return requireActorApi(request, allowedRoles);
}

export function requireWebhookSecret(request: NextRequest, envName: 'PAYMENT_WEBHOOK_SECRET' | 'SOCIAL_WEBHOOK_SECRET') {
  const expected = process.env[envName];
  if (!expected || expected.length < 24) {
    return { ok: false as const, response: jsonError(`${envName} is not configured securely.`, 500) };
  }
  const provided = request.headers.get('x-nanofix-webhook-secret') ?? '';
  if (provided !== expected) {
    return { ok: false as const, response: jsonError('Webhook authorization required.', 401) };
  }
  return { ok: true as const };
}

export function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return null;
  return value.replace(/[<>]/g, '').trim().slice(0, maxLength) || null;
}

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}
