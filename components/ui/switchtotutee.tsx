"use client";

import { updateMetadata } from "@/app/actions";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SwitchToTutee() {
  const { user } = useUser();
  const userId = user?.id;

  async function handleClick() {
    const res = await updateMetadata({ userId, role: "tutee" });

    if(res.success) {
        permanentRedirect("/")
    }
  }

  return (
    <Button
      variant="default"
      size="sm"
      className="bg-linear-to-r from-green-300 via-green-500 to-blue-400 text-transparent bg-clip-text font-bold border-0 hover:from-green-400 hover:via-green-600 hover:to-blue-500 w-full lg:w-fit hover:cursor-pointer"
      onClick={(e: React.MouseEvent) => {
        console.log("Switching to tutee");
        handleClick();
        e.preventDefault();
      }}
    >
      Switch To Tutee
    </Button>
  );
}
