"use client";

import { updateMetadata } from "@/app/actions";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";

export default function SwitchToTutor() {
  const { user } = useUser();
  const userId = user?.id;

  async function handleClick() {
    const res = await updateMetadata({ userId, role: "tutor" });

    if (res.success) {
      permanentRedirect("/tutor/dashboard");
    }
  }

  return (
    <Link
      href="/tutor/dashboard"
      onNavigate={(e) => {
        console.log("Switching to tutor");
        handleClick();
        e.preventDefault();
      }}
      className="bg-gradient-to-r from-green-300 via-green-500 to-blue-400 inline-block text-transparent bg-clip-text font-bold text-sm text-center"
    >
      Switch To Tutor
    </Link>
  );
}
