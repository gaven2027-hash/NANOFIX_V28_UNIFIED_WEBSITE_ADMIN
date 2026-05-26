import { RegisterShell } from '../RegisterShell';

export const metadata = {
  title: 'Customer Register / 客户注册 | NANOFIX',
  robots: { index: false, follow: false }
};

export default function Page() {
  return <RegisterShell forcedContext="customer" />;
}
