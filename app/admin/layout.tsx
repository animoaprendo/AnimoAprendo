"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";

import AppSidebar from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import AlertFragment from "../tutor/alert";
import { Toaster } from "sonner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(true);

  // Handle redirect for non-admin users
  useEffect(() => {
    if (isLoaded && (!isSignedIn || user?.publicMetadata?.isAdmin !== true)) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, user, router]);

  // Serialize user data for AppSidebar
  const userData = user
    ? {
        id: user.id,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        emailAddresses: user.emailAddresses?.map((email) => ({
          emailAddress: email.emailAddress,
        })),
        imageUrl: user.imageUrl,
        publicMetadata: user.publicMetadata,
      }
    : null;
  const pathname = usePathname();
  const pathSegments = pathname.split("/");

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AppSidebar userData={userData} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {pathSegments.map((segment, index) => {
                  // Skip empty segments
                  if (!segment) return null;
                  if (index == 1) return null; // Skip "admin" segment

                  if (index < pathSegments.length - 1) {
                    return (
                      <>
                        <BreadcrumbLink
                          key={index}
                          href={`/${pathSegments.slice(1, index + 1).join("/")}`}
                          className="capitalize"
                        >
                          {segment}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator className="hidden md:block" />
                      </>
                    );
                  } else {
                    return (
                      <BreadcrumbItem key={index}>
                        <BreadcrumbPage className="capitalize">
                          {segment}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    );
                  }
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="fixed bottom-0 right-0 m-4 z-4">
            <AlertFragment />
          </div>
          {children}
        </div>
      </SidebarInset>
      <Toaster position="bottom-right" />
    </SidebarProvider>
  );
}
