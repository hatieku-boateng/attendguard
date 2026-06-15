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
  title: "Pentecost University Attendance",
  description:
    "Secure attendance management system for Pentecost University.",
  icons: {
    icon: "/puc-crest.jpg",
    apple: "/puc-crest.jpg",
  },
  openGraph: {
    title: "Pentecost University Attendance",
    description: "Secure attendance management system for Pentecost University.",
    images: [
      {
        url: `${appUrl}/puc-logo-full.png`,
        width: 1200,
        height: 630,
        alt: "Pentecost University Logo",
      },
    ],
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
