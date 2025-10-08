"use client";
import { SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import React, { Suspense, useState } from "react";
import SwitchToTutor from "./ui/switchtotutor";
import { Dialog, DialogPanel, PopoverGroup } from "@headlessui/react";
import {
  Bars3Icon,
  ChatBubbleLeftIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import ProfileImageSkeleton from "./ui/profile-skeleton";
import Image from "next/image";

function NavLinksTutee() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoaded, user } = useUser();

  return (
    <header className="bg-green-900 select-none">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-[90rem] items-center justify-between p-6 lg:px-8"
      >
        {/* Logo / Brand */}
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="text-white font-bold text-lg">AnimoAprendo</span>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex gap-4 lg:hidden">
          <Link
            href="/chat"
            className="text-sm font-semibold text-white hover:text-gray-200 flex items-center gap-1"
          >
            <ChatBubbleLeftIcon className="size-6"/>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>

        {/* Desktop Menu */}
        <PopoverGroup className="hidden lg:flex lg:gap-x-6 items-center">
          <Link
            href="/"
            className="text-sm font-semibold text-white hover:text-gray-200"
          >
            Home
          </Link>
          <Link
            href="/browse"
            className="text-sm font-semibold text-white hover:text-gray-200"
          >
            Browse
          </Link>
          <Link
            href="/appointments"
            className="text-sm font-semibold text-white hover:text-gray-200"
          >
            Appointments
          </Link>
          <Link
            href="/history"
            className="text-sm font-semibold text-white hover:text-gray-200"
          >
            History
          </Link>
          <Link
            href="/chat"
            className="text-sm font-semibold text-white hover:text-gray-200 flex items-center gap-1"
          >
            <ChatBubbleLeftIcon className="size-6" />
          </Link>
          {/* Profile Dropdown */}
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
              className="menu menu-sm gap-3 dropdown-content bg-white rounded-box mt-3 w-56 p-3 shadow text-black z-50"
            >
              <p className="border-b px-2 pb-1">
                Welcome, <span className="font-medium">{user?.username}</span>
              </p>

              <li>
                <Link href="/profile" className="font-semibold">
                  Profile
                </Link>
              </li>

              <li>
                <div className="border border-neutral-300 rounded-lg p-2">
                  <SwitchToTutor />
                </div>
              </li>

              <li>
                <SignOutButton>
                  <div className="text-red-600 font-semibold cursor-pointer">
                    Logout
                  </div>
                </SignOutButton>
              </li>
            </ul>
          </div>
        </PopoverGroup>
      </nav>

      {/* Mobile Drawer Menu (now includes SwitchToTutor) */}
      <Dialog
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
        className="lg:hidden"
      >
        <div className="fixed inset-0 z-50" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-green-900 p-6 sm:ring-1 sm:ring-gray-900/10">
          {/* Top with Logo & Close */}
          <div className="flex items-center justify-between">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="font-semibold text-white">AnimoAprendo</span>
            </Link>
            
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-white"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>

          {/* Links */}
          <div className="mt-6 flow-root h-full">
            <div className="-my-6 divide-y h-full divide-gray-500/10">
              <div className="py-6 flex flex-col h-full">
                <Link
                  href="/"
                  className="-mx-6 block rounded-lg px-6 py-2.5 text-base font-semibold text-white hover:bg-white hover:text-green-900"
                >
                  Home
                </Link>
                <Link
                  href="/browse"
                  className="-mx-6 block rounded-lg px-6 py-2.5 text-base font-semibold text-white hover:bg-white hover:text-green-900"
                >
                  Browse Subjects
                </Link>
                <Link
                  href="/appointments"
                  className="-mx-6 block rounded-lg px-6 py-2.5 text-base font-semibold text-white hover:bg-white hover:text-green-900"
                >
                  My Appointments
                </Link>
                <Link
                  href="/history"
                  className="-mx-6 block rounded-lg px-6 py-2.5 text-base font-semibold text-white hover:bg-white hover:text-green-900"
                >
                  Tutoring History
                </Link>

                {/* Bottom actions */}
                <div className="mt-auto flex flex-col gap-4 px-6">
                  <div className="mt-4">
                    <ul className="border border-neutral-300 rounded-lg p-3 bg-white/10 text-center">
                      <SwitchToTutor />
                    </ul>
                  </div>
                  <Link
                    href="/profile"
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

export default NavLinksTutee;
