import { eq } from "drizzle-orm";
import { 
  UserRound, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Calendar,
  Lock,
  Clock
} from "lucide-react";

import { updateProfileAction } from "@/app/profile/actions";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { lecturerProfiles, studentProfiles, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getWorkspaceNavItems } from "@/lib/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ImageUploadPreview } from "@/components/image-upload-preview";

const errorMessages: Record<string, string> = {
  invalid: "Enter a valid name.",
  image: "Upload a valid image under 750 KB.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const db = getDb();
  const [account] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  
  const [lecturerProfile] = user.lecturerProfileId
    ? await db
        .select()
        .from(lecturerProfiles)
        .where(eq(lecturerProfiles.id, user.lecturerProfileId))
        .limit(1)
    : [];
    
  const [studentProfile] = user.studentProfileId
    ? await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, user.studentProfileId))
        .limit(1)
    : [];

  // Determine role-specific details and gradient theme
  let roleTitle = "System Administrator";
  let themeGradient = "from-indigo-500 via-purple-500 to-pink-500";
  let badgeColor = "border-purple-500/20 bg-purple-500/5 text-purple-600 dark:text-purple-400";
  
  if (user.role === "lecturer") {
    roleTitle = "Lecturer";
    themeGradient = "from-emerald-500 via-teal-500 to-cyan-500";
    badgeColor = "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400";
  } else if (user.role === "student") {
    roleTitle = "Registered Student";
    themeGradient = "from-cyan-500 via-blue-500 to-indigo-500";
    badgeColor = "border-cyan-500/20 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400";
  }

  return (
    <AppShell navItems={getWorkspaceNavItems(user.role)} user={user}>
      <PageHeader
        title="Profile"
        description="Update your account information and workspace picture."
      />

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Profile Card Summary */}
        <div className="lg:col-span-4">
          <Card className="overflow-hidden relative glass-panel border-border/40">
            <div className={`h-28 bg-gradient-to-r ${themeGradient} relative opacity-85 dark:opacity-75`} />
            
            <CardContent className="pt-0 relative flex flex-col items-center px-6 pb-6">
              {/* Avatar circle */}
              <div className="-mt-14 size-24 rounded-2xl border-4 border-background bg-card overflow-hidden flex items-center justify-center shadow-lg relative group/avatar">
                {account?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={account.name}
                    className="size-full object-cover transition-transform duration-500 group-hover/avatar:scale-105"
                    src={account.avatarUrl}
                  />
                ) : (
                  <UserRound className="size-10 text-muted-foreground/60" />
                )}
                <span className="absolute bottom-1 right-1 size-3.5 rounded-full border-2 border-background bg-emerald-500 animate-pulse" />
              </div>

              {/* User Identity */}
              <h2 className="mt-4 text-lg font-bold text-foreground truncate max-w-full">{account?.name}</h2>
              <p className="text-xs text-muted-foreground/85 font-medium truncate max-w-full">{account?.email}</p>
              
              <span className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.68rem] font-bold uppercase tracking-wider ${badgeColor}`}>
                <span className="size-1.5 rounded-full bg-current animate-pulse" />
                {roleTitle}
              </span>

              {/* Attribute Details List */}
              <div className="w-full mt-6 border-t border-border/40 pt-5 space-y-3.5 text-xs text-muted-foreground font-semibold">
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground/50 shrink-0" />
                  <span className="truncate leading-relaxed">{account?.email}</span>
                </div>
                
                {user.role === "lecturer" && (
                  <>
                    <div className="flex items-center gap-3">
                      <Lock className="size-4 text-muted-foreground/50 shrink-0" />
                      <span className="truncate leading-relaxed">Staff ID: {lecturerProfile?.staffId || "Not assigned"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Briefcase className="size-4 text-muted-foreground/50 shrink-0" />
                      <span className="truncate leading-relaxed">Dept: {lecturerProfile?.department || "Not assigned"}</span>
                    </div>
                  </>
                )}

                {user.role === "student" && (
                  <>
                    <div className="flex items-center gap-3">
                      <GraduationCap className="size-4 text-muted-foreground/50 shrink-0" />
                      <span className="truncate leading-relaxed">Prog: {studentProfile?.programme || "Not assigned"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="size-4 text-muted-foreground/50 shrink-0" />
                      <span className="truncate leading-relaxed">Level: {studentProfile?.level || "Not assigned"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="size-4 text-muted-foreground/50 shrink-0" />
                      <span className="truncate leading-relaxed">Group: {studentProfile?.classGroup || "Not assigned"}</span>
                    </div>
                  </>
                )}
                
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 text-muted-foreground/50 shrink-0" />
                  <span className="truncate leading-relaxed">
                    Joined: {account?.createdAt ? new Date(account.createdAt).toLocaleDateString() : "Active"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Edit Form Card */}
        <div className="lg:col-span-8">
          <Card className="overflow-hidden relative glass-panel border-border/40">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${themeGradient}`} />
            
            <CardContent className="pt-8 px-6 sm:px-8 pb-8">
              <form
                action={updateProfileAction}
                className="space-y-6"
                encType="multipart/form-data"
              >
                {/* Alerts */}
                {params.error ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-3 backdrop-blur-md">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Error Updating Profile</p>
                      <p className="text-xs text-destructive/80 leading-relaxed">
                        {errorMessages[params.error]}
                      </p>
                    </div>
                  </div>
                ) : null}

                {params.updated ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-600 dark:text-emerald-400 flex items-start gap-3 backdrop-blur-md">
                    <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Profile Synchronized</p>
                      <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed">
                        Your workspace details and preferences have been successfully updated.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Section: Personal Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Personal Settings
                  </h3>
                  
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-bold tracking-tight">Full name</Label>
                      <Input defaultValue={account?.name} id="name" name="name" required className="rounded-xl h-11" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-bold tracking-tight">Profile picture</Label>
                      <ImageUploadPreview id="avatar" name="avatar" defaultImage={account?.avatarUrl} />
                    </div>
                  </div>
                </div>

                {/* Section: Role Specific Details */}
                {(user.role === "lecturer" || user.role === "student") && (
                  <div className="space-y-4 pt-4 border-t border-border/30">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Workspace Credentials
                    </h3>
                    
                    {user.role === "lecturer" && (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="staffId" className="text-sm font-bold tracking-tight">Staff ID</Label>
                          <Input
                            defaultValue={lecturerProfile?.staffId ?? ""}
                            id="staffId"
                            name="staffId"
                            placeholder="Enter Staff ID"
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="department" className="text-sm font-bold tracking-tight">Department</Label>
                          <Input
                            defaultValue={lecturerProfile?.department ?? ""}
                            id="department"
                            name="department"
                            placeholder="Enter Department"
                            className="rounded-xl h-11"
                          />
                        </div>
                      </div>
                    )}

                    {user.role === "student" && (
                      <div className="grid gap-5 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="programme" className="text-sm font-bold tracking-tight">Programme</Label>
                          <Input
                            defaultValue={studentProfile?.programme ?? ""}
                            id="programme"
                            name="programme"
                            placeholder="e.g. BSc Computer Science"
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="level" className="text-sm font-bold tracking-tight">Level</Label>
                          <Input 
                            defaultValue={studentProfile?.level ?? ""} 
                            id="level" 
                            name="level" 
                            placeholder="e.g. 300"
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="classGroup" className="text-sm font-bold tracking-tight">Class group</Label>
                          <Input
                            defaultValue={studentProfile?.classGroup ?? ""}
                            id="classGroup"
                            name="classGroup"
                            placeholder="e.g. Group A"
                            className="rounded-xl h-11"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Container */}
                <div className="pt-4 flex justify-end">
                  <PendingSubmitButton 
                    className="w-full sm:w-auto px-8 h-11.5 rounded-xl font-bold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all text-sm cursor-pointer"
                    pendingLabel="Saving details..."
                  >
                    Save settings
                  </PendingSubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
