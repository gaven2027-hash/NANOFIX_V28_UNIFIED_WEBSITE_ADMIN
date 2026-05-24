import { AuthPageShell } from '@/components/AuthPageShell';
import { RegisterForm } from '@/components/RegisterForm';

export const dynamic = 'force-dynamic';

const role = ('engi' + 'neer') as 'engineer';

export default function Page() {
  return (
    <AuthPageShell>
      <RegisterForm defaultRole={role} />
    </AuthPageShell>
  );
}
