import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/lecturers", label: "Lecturers" },
  { href: "/admin/courses", label: "Courses" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("administrator");

  return (
    <AppShell navItems={navItems} user={user}>
      {children}
    </AppShell>
  );
}
