"use client"

import { useState } from "react"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Menu, GraduationCap, LogIn, UserPlus } from "lucide-react"

export default function NavLinksGuest() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-green-900 sticky top-0 z-50 select-none">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <a href="/" className="flex items-center gap-2 font-bold text-xl text-white/98">
            <GraduationCap className="w-6 h-6 text-white" />
            <span>AnimoAprendo</span>
            <Badge variant="outline" className="text-xs text-white border-white/30">Learn</Badge>
          </a>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 lg:hidden">
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
                  Get Started
                </SheetTitle>
                <SheetDescription>
                  Join our learning community and connect with expert tutors
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <SignUpButton mode="modal">
                  <Button className="w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </Button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <Button variant="outline" className="w-full">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </SignInButton>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex lg:items-center lg:gap-4">
          <SignInButton mode="modal">
            <Button variant="ghost" className="text-white/98 hover:text-white hover:bg-white/10">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </SignInButton>

          <SignUpButton mode="modal">
            <Button className="bg-green-700 hover:bg-green-800 text-white border border-white/20">
              <UserPlus className="w-4 h-4 mr-2" />
              Sign Up
            </Button>
          </SignUpButton>
        </div>
      </nav>


    </header>
  )
}
