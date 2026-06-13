import EditSessionPage from "@/app/lecturer/sessions/[sessionId]/edit/page";

export default function NestedEditSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const sessionParams = params.then(({ sessionId }) => ({ sessionId }));

  return <EditSessionPage params={sessionParams} searchParams={searchParams} />;
}
