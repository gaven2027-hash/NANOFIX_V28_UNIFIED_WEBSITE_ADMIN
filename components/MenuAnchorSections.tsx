import { AdminSubmoduleWorkspace } from './AdminSubmoduleWorkspace';

const DIAGNOSTIC_ROUTES = new Set(['/system-settings']);

export function MenuAnchorSections({ route }: { route: string }) {
  if (!DIAGNOSTIC_ROUTES.has(route)) {
    return null;
  }

  return <AdminSubmoduleWorkspace route={route} />;
}
