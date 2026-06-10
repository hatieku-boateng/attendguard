import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getWorkspaceNavItems } from "@/lib/navigation";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("student");

  return (
    <AppShell navItems={getWorkspaceNavItems(user.role)} user={user}>
      {children}
    </AppShell>
  );
}
