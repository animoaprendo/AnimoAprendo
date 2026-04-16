"use client";

import {
  BarChart3,
  BookOpen,
  Bot,
  CheckSquare2,
  GraduationCap,
  LayoutDashboard,
  Trophy,
  UserCog
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
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
      title: "Approvals",
      url: "/admin/approval",
      icon: CheckSquare2,
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
    navAdmin: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        icon: LayoutDashboard,
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
        title: "Approvals",
        url: "/admin/approval",
        icon: CheckSquare2,
      },
      {
        title: "Approved Offers",
        url: "/admin/approval/approved",
        icon: CheckSquare2,
      },
      {
        title: "Leaderboards",
        url: "/admin/leaderboards",
        icon: Trophy,
      },
      {
        title: "Reports",
        icon: BarChart3,
        url: "",
        items: [
          {
            title: "Overview",
            url: "/admin/reports",
          },
          {
            title: "Subject Demand",
            url: "/admin/reports/subjects",
          },
          {
            title: "Tutor Demand",
            url: "/admin/reports/tutors",
          },
          {
            title: "Booking Trends",
            url: "/admin/reports/bookings",
          },
          {
            title: "Quiz Results",
            url: "/admin/reports/quiz-results",
          },
        ],
      },
      {
        title: "Users",
        icon: UserCog,
        url: "/admin/users/user-management",
      },
    ],
    navSuperAdmin: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        icon: LayoutDashboard,
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
        title: "Approvals",
        url: "/admin/approval",
        icon: CheckSquare2,
      },
      {
        title: "Approved Offers",
        url: "/admin/approval/approved",
        icon: CheckSquare2,
      },
      {
        title: "Leaderboards",
        url: "/admin/leaderboards",
        icon: Trophy,
      },
      {
        title: "Reports",
        icon: BarChart3,
        url: "",
        items: [
          {
            title: "Overview",
            url: "/admin/reports",
          },
          {
            title: "Subject Demand",
            url: "/admin/reports/subjects",
          },
          {
            title: "Tutor Demand",
            url: "/admin/reports/tutors",
          },
          {
            title: "Booking Trends",
            url: "/admin/reports/bookings",
          },
          {
            title: "Quiz Results",
            url: "/admin/reports/quiz-results",
          },
        ],
      },
      {
        title: "Users",
        icon: UserCog,
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
        {userData?.publicMetadata?.adminRole === "superadmin" ? (
          <NavMain items={data.navSuperAdmin} />
        ) : (
          <NavMain items={data.navAdmin} />
        )}
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
