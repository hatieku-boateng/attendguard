"use client";

import { useFormStatus } from "react-dom";

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
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      className={cn("w-full", className)}
      disabled={pending || props.disabled}
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
      {pending ? "Working..." : children}
    </Button>
  );
}
