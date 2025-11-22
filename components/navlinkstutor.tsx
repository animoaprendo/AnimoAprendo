"use client";
import { SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import React, { Suspense, useState } from "react";
import SwitchToTutee from "./ui/switchtotutee";
import ProfileImageSkeleton from "./ui/profile-skeleton";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Menu, X, MessageCircle, LayoutDashboard, BookOpen, Calendar, History, User, LogOut, GraduationCap } from "lucide-react";
import { Separator } from "@/components/ui/separator";

function NavLinksTutor() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoaded, user } = useUser();

  return (
    <header className="bg-green-900 sticky top-0 z-50 select-none">
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/tutor/dashboard" className="flex items-center gap-2 font-bold text-xl text-white/98">
            <span>AnimoAprendo</span>
          </Link>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button variant="ghost" size="sm" className="text-white/98 hover:text-white hover:bg-white/10" asChild>
            <Link href="/tutor/chat">
              <MessageCircle className="w-4 h-4" />
              <span className="sr-only">Chat</span>
            </Link>
          </Button>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white/98 hover:text-white hover:bg-white/10">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Tutor Navigation
                </SheetTitle>
                <SheetDescription>
                  Access your tutor dashboard and manage your sessions
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/tutor/dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/tutor/subjects">
                      <BookOpen className="w-4 h-4 mr-2" />
                      My Subjects
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/tutor/appointments">
                      <Calendar className="w-4 h-4 mr-2" />
                      Appointments
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/tutor/history">
                      <History className="w-4 h-4 mr-2" />
                      History
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/tutor/chat">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Messages
                    </Link>
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <SwitchToTutee />
                  
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/tutor/profile">
                      <User className="w-4 h-4 mr-2" />
                      Profile Settings
                    </Link>
                  </Button>
                  
                  <SignOutButton>
                    <Button variant="destructive" className="w-full justify-start">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </SignOutButton>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-6">
          <nav className="flex items-center gap-6">
            <Button variant="ghost" size="sm" className="text-white/98 hover:text-white hover:bg-white/10" asChild>
              <Link href="/tutor/dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/98 hover:text-white hover:bg-white/10" asChild>
              <Link href="/tutor/subjects" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Subjects
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/98 hover:text-white hover:bg-white/10" asChild>
              <Link href="/tutor/appointments" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Appointments
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/98 hover:text-white hover:bg-white/10" asChild>
              <Link href="/tutor/history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/98 hover:text-white hover:bg-white/10" asChild>
              <Link href="/tutor/chat" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat
              </Link>
            </Button>
          </nav>
          
          <Separator orientation="vertical" className="h-6 bg-white/20" />
          
          <SwitchToTutee />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/10">
                <Avatar className="h-8 w-8">
                  <Suspense fallback={<ProfileImageSkeleton />}>
                    {isLoaded && user ? (
                      <AvatarImage src={user.imageUrl} alt={user.username || 'Profile'} />
                    ) : (
                      <ProfileImageSkeleton />
                    )}
                  </Suspense>
                  <AvatarFallback className="bg-white/20 text-white">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/tutor/profile" className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <SignOutButton>
                  <div className="flex items-center cursor-pointer w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </div>
                </SignOutButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
}

export default NavLinksTutor;
