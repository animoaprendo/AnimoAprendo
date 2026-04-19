import ConditionalFooter from "@/components/ConditionalFooter";
import NavLinksDefault from "@/components/navlinksdefault";
import NavLinksTutee from "@/components/navlinkstutee";
import NavLinksTutor from "@/components/navlinkstutor";
import {
  SignedIn,
  SignedOut
} from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { permanentRedirect } from "next/navigation";

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
        {user?.publicMetadata.role === "tutee" && <NavLinksTutee />}
        {user?.publicMetadata.role === "tutor" && <NavLinksTutor />}
        {/* Page content here */}
        <div className="flex flex-col grow items-center pt-0">
          {children}
        </div>
        <ConditionalFooter />
      </SignedIn>
    </>
  );

}
