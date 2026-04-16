"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { BarChart3, BookOpen, CalendarDays, ClipboardCheck, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const reportLinks = [
  {
    title: "Subject Demand",
    description: "Most booked subjects and demand breakdown by status.",
    href: "/admin/reports/subjects",
    icon: BookOpen,
  },
  {
    title: "Tutor Demand",
    description: "Most requested tutors, completion rate, and ratings.",
    href: "/admin/reports/tutors",
    icon: Users,
  },
  {
    title: "Booking Trends",
    description: "Booking volume trend over time with status distribution.",
    href: "/admin/reports/bookings",
    icon: CalendarDays,
  },
  {
    title: "Quiz Results",
    description: "First vs second attempt performance and raw attempt data by subject.",
    href: "/admin/reports/quiz-results",
    icon: ClipboardCheck,
  },
];

export default function AdminReportsOverviewPage() {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  if (!user.publicMetadata?.isAdmin) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-red-600 font-medium">Access Denied</div>
            <div className="text-muted-foreground mt-2">You do not have permission to access reports.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Admin Reports
          </CardTitle>
          <CardDescription>
            Open a report page to analyze usage with role-based scope and export data to Excel-compatible CSV.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportLinks.map((report) => {
          const Icon = report.icon;

          return (
            <Link key={report.href} href={report.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {report.title}
                  </CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
