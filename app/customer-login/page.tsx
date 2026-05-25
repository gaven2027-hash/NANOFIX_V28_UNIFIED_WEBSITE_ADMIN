import { LoginShell } from '../login/LoginShell';

export const dynamic = 'force-dynamic';

export default function CustomerLoginPage() {
  return <LoginShell forcedContext="customer" />;
}
