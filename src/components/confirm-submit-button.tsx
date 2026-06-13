"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmSubmitButton({
  children,
  className,
  message,
  onClick,
  size,
  type = "submit",
  variant = "destructive",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  message: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <Button
      {...props}
      className={cn("w-full", className)}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      size={size}
      type={type}
      variant={variant}
    >
      {children}
    </Button>
  );
}
