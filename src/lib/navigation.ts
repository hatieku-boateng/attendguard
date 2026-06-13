import type { UserRole } from "@/lib/auth";

export function getWorkspaceNavItems(role: UserRole) {
  if (role === "administrator") {
    return [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/lecturers", label: "Lecturers" },
      { href: "/admin/catalog", label: "Catalogue" },
      { href: "/admin/courses", label: "Assignments" },
      { href: "/admin/students", label: "Students" },
      { href: "/profile", label: "Profile" },
    ];
  }

  if (role === "lecturer") {
    return [
      { href: "/lecturer/dashboard", label: "Dashboard" },
      { href: "/lecturer/courses", label: "Courses" },
      { href: "/lecturer/reports", label: "Reports" },
      { href: "/profile", label: "Profile" },
    ];
  }

  return [
    { href: "/student/dashboard", label: "Dashboard" },
    { href: "/student/classes", label: "Classes" },
    { href: "/student/sessions", label: "Sessions" },
    { href: "/student/attendance-history", label: "History" },
    { href: "/profile", label: "Profile" },
  ];
}
