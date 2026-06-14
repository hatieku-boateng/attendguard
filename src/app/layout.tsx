import type { Metadata } from "next";
import { Nunito, Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://attendguard.vercel.app"),
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
        url: "/puc-logo-full.png",
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
      className={`${nunito.variable} ${poppins.variable} ${geistMono.variable} h-full antialiased`}
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'system';
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
