import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getWorkspaceNavItems } from "@/lib/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("administrator");

  return (
    <AppShell navItems={getWorkspaceNavItems(user.role)} user={user}>
      {children}
    </AppShell>
  );
}
