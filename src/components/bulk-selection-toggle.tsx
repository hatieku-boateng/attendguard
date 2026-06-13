"use client";

export function BulkSelectionToggle({
  label = "Select all visible rows",
  selector = "[data-bulk-row]",
}: {
  label?: string;
  selector?: string;
}) {
  return (
    <input
      aria-label={label}
      className="size-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onChange={(event) => {
        document
          .querySelectorAll<HTMLInputElement>(selector)
          .forEach((checkbox) => {
            checkbox.checked = event.currentTarget.checked;
          });
      }}
      type="checkbox"
    />
  );
}
