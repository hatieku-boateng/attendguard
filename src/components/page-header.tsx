export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-white/80 bg-card/92 shadow-lg shadow-slate-950/[0.045] ring-1 ring-white/70 sm:mb-8">
      <div className="h-1 bg-[linear-gradient(90deg,var(--primary),var(--chart-3),var(--chart-4))]" />
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div className="space-y-2.5">
        <p className="inline-flex w-fit items-center rounded-lg border border-primary/15 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary shadow-sm shadow-primary/10">
          AttendGuard
        </p>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl lg:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {actions}
        </div>
      ) : null}
      </div>
    </div>
  );
}
