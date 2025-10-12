import ConditionalFooter from "@/components/ConditionalFooter";
import { SignedIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { permanentRedirect } from "next/navigation";
import NavLinksTutor from "@/components/navlinkstutor";
import AlertFragment from "./alert";
import RankFragment, { AddExperience } from "./rank";
import DevButton from "./devButton";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const userid = user?.id;

  if (user?.publicMetadata.role !== "tutor") {
    if (!user?.publicMetadata.role == null) {
      permanentRedirect("/");
    }
  }
  return (
    <>
      <SignedIn>
        <NavLinksTutor />
        <div className="fixed flex top-0 left-0 w-full h-full pointer-events-none items-center justify-center z-10">
          <RankFragment />
        </div>
        <div className="fixed bottom-0 right-0 m-4 z-4">
          <AlertFragment />
          {/* <DevButton /> */}
        </div>
        {/* Page content here */}
        <div className="flex flex-col grow items-center">{children}</div>
        <ConditionalFooter />
      </SignedIn>
    </>
  );
}
