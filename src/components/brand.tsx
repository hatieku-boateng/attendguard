import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link className={cn("inline-flex items-center gap-3", className)} href={href}>
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <ShieldCheck className="size-5" />
      </span>
      <span className="grid">
        <span className="text-base font-semibold leading-5 tracking-normal">
          AttendGuard
        </span>
        <span className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
          Secure attendance
        </span>
      </span>
    </Link>
  );
}
