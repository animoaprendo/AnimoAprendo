import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
export const metadata: Metadata = {
  title: "AnimoAprendo",
  description: "Peer to peer learning platform",
};
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import GlobalMessageNotifications from "@/components/chat/GlobalMessageNotifications";
import { trackDailySiteVisit } from "@/app/gamification-actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await trackDailySiteVisit();

  return (
    <ClerkProvider>
      <html lang="en" >
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased w-full min-h-screen m-auto flex flex-col overflow-x-hidden`}
        >
          <NuqsAdapter>
            {/* <AdminNavBR /> */}

            {children}
            <GlobalMessageNotifications />
            <Toaster position="bottom-right" />
          </NuqsAdapter>
        </body>
      </html>
    </ClerkProvider>
  );
}
