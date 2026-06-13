import LecturerSessionDetailPage from "@/app/lecturer/sessions/[sessionId]/page";

export default function NestedLecturerSessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
  searchParams: Promise<{ passkeys?: string }>;
}) {
  const sessionParams = params.then(({ sessionId }) => ({ sessionId }));

  return (
    <LecturerSessionDetailPage
      params={sessionParams}
      searchParams={searchParams}
    />
  );
}
