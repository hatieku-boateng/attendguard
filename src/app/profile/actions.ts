"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { lecturerProfiles, studentProfiles, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { cleanString, fileToDataUrl } from "@/lib/form-utils";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const name = cleanString(formData.get("name"));

  if (!name) {
    redirect("/profile?error=invalid");
  }

  const avatarUrl = await fileToDataUrl(formData.get("avatar"));

  if (avatarUrl === "invalid") {
    redirect("/profile?error=image");
  }

  const db = getDb();
  await db
    .update(users)
    .set({
      name,
      ...(avatarUrl ? { avatarUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  if (user.role === "lecturer" && user.lecturerProfileId) {
    await db
      .update(lecturerProfiles)
      .set({
        staffId: cleanString(formData.get("staffId")) || null,
        department: cleanString(formData.get("department")) || null,
        updatedAt: new Date(),
      })
      .where(eq(lecturerProfiles.id, user.lecturerProfileId));
  }

  if (user.role === "student" && user.studentProfileId) {
    await db
      .update(studentProfiles)
      .set({
        programme: cleanString(formData.get("programme")) || null,
        level: cleanString(formData.get("level")) || null,
        classGroup: cleanString(formData.get("classGroup")) || null,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, user.studentProfileId));
  }

  revalidatePath("/profile");
  redirect("/profile?updated=1");
}
