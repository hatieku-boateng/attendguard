import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, BookOpen, GraduationCap, ArrowLeft, Key, UserCheck } from "lucide-react";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { users, lecturerProfiles, studentProfiles } from "@/db/schema";
import { setSessionCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DevBypassPage() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    return (
      <main className="relative min-h-screen bg-background text-foreground overflow-x-hidden pb-16 flex items-center justify-center text-center p-6 transition-colors duration-500">
        {/* Subtle background ambient lights */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60rem] h-[60rem] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/3" />
          <div className="absolute bottom-[10%] right-[-15%] w-[50rem] h-[50rem] rounded-full bg-cyan-500/5 blur-[130px] dark:bg-cyan-500/3 animate-pulse" />
        </div>

        <Card className="w-full max-w-md glass-panel rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden border-none text-left space-y-6 z-10">
          <div className="size-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shadow-inner">
            <Key className="size-6 text-rose-500 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-foreground leading-none">DATABASE_URL Missing</h2>
            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
              Your local <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-2xs">.env.local</code> file does not contain database credentials.
            </p>
          </div>
          
          <div className="p-5 rounded-2xl bg-zinc-950/45 border border-white/5 space-y-4 shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">How to configure:</p>
            <ol className="list-decimal list-inside text-xs font-semibold text-muted-foreground space-y-3 leading-relaxed">
              <li>
                Open <code className="px-1 py-0.5 rounded bg-black/45 font-mono text-2xs">.env.local</code> in the root directory.
              </li>
              <li>
                Paste your Neon PostgreSQL connection string:
                <pre className="p-3 rounded-xl bg-black/85 font-mono text-[10px] text-emerald-400 overflow-x-auto mt-2 border border-white/5 select-all">
                  DATABASE_URL="postgresql://..."
                </pre>
              </li>
              <li>
                Save the file. Next.js will reload and compile the database connection automatically!
              </li>
            </ol>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button asChild variant="outline" className="flex-1 h-11 rounded-2xl font-bold border-border hover:bg-muted dark:hover:bg-white/[0.06] transition-all">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const db = getDb();
  
  // Fetch active users
  const allUsers = await db.select().from(users).where(eq(users.status, "active"));
  
  // Filter by role
  let admins = allUsers.filter(u => u.role === "administrator");
  let lecturers = allUsers.filter(u => u.role === "lecturer");
  let students = allUsers.filter(u => u.role === "student");

  // Pre-hashed "Password123" for safety fallback
  const fallbackPasswordHash = "$2a$12$R9h/lIPzMRWFX/4x.jZJ.OqU315C2cQ/uR2i1pT.uYy5xP.7Y5Z/2";

  // Fallback: If no Administrator exists, create one
  if (admins.length === 0) {
    try {
      const [newAdmin] = await db
        .insert(users)
        .values({
          name: "Demo Administrator",
          email: "admin@attendguard.app",
          passwordHash: fallbackPasswordHash,
          role: "administrator",
          status: "active",
          emailVerifiedAt: new Date(),
        })
        .returning();
      admins = [newAdmin];
    } catch (err) {
      console.error("Failed to auto-create admin:", err);
    }
  }

  // Fallback: If no Lecturer exists, create one
  if (lecturers.length === 0) {
    try {
      const [newLecturer] = await db
        .insert(users)
        .values({
          name: "Demo Lecturer",
          email: "lecturer@example.com",
          passwordHash: fallbackPasswordHash,
          role: "lecturer",
          status: "active",
          emailVerifiedAt: new Date(),
        })
        .returning();
        
      await db.insert(lecturerProfiles).values({
        userId: newLecturer.id,
        staffId: "STAFF-001",
        department: "Computer Science",
      });
      
      lecturers = [newLecturer];
    } catch (err) {
      console.error("Failed to auto-create lecturer:", err);
    }
  }

  // Fallback: If no Student exists, create one
  if (students.length === 0) {
    try {
      const [newStudent] = await db
        .insert(users)
        .values({
          name: "Demo Student",
          email: "student@example.com",
          passwordHash: fallbackPasswordHash,
          role: "student",
          status: "active",
          emailVerifiedAt: new Date(),
        })
        .returning();
        
      await db.insert(studentProfiles).values({
        userId: newStudent.id,
        studentIdNumber: "STU-001",
        programme: "BSc Computer Science",
        level: "200",
        classGroup: "main",
      });
      
      students = [newStudent];
    } catch (err) {
      console.error("Failed to auto-create student:", err);
    }
  }

  // Server action to log in as a specific user
  async function loginAs(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;
    const role = formData.get("role") as string;
    
    if (!userId || !role) return;
    
    await setSessionCookie(userId);
    
    // Redirect to the correct portal dashboard
    if (role === "administrator") {
      redirect("/admin/dashboard");
    } else if (role === "student") {
      redirect("/student/dashboard");
    } else {
      redirect("/lecturer/dashboard");
    }
  }

  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-x-hidden pb-16 transition-colors duration-500">
      
      {/* Subtle background ambient lights */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60rem] h-[60rem] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/3" />
        <div className="absolute bottom-[10%] right-[-15%] w-[50rem] h-[50rem] rounded-full bg-cyan-500/5 blur-[130px] dark:bg-cyan-500/3 animate-pulse" />
      </div>

      {/* Header */}
      <header className="mx-auto flex w-full max-w-[85rem] items-center justify-between px-6 py-6 sm:px-8 z-30 relative">
        <div className="flex items-center gap-2">
          <Key className="size-6 text-primary animate-pulse" />
          <span className="font-black tracking-tight text-lg uppercase bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500">
            AttendGuard DevPortal
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Button asChild variant="outline" className="rounded-full px-5 text-sm font-semibold h-8.5 border-border hover:bg-muted dark:hover:bg-white/[0.06]">
            <Link href="/" className="inline-flex items-center gap-1.5">
              <ArrowLeft className="size-3.5" />
              Return Home
            </Link>
          </Button>
        </nav>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-[85rem] px-6 pt-8 pb-12 sm:px-8 z-10 relative text-center">
        <div className="max-w-3xl mx-auto space-y-4 mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-2xs font-extrabold uppercase tracking-widest border border-primary/25">
            Internal Portal Inspector
          </span>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            Check the Inside of the System.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground font-semibold max-w-xl mx-auto">
            Review and test the screens for all three roles. Once you have finished verifying the internal dashboards, we can delete this path.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto pt-4">
          
          {/* Admin Column */}
          <Card className="glass-panel rounded-3xl shadow-xl flex flex-col justify-between text-left relative overflow-hidden border-none">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,oklch(0.78_0.14_85),oklch(0.62_0.12_65))]" />
            <CardHeader className="pt-8 pb-4">
              <span className="inline-flex w-fit items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400">
                <ShieldCheck className="size-3.5" />
                Administrator
              </span>
              <CardTitle className="text-xl font-black tracking-tight mt-3">Admin Portal</CardTitle>
              <CardDescription className="text-xs font-semibold text-muted-foreground mt-1">
                Manage lecturers, catalogs, courses, and view full audit registers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div className="space-y-3 pt-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Available Accounts</p>
                {admins.length === 0 ? (
                  <p className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">No active Admin users. Check seed data.</p>
                ) : (
                  admins.map(user => (
                    <div key={user.id} className="p-3.5 rounded-2xl border border-border/40 bg-background/50 flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-foreground">{user.name}</span>
                      <span className="text-2xs font-semibold text-muted-foreground">{user.email}</span>
                      <form action={loginAs} className="mt-3">
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="role" value={user.role} />
                        <Button className="w-full h-9 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white transition-all inline-flex items-center gap-1.5" type="submit">
                          <UserCheck className="size-3.5" />
                          Enter Admin Portal
                        </Button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lecturer Column */}
          <Card className="glass-panel rounded-3xl shadow-xl flex flex-col justify-between text-left relative overflow-hidden border-none">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.64_0.16_145))]" />
            <CardHeader className="pt-8 pb-4">
              <span className="inline-flex w-fit items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 border-primary/20">
                <BookOpen className="size-3.5" />
                Lecturer
              </span>
              <CardTitle className="text-xl font-black tracking-tight mt-3">Lecturer Portal</CardTitle>
              <CardDescription className="text-xs font-semibold text-muted-foreground mt-1">
                Open coordinate perimeters, enrol students, and export Excel registers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div className="space-y-3 pt-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Available Accounts</p>
                {lecturers.length === 0 ? (
                  <p className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">No active Lecturer users. Check seed data.</p>
                ) : (
                  lecturers.map(user => (
                    <div key={user.id} className="p-3.5 rounded-2xl border border-border/40 bg-background/50 flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-foreground">{user.name}</span>
                      <span className="text-2xs font-semibold text-muted-foreground">{user.email}</span>
                      <form action={loginAs} className="mt-3">
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="role" value={user.role} />
                        <Button className="w-full h-9 rounded-xl font-bold text-xs bg-primary hover:bg-primary/95 text-primary-foreground transition-all inline-flex items-center gap-1.5" type="submit">
                          <UserCheck className="size-3.5" />
                          Enter Lecturer Portal
                        </Button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Student Column */}
          <Card className="glass-panel rounded-3xl shadow-xl flex flex-col justify-between text-left relative overflow-hidden border-none">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,oklch(0.64_0.16_145),oklch(0.50_0.15_180))]" />
            <CardHeader className="pt-8 pb-4">
              <span className="inline-flex w-fit items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400">
                <GraduationCap className="size-3.5" />
                Student
              </span>
              <CardTitle className="text-xl font-black tracking-tight mt-3">Student Portal</CardTitle>
              <CardDescription className="text-xs font-semibold text-muted-foreground mt-1">
                Check in to live geofenced lectures, check accuracy, and view logs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div className="space-y-3 pt-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Available Accounts</p>
                {students.length === 0 ? (
                  <p className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">No active Student users. Check seed data.</p>
                ) : (
                  students.map(user => (
                    <div key={user.id} className="p-3.5 rounded-2xl border border-border/40 bg-background/50 flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-foreground">{user.name}</span>
                      <span className="text-2xs font-semibold text-muted-foreground">{user.email}</span>
                      <form action={loginAs} className="mt-3">
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="role" value={user.role} />
                        <Button className="w-full h-9 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all inline-flex items-center gap-1.5" type="submit">
                          <UserCheck className="size-3.5" />
                          Enter Student Portal
                        </Button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </section>

    </main>
  );
}
