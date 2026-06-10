import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/classes", label: "Classes" },
  { href: "/student/sessions", label: "Sessions" },
  { href: "/student/attendance-history", label: "History" },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("student");

  return (
    <AppShell navItems={navItems} user={user}>
      {children}
    </AppShell>
  );
}
