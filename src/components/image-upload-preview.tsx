"use client";

import { useState } from "react";
import { UserRound, Upload } from "lucide-react";

interface ImageUploadPreviewProps {
  id?: string;
  name?: string;
  defaultImage?: string | null;
  placeholderIcon?: React.ReactNode;
}

export function ImageUploadPreview({
  id = "avatar",
  name = "avatar",
  defaultImage = null,
  placeholderIcon,
}: ImageUploadPreviewProps) {
  const [preview, setPreview] = useState<string | null>(defaultImage);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted border border-border/40 overflow-hidden shadow-inner">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="size-full object-cover"
          />
        ) : placeholderIcon ? (
          placeholderIcon
        ) : (
          <UserRound className="size-6 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground cursor-pointer hover:bg-muted/40 transition-colors shadow-sm"
        >
          <Upload className="size-3.5" />
          <span>Choose Image</span>
        </label>
        <input
          accept="image/*"
          id={id}
          name={name}
          type="file"
          className="sr-only"
          onChange={handleChange}
        />
        <p className="text-[10px] text-muted-foreground/60 font-semibold mt-1.5 truncate">
          Select JPG, PNG, or GIF up to 750KB.
        </p>
      </div>
    </div>
  );
}
