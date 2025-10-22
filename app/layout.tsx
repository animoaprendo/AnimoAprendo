import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import Link from "next/link";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import { currentUser } from "@clerk/nextjs/server";
import AdminNavBR from "@/components/admin-nav-br";

export const metadata: Metadata = {
  title: "AnimoAprendo",
  description: "Peer to peer learning platform",
};

import Footer from "@/components/footer";
import NavLinksTutee from "@/components/navlinkstutee";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";

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
          </NuqsAdapter>
        </body>
      </html>
    </ClerkProvider>
  );
}
