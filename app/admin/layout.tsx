import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "NANOFIX Central Admin Backend | NANOFIX 总管理后台",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
