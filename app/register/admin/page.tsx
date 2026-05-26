import { RegisterShell } from '../RegisterShell';

export const metadata = {
  title: 'Admin Register / 管理员注册 | NANOFIX',
  robots: { index: false, follow: false }
};

export default function Page() {
  return <RegisterShell forcedContext="admin" />;
}
