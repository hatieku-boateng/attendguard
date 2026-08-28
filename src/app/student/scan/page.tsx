import { PageHeader } from "@/components/page-header";
import { StudentQrScanner } from "@/components/student-qr-scanner";
import { requireRole } from "@/lib/auth";

export default async function StudentScanPage() {
  await requireRole("student");

  return (
    <>
      <PageHeader
        description="Scan the live code displayed by your lecturer to record attendance."
        title="Scan attendance QR"
      />
      <StudentQrScanner />
    </>
  );
}
