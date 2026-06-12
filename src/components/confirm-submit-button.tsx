"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmSubmitButton({
  children,
  className,
  message,
  size,
  variant = "destructive",
}: {
  children: React.ReactNode;
  className?: string;
  message: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Button
      className={cn("w-full", className)}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      size={size}
      type="submit"
      variant={variant}
    >
      {children}
    </Button>
  );
}
