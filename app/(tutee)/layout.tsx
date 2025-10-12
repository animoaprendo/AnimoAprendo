import ConditionalFooter from "@/components/ConditionalFooter";
import NavLinksTutee from "@/components/navlinkstutee";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { currentUser } from "@clerk/nextjs/server";
import { permanentRedirect } from "next/navigation";
import NavLinksDefault from "@/components/navlinksdefault";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const userid = user?.id;

  if (user?.publicMetadata.role !== "tutee") {
    if (!user?.publicMetadata.role == null) {
      permanentRedirect("/");
    }
  }
  return (
    <>
      <SignedOut>
        <NavLinksDefault />
        {/* Page content here */}
        <div className="flex flex-col grow items-center pt-0">
          {children}
        </div>
        <ConditionalFooter />
      </SignedOut>

      <SignedIn>
        <NavLinksTutee />
        {/* Page content here */}
        <div className="flex flex-col grow items-center pt-0">
          {children}
        </div>
        <ConditionalFooter />
      </SignedIn>
    </>
  );
}
