"use client";

import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  GraduationCap,
  LayoutDashboard,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  UserCog,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import Image from "next/image";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Appointments",
      url: "/admin/appointments",
      icon: Bot,
    },
    {
      title: "Subjects",
      url: "/admin/subjects",
      icon: BookOpen,
    },
    {
      title: "Users",
      icon: UserCog,
      isActive: true,
      url: "",
      items: [
        {
          title: "User Management",
          url: "/admin/users/user-management",
        },
        {
          title: "Admin Management",
          url: "/admin/users/admin-management",
        },
      ],
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userData?: any;
}

export default function AppSidebar({ userData, ...props }: AppSidebarProps) {
  const [data, setData] = React.useState({
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        icon: LayoutDashboard,
        isActive: true,
      },
      {
        title: "Appointments",
        url: "/admin/appointments",
        icon: Bot,
      },
      {
        title: "Colleges",
        url: "/admin/colleges",
        icon: GraduationCap,
      },
      {
        title: "Subjects",
        url: "/admin/subjects",
        icon: BookOpen,
      },
      {
        title: "Users",
        icon: UserCog,
        isActive: true,
        url: "",
        items: [
          {
            title: "User Management",
            url: "/admin/users/user-management",
          },
          {
            title: "Admin Management",
            url: "/admin/users/admin-management",
          },
        ],
      },
    ],
  });

  // Use userData if provided, otherwise fall back to sample data
  const displayUser = {
    name:
      userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.username ||
          userData?.emailAddresses?.[0]?.emailAddress ||
          "User",
    email:
      userData?.emailAddresses?.[0]?.emailAddress ||
      userData?.email ||
      "user@example.com",
    avatar: userData?.imageUrl || userData?.avatar || "/avatars/shadcn.jpg",
    publicMetadata: userData?.publicMetadata,
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex flex-row flex-nowrap gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
            <Image
              src="/images/AnimoAprendoMinimalLogo.png"
              width={80}
              height={80}
              alt="AnimoAprendo Logo"
              className="rounded-lg"
            />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">AnimoAprendo</span>
            <span className="truncate text-xs">
              {displayUser.publicMetadata?.adminRole}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
