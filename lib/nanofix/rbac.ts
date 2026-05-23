import { fail } from "./api";
import { getAdminContext, permissionAllowed, rolePermissions, type AdminRole } from "./auth";

export type { AdminRole };

export function hasPermission(role: AdminRole, permission: string) {
  return permissionAllowed({ actorId: "static-check", role, permissions: rolePermissions[role] || [], authMode: "supabase" }, permission);
}

export function requirePermission(request: Request, permission: string) {
  const context = getAdminContext(request);
  if (!context) {
    return {
      role: null,
      actor: null,
      denied: fail("Authenticated Supabase session required.", 401, { required_permission: permission })
    };
  }
  if (!permissionAllowed(context, permission)) {
    return {
      role: context.role,
      actor: context,
      denied: fail("Permission denied", 403, { required_permission: permission, role: context.role })
    };
  }
  return { role: context.role, actor: context, denied: null };
}
