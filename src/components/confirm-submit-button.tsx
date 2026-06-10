"use client";

import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  message,
  variant = "destructive",
}: {
  children: React.ReactNode;
  message: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Button
      className="w-full"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      type="submit"
      variant={variant}
    >
      {children}
    </Button>
  );
}
