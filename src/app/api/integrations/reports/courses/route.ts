import { NextResponse, type NextRequest } from "next/server";

import { requireIntegrationRequest } from "@/lib/integration-auth";
import { getAttendanceReport, summarizeByCourse } from "@/lib/integration-reports";

export async function GET(request: NextRequest) {
  const auth = requireIntegrationRequest(request);
  if (!auth.ok) return auth.response;

  const report = await getAttendanceReport(request.nextUrl.searchParams);

  return NextResponse.json({
    sourceSystem: auth.context.sourceSystem,
    reportType: "course-attendance-summary",
    filters: report.filters,
    generatedAt: report.generatedAt,
    totals: report.totals,
    courses: summarizeByCourse(report.records),
  });
}
