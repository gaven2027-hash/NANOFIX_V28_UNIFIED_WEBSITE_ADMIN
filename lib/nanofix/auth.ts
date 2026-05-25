import { NextResponse } from "next/server";

export type AdminRole =
  | "super_admin"
  | "operations_admin"
  | "finance"
  | "content_admin"
  | "support"
  | "engineer"
  | "customer";

export type AdminContext = {
  actorId: string;
  authUserId?: string;
  role: AdminRole;
  permissions: string[];
  authMode: "supabase" | "internal_secret" | "preview";
  email?: string;
};

export const rolePermissions: Record<AdminRole, string[]> = {
  super_admin: ["*"],
  operations_admin: [
    "read:*",
    "write:operations",
    "write:customers",
    "service_request.read",
    "service_request.update",
    "customer.read",
    "customer.bind",
    "module_health.read",
    "entity_event.write"
  ],
  finance: ["read:*", "read:finance", "write:finance", "invoice.update", "payment.update", "audit.read"],
  content_admin: ["read:*", "read:content", "write:content", "read:ai", "write:ai", "website.update", "social.update", "ai_draft.review"],
  support: ["read:*", "read:customers", "write:customers", "read:operations", "lead.read", "lead.update", "entity_event.write"],
  engineer: ["read:operations", "write:operations", "job.assigned.read", "job.assigned.update", "entity_event.write"],
  customer: ["customer.portal.read", "customer.portal.write"]
};

function normalizeRole(role: string | null): AdminRole | null {
  const normalized = (role || "").toLowerCase();
  if (normalized === "admin" || normalized === "ai_admin") return "content_admin";
  if (normalized === "finance_admin") return "finance";
  if (normalized === "support_admin") return "support";
  if (normalized in rolePermissions) return normalized as AdminRole;
  return null;
}

function contextFromVerifiedMiddleware(request: Request): AdminContext | null {
  const verified = request.headers.get("x-nanofix-auth-verified");
  if (!verified || !["supabase", "internal_secret", "preview"].includes(verified)) return null;

  const role = normalizeRole(request.headers.get("x-admin-role"));
  const actorId = request.headers.get("x-admin-user-id");
  if (!role || !actorId) return null;

  return {
    actorId,
    authUserId: request.headers.get("x-admin-auth-user-id") || undefined,
    role,
    permissions: rolePermissions[role],
    authMode: verified as AdminContext["authMode"],
    email: request.headers.get("x-admin-email") || undefined
  };
}

export function getAdminContext(request: Request): AdminContext | null {
  // Only middleware-verified server headers are accepted. Frontend-provided x-admin-role / x-nanofix-role
  // are intentionally ignored to remove header spoofing risk.
  return contextFromVerifiedMiddleware(request);
}

function colonPermissionAllowed(permissions: string[], permission: string) {
  const [action, scope] = permission.split(":");
  if (!action || !scope) return false;
  if (permissions.includes(permission)) return true;
  if (permissions.includes(`${action}:*`)) return true;

  // read:* is intentionally read-only. It must never satisfy write/delete/admin permissions.
  if (action === "read") {
    return permissions.includes("read:*");
  }

  return false;
}

function dottedPermissionAllowed(permissions: string[], permission: string) {
  const [object, action] = permission.split(".");
  if (!object || !action) return false;
  return permissions.includes(permission) || permissions.includes(`${object}.*`);
}

export function permissionAllowed(context: AdminContext, permission: string) {
  const permissions = context.permissions;
  if (permissions.includes("*")) return true;
  if (permissions.includes(permission)) return true;
  if (permission.includes(":")) return colonPermissionAllowed(permissions, permission);
  if (permission.includes(".")) return dottedPermissionAllowed(permissions, permission);
  return false;
}

export function requireAdmin(request: Request, permission = "read:*") {
  const context = getAdminContext(request);
  if (!context) {
    return {
      context: null,
      response: NextResponse.json(
        { ok: false, error: "Admin authentication required. Use Supabase Auth with an active NANOFIX profile." },
        { status: 401 }
      )
    };
  }

  if (!permissionAllowed(context, permission)) {
    return {
      context,
      response: NextResponse.json({ ok: false, error: "Permission denied" }, { status: 403 })
    };
  }

  return { context, response: null };
}

export function auditActor(context: AdminContext | null) {
  return context
    ? { actor_id: context.actorId, actor_role: context.role, auth_mode: context.authMode, actor_email: context.email }
    : { actor_id: null, actor_role: "public" };
}
