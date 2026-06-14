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
    <div className="mb-6 overflow-hidden rounded-2xl glass-panel relative p-px sm:mb-8">
      {/* Glowing top line accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200),oklch(0.64_0.16_145))]" />
      
      {/* Light glow bubble */}
      <div className="absolute top-0 right-0 size-48 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6.5 relative z-10">
        <div className="space-y-2">
          <p className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary shadow-sm shadow-primary/5">
            AttendGuard
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-[2rem] leading-none">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground font-medium pt-0.5">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
