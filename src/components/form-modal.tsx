"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function FormModal({
  isOpen,
  title,
  description,
  children,
  className = "sm:max-w-md",
}: {
  isOpen: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Clear modal params but preserve other query parameters
      const params = new URLSearchParams(window.location.search);
      params.delete("modal");
      params.delete("id");
      params.delete("error");
      params.delete("courseId");
      params.delete("academicYearId");
      params.delete("catalogCourseId");
      params.delete("departmentId");
      params.delete("facultyId");
      params.delete("lecturerId");
      params.delete("studentId");
      params.delete("sessionId");
      
      const newQuery = params.toString();
      router.push(newQuery ? `${pathname}?${newQuery}` : pathname);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
