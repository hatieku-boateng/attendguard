import { NextResponse, type NextRequest } from "next/server";

import { requireIntegrationRequest } from "@/lib/integration-auth";
import {
  getAttendanceReport,
  summarizeByCourse,
  summarizeBySession,
  summarizeByStudent,
} from "@/lib/integration-reports";

export async function GET(request: NextRequest) {
  const auth = requireIntegrationRequest(request);
  if (!auth.ok) return auth.response;

  const report = await getAttendanceReport(request.nextUrl.searchParams);

  return NextResponse.json({
    sourceSystem: auth.context.sourceSystem,
    reportType: "attendance",
    ...report,
    summaries: {
      byCourse: summarizeByCourse(report.records),
      byStudent: summarizeByStudent(report.records),
      bySession: summarizeBySession(report.records),
    },
  });
}
