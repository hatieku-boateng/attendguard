import { NextResponse, type NextRequest } from "next/server";

import { requireIntegrationRequest } from "@/lib/integration-auth";
import { getAttendanceReport, summarizeBySession } from "@/lib/integration-reports";

export async function GET(request: NextRequest) {
  const auth = requireIntegrationRequest(request);
  if (!auth.ok) return auth.response;

  const report = await getAttendanceReport(request.nextUrl.searchParams);

  return NextResponse.json({
    sourceSystem: auth.context.sourceSystem,
    reportType: "session-attendance-summary",
    filters: report.filters,
    generatedAt: report.generatedAt,
    totals: report.totals,
    sessions: summarizeBySession(report.records),
  });
}
