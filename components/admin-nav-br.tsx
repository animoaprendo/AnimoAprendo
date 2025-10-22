"use client";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import { PiStudent } from "react-icons/pi";

export default function AdminNavBR() {
  const { user } = useUser();
  const pathname = usePathname();
  const pathParts = pathname.split("/");
  const isAdminPath = pathParts[1] === "admin";

  if (user?.publicMetadata?.isAdmin !== true) {
    return null;
  }

  return (
    <>
      {!isAdminPath ? (
        <Link
          className="fixed bottom-5 right-5 bg-gradient-to-br from-green-500 to-green-700 z-1000 p-4 rounded-full aspect-square text-white"
          href="/admin/dashboard"
        >
          <MdOutlineAdminPanelSettings className="text-2xl" />
        </Link>
      ) : (
        <Link
          className="fixed bottom-5 right-5 bg-gradient-to-br from-green-500 to-green-700 z-1000 p-4 rounded-full aspect-square text-white"
          href="/tutee/home"
        >
          <PiStudent className="text-2xl" />
        </Link>
      )}
    </>
  );
}
