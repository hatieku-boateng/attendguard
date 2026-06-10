import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getWorkspaceNavItems } from "@/lib/navigation";

export default async function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("lecturer");

  return (
    <AppShell navItems={getWorkspaceNavItems(user.role)} user={user}>
      {children}
    </AppShell>
  );
}
