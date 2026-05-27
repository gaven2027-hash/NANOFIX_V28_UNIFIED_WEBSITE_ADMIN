import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function Page() {
  redirect('/login?role=admin&reason=engineer_uses_internal_admin_app');
}
