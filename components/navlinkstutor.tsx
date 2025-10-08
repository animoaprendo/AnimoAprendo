"use client";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { Dialog, DialogPanel, PopoverGroup } from "@headlessui/react";
import Link from "next/link";
import React, { Suspense, useState } from "react";
import SwitchToTutee from "./ui/switchtotutee";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import ProfileImageSkeleton from "./ui/profile-skeleton";
import Image from "next/image";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/solid";

function NavLinksTutor() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoaded, user } = useUser();

  return (
    <header className="bg-green-900 select-none">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-[90rem] items-center justify-between p-6 lg:px-8"
      >
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/tutor/dashboard" className="-m-1.5 p-1.5">
            <span className="text-white/98 font-semibold">AnimoAprendo</span>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex gap-4 lg:hidden">
          <Link
            href="/tutor/chat"
            className="text-sm font-semibold text-white/98 flex items-center gap-1"
          >
            <ChatBubbleLeftIcon className="size-6"/>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white/96"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>

        {/* Desktop Links */}
        <PopoverGroup className="hidden lg:flex lg:gap-x-4 items-center">
          <Link
            href="/tutor/dashboard"
            className="text-sm font-semibold text-white/98"
          >
            Dashboard
          </Link>
          <Link
            href="/tutor/subjects"
            className="text-sm font-semibold text-white/98"
          >
            View Subjects
          </Link>
          <Link
            href="/tutor/appointments"
            className="text-sm font-semibold text-white/98"
          >
            View Appointments
          </Link>
          <Link
            href="/tutor/history"
            className="text-sm font-semibold text-white/98"
          >
            Tutoring History
          </Link>
          <ul className="p-2">
            <SwitchToTutee />
          </ul>
          <Link
            href="/tutor/chat"
            className="text-sm font-semibold text-white/98 flex items-center gap-1"
          >
            <ChatBubbleLeftIcon className="size-6"/>
          </Link>
          {/* Profile */}
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar"
            >
              <div className="w-10 rounded-full">
                <Suspense fallback={<ProfileImageSkeleton />}>
                  {isLoaded && user ? (
                    <Image
                      width={120}
                      height={120}
                      alt="Profile Image"
                      src={user.imageUrl}
                      priority
                    />
                  ) : (
                    <ProfileImageSkeleton />
                  )}
                </Suspense>
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm gap-3 dropdown-content bg-white rounded-box mt-3 w-52 p-2 shadow text-black z-50"
            >
              <p className="border-b px-2 pb-1">Welcome, {user?.username}</p>
              <Link className="justify-between" href="/tutor/profile">
                Profile
              </Link>
              <li>
                <SignOutButton />
              </li>
            </ul>
          </div>
        </PopoverGroup>
      </nav>

      {/* Mobile Drawer */}
      <Dialog
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
        className="lg:hidden"
      >
        <div className="fixed inset-0 z-50" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-green-900 p-6 sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <Link href="/tutor/dashboard" className="-m-1.5 p-1.5">
              <span className="font-semibold text-white/98">AnimoAprendo</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-white/96"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>

          <div className="mt-6 flow-root h-full">
            <div className="-my-6 divide-y h-full divide-gray-500/10">
              <div className="py-6 flex flex-col h-full">
                <Link
                  href="/tutor/dashboard"
                  className="-mx-6 block rounded-lg px-6 py-2.5 text-base font-semibold text-white/98 hover:bg-gray-50 hover:text-black"
                >
                  Dashboard
                </Link>
                <Link
                  href="/tutor/subjects"
                  className="-mx-6 block rounded-lg px-6 py-2.5 text-base font-semibold text-white/98 hover:bg-gray-50 hover:text-black"
                >
                  View Subjects
                </Link>
                <Link
                  href="/tutor/appointments"
                  className="-mx-6 block rounded-lg px-6 py-2.5 text-base font-semibold text-white/98 hover:bg-gray-50 hover:text-black"
                >
                  View Appointments
                </Link>
                <Link
                  href="/tutor/history"
                  className="-mx-6 block rounded-lg px-6 py-2.5 text-base font-semibold text-white/98 hover:bg-gray-50 hover:text-black"
                >
                  Tutoring History
                </Link>

                {/* Bottom actions */}
                <div className="mt-auto flex flex-col gap-4 px-6">
                  <div className="mt-4">
                    <ul className="border border-neutral-300 rounded-lg p-3 bg-white/5 text-center">
                      <SwitchToTutee />
                    </ul>
                  </div>
                  <Link
                    href="/tutor/profile"
                    className="block rounded-lg px-4 py-2 text-base font-semibold text-center text-white bg-blue-600 hover:bg-blue-700"
                  >
                    View Profile
                  </Link>
                  <SignOutButton>
                    <div className="block rounded-lg px-4 py-2 text-base font-semibold text-center text-white bg-red-700 hover:bg-red-800 cursor-pointer">
                      Logout
                    </div>
                  </SignOutButton>
                </div>
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}

export default NavLinksTutor;
