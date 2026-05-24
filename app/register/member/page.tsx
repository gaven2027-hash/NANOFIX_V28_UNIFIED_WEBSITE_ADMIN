import { AuthPageShell } from '@/components/AuthPageShell';
import { RegisterForm } from '@/components/RegisterForm';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <AuthPageShell>
      <RegisterForm defaultRole="customer" />
    </AuthPageShell>
  );
}
