"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function PendingSubmitButton({
  children,
  pendingLabel = "Working...",
  ...props
}: React.ComponentProps<typeof Button> & {
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={pending || props.disabled} type="submit">
      {pending ? pendingLabel : children}
    </Button>
  );
}
