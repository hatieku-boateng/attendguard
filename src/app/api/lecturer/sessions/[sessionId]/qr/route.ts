import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { attendanceSessions } from "@/db/schema";
import { createAttendanceQrToken, QR_ROTATION_SECONDS } from "@/lib/attendance-qr";
import { getCurrentUser } from "@/lib/auth";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await getCurrentUser();

  if (
    !user ||
    user.status !== "active" ||
    user.role !== "lecturer" ||
    !user.lecturerProfileId
  ) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const { sessionId } = await params;
  const [session] = await getDb()
    .select({
      id: attendanceSessions.id,
      status: attendanceSessions.status,
      opensAt: attendanceSessions.opensAt,
      finalClosesAt: attendanceSessions.finalClosesAt,
    })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId),
      ),
    )
    .limit(1);

  if (!session) {
    return Response.json(
      { error: "Session not found" },
      { status: 404, headers: noStoreHeaders },
    );
  }

  const now = Date.now();
  if (
    session.status !== "open" ||
    now < session.opensAt.getTime() ||
    now > session.finalClosesAt.getTime()
  ) {
    return Response.json(
      { error: "Session is not open" },
      { status: 409, headers: noStoreHeaders },
    );
  }

  return Response.json(
    {
      ...createAttendanceQrToken(session.id, now),
      rotationSeconds: QR_ROTATION_SECONDS,
      serverTime: now,
    },
    { headers: noStoreHeaders },
  );
}
