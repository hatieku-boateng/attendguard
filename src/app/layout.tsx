import type { Metadata } from "next";
import "./globals.css";
import { InitialLoader } from "@/components/initial-loader";

const appUrl = process.env.APP_URL
  ? process.env.APP_URL.replace(/\/$/, "")
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://attendguard.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "AttendGuard",
  description: "Secure, reusable QR attendance management.",
  openGraph: {
    title: "AttendGuard",
    description: "Secure, reusable QR attendance management.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <InitialLoader />
        {children}
      </body>
    </html>
  );
}
