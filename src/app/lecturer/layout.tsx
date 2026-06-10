import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

const navItems = [
  { href: "/lecturer/dashboard", label: "Dashboard" },
  { href: "/lecturer/courses", label: "Courses" },
  { href: "/lecturer/sessions", label: "Sessions" },
  { href: "/lecturer/reports", label: "Reports" },
];

export default async function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["lecturer", "administrator"]);

  return (
    <AppShell navItems={navItems} user={user}>
      {children}
    </AppShell>
  );
}
