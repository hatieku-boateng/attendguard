import "server-only";

export function getAuthSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "development-only-attendance-management-secret";
  }

  throw new Error("AUTH_SECRET is not configured.");
}
