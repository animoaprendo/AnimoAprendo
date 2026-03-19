"use client";

import { updateMetadata } from "@/app/actions";
import { useUser } from "@clerk/nextjs";
import { permanentRedirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function SwitchToTutee() {
  const { user } = useUser();
  const userId = user?.id;
  const [isSwitching, setIsSwitching] = useState(false);

  async function handleClick() {
    if (!userId || isSwitching) {
      return;
    }

    setIsSwitching(true);
    const res = await updateMetadata({ userId, role: "tutee" });

    if (res.success) {
      permanentRedirect("/");
    }

    setIsSwitching(false);
  }

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className="bg-linear-to-r from-green-300 via-green-500 to-blue-400 text-transparent bg-clip-text font-bold border-0 hover:from-green-400 hover:via-green-600 hover:to-blue-500 w-full lg:w-fit hover:cursor-pointer"
        onClick={handleClick}
        disabled={isSwitching}
      >
        Switch To Tutee
      </Button>

      {isSwitching && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <div className="rounded-xl border bg-background/95 px-6 py-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm font-medium">Switching to tutee...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
