"use client";

import {
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Star,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";

import { getCollectionData } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart";
import { useUser } from "@clerk/nextjs";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from "recharts";

type DashboardData = {
  users: any[];
  subjects: any[];
  colleges: any[];
  appointments: any[];
};

type DashboardStats = {
  totalUsers: number;
  totalSubjects: number;
  totalColleges: number;
  totalDepartments: number;
  totalAppointments: number;
  activeAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
};

type DashboardTrends = {
  users: number;
  subjects: number;
  appointments: number;
};

const activityConfig = {
  tutors: {
    label: "Tutors",
    color: "hsl(var(--chart-1))",
  },
  tutees: {
    label: "Tutees",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const appointmentConfig = {
  appointments: {
    label: "Appointments",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export default function AdminDashboard() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData>({
    users: [],
    subjects: [],
    colleges: [],
    appointments: [],
  });
  
  // Check if user is superadmin
  const isSuperAdmin = user?.publicMetadata?.isAdmin === true && user?.publicMetadata?.adminRole === "superadmin";
  const userCollege = user?.publicMetadata?.college as string | undefined;
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalSubjects: 0,
    totalColleges: 0,
    totalDepartments: 0,
    totalAppointments: 0,
    activeAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
  });
  const [trends, setTrends] = useState<DashboardTrends>({
    users: 0,
    subjects: 0,
    appointments: 0,
  });
  const [loading, setLoading] = useState(true);

  const getValidDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getDocumentDate = (doc: any, keys: string[]): Date | null => {
    for (const key of keys) {
      const parsed = getValidDate(doc?.[key]);
      if (parsed) return parsed;
    }
    return null;
  };

  const getAppointmentStatus = (appointment: any) => {
    const rawStatus =
      appointment?.status ?? appointment?.appointment?.status ?? "";
    return String(rawStatus).trim().toLowerCase();
  };

  const getMonthBounds = (monthOffset: number) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + monthOffset;
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const countInRange = (
    collection: any[],
    dateKeys: string[],
    monthOffset: number
  ) => {
    const { start, end } = getMonthBounds(monthOffset);
    return collection.filter((item) => {
      const date = getDocumentDate(item, dateKeys);
      if (!date) return false;
      return date >= start && date <= end;
    }).length;
  };

  const getTrendPercent = (current: number, previous: number) => {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  const countInRollingWindow = (
    collection: any[],
    dateKeys: string[],
    startDaysAgo: number,
    endDaysAgo: number
  ) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - startDaysAgo);
    const end = new Date(now);
    end.setDate(now.getDate() - endDaysAgo);

    return collection.filter((item) => {
      const date = getDocumentDate(item, dateKeys);
      if (!date) return false;
      return date >= start && date < end;
    }).length;
  };

  const formatTrend = (value: number) => {
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value}% from last month`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all collections
        const [usersRes, subjectsRes, collegesRes, appointmentsRes] =
          await Promise.all([
            getCollectionData("users"),
            getCollectionData("subjectOptions"),
            getCollectionData("colleges"),
            getCollectionData("appointments"),
          ]);

        const dashboardData = {
          users: usersRes.data || [],
          subjects: subjectsRes.data || [],
          colleges: collegesRes.data || [],
          appointments: appointmentsRes.data || [],
        };

        setData(dashboardData);

        // Calculate statistics
        // Calculate subjects based on admin role
        let totalSubjects: number;
        if (!isSuperAdmin && userCollege) {
          // For regular admins, filter subjects to their college only
          const filteredSubjects = dashboardData.subjects.filter(
            (subject: any) => subject.college === userCollege
          );
          totalSubjects = filteredSubjects.length;
        } else {
          // For superadmins, count all subjects
          totalSubjects = dashboardData.subjects.length;
        }
        
        // Calculate departments based on admin role
        let totalDepartments: number;
        let filteredColleges = dashboardData.colleges;
        
        if (!isSuperAdmin && userCollege) {
          // For regular admins, filter to their college only
          filteredColleges = dashboardData.colleges.filter(
            (college: any) => college.abbreviation === userCollege
          );
          // Count departments only from the admin's assigned college
          totalDepartments = filteredColleges.reduce(
            (acc: number, college: any) =>
              acc + (college.departments?.length || 0),
            0
          );
        } else {
          // For superadmins, count all departments from all colleges
          totalDepartments = dashboardData.colleges.reduce(
            (acc: number, college: any) =>
              acc + (college.departments?.length || 0),
            0
          );
        }

        const activeAppointments = dashboardData.appointments.filter((apt: any) => {
          const status = getAppointmentStatus(apt);
          return status === "active" || status === "scheduled" || status === "accepted";
        }).length;
        const completedAppointments = dashboardData.appointments.filter((apt: any) => {
          const status = getAppointmentStatus(apt);
          return status === "completed";
        }).length;
        const pendingAppointments = dashboardData.appointments.filter((apt: any) => {
          const status = getAppointmentStatus(apt);
          return status === "pending";
        }).length;

        const currentUsers = countInRange(
          dashboardData.users,
          ["createdAt", "updatedAt"],
          0
        );
        const previousUsers = countInRange(
          dashboardData.users,
          ["createdAt", "updatedAt"],
          -1
        );

        const currentSubjects = countInRange(
          dashboardData.subjects,
          ["createdAt", "updatedAt"],
          0
        );
        const previousSubjects = countInRange(
          dashboardData.subjects,
          ["createdAt", "updatedAt"],
          -1
        );

        const currentAppointments = countInRange(
          dashboardData.appointments,
          ["createdAt", "updatedAt", "datetimeISO", "startDate", "date"],
          0
        );
        const previousAppointments = countInRange(
          dashboardData.appointments,
          ["createdAt", "updatedAt", "datetimeISO", "startDate", "date"],
          -1
        );

        setStats({
          totalUsers: dashboardData.users.length,
          totalSubjects,
          totalColleges: isSuperAdmin ? dashboardData.colleges.length : filteredColleges.length,
          totalDepartments,
          totalAppointments: dashboardData.appointments.length,
          activeAppointments,
          completedAppointments,
          pendingAppointments,
        });
        setTrends({
          users: getTrendPercent(currentUsers, previousUsers),
          subjects: getTrendPercent(currentSubjects, previousSubjects),
          appointments: getTrendPercent(currentAppointments, previousAppointments),
        });
        console.log("Fetching dashboard data...", dashboardData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
      
    };

    
    fetchDashboardData();
  }, [user, isSuperAdmin, userCollege]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const completionRate =
    stats.totalAppointments > 0
      ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
      : 0;

  const pendingRate =
    stats.totalAppointments > 0
      ? Math.round((stats.pendingAppointments / stats.totalAppointments) * 100)
      : 0;

  const currentWeekAppointments = countInRollingWindow(
    data.appointments,
    ["createdAt", "updatedAt", "datetimeISO", "startDate", "date"],
    7,
    0
  );

  const previousWeekAppointments = countInRollingWindow(
    data.appointments,
    ["createdAt", "updatedAt", "datetimeISO", "startDate", "date"],
    14,
    7
  );

  const engagementTrend = getTrendPercent(
    currentWeekAppointments,
    previousWeekAppointments
  );

  const platformHealth =
    completionRate >= 75 && pendingRate <= 25
      ? { label: "Excellent", className: "bg-green-100 text-green-800" }
      : completionRate >= 55 && pendingRate <= 35
        ? { label: "Good", className: "bg-blue-100 text-blue-800" }
        : { label: "Needs Attention", className: "bg-orange-100 text-orange-800" };

  const systemLoad =
    stats.activeAppointments >= 50
      ? { label: "High", className: "bg-red-100 text-red-800" }
      : stats.activeAppointments >= 20
        ? { label: "Moderate", className: "bg-amber-100 text-amber-800" }
        : { label: "Normal", className: "bg-slate-100 text-slate-700" };

  const activityData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const tutorIds = new Set<string>();
    const tuteeIds = new Set<string>();

    data.appointments.forEach((appointment: any) => {
      const appointmentDate = getDocumentDate(appointment, [
        "datetimeISO",
        "startDate",
        "date",
        "createdAt",
        "updatedAt",
      ]);

      if (!appointmentDate) return;
      if (appointmentDate < date || appointmentDate >= nextDate) return;

      if (appointment?.tutorId) {
        tutorIds.add(String(appointment.tutorId));
      }
      if (appointment?.tuteeId) {
        tuteeIds.add(String(appointment.tuteeId));
      }
    });

    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      tutors: tutorIds.size,
      tutees: tuteeIds.size,
    };
  });

  const appointmentData = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date();
    monthDate.setDate(1);
    monthDate.setMonth(monthDate.getMonth() - (5 - index));
    monthDate.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthDate);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const appointments = data.appointments.filter((appointment: any) => {
      const appointmentDate = getDocumentDate(appointment, [
        "datetimeISO",
        "startDate",
        "date",
        "createdAt",
        "updatedAt",
      ]);

      if (!appointmentDate) return false;
      return appointmentDate >= monthDate && appointmentDate < monthEnd;
    }).length;

    return {
      month: monthDate.toLocaleDateString("en-US", { month: "short" }),
      appointments,
    };
  });

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            Welcome back, {user?.firstName || "Admin"}
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers.toLocaleString()}
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{formatTrend(trends.users)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subjects
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSubjects.toLocaleString()}
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{formatTrend(trends.subjects)}</span>
            </div>
          </CardContent>
        </Card>

        {isSuperAdmin ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Colleges
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalColleges.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span className="text-green-600">
                  +{stats.totalDepartments} departments
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Departments
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalDepartments.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span className="text-blue-600">
                  {userCollege && `in ${userCollege}`}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAppointments.toLocaleString()}
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {stats.activeAppointments} active ({formatTrend(trends.appointments)})
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Sessions
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.completedAppointments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAppointments > 0
                ? Math.round(
                    (stats.completedAppointments / stats.totalAppointments) *
                      100
                  )
                : 0}
              % completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Sessions
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pendingAppointments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"></div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Weekly User Activity</CardTitle>
            <CardDescription>
              Daily active tutors and tutees over the past week
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={activityConfig} className="h-[300px] w-full">
              <AreaChart
                data={activityData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <defs>
                  <linearGradient id="fillTutors" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-tutors)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-tutors)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillTutees" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-tutees)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-tutees)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="tutees"
                  type="natural"
                  fill="url(#fillTutees)"
                  fillOpacity={0.4}
                  stroke="var(--color-tutees)"
                  stackId="a"
                />
                <Area
                  dataKey="tutors"
                  type="natural"
                  fill="url(#fillTutors)"
                  fillOpacity={0.4}
                  stroke="var(--color-tutors)"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Monthly Appointments</CardTitle>
            <CardDescription>
              Appointment trends over the past 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={appointmentConfig} className="h-[300px] w-full">
              <BarChart data={appointmentData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="appointments" fill="var(--color-appointments)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>
              Current status of your educational platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Platform Health</span>
              <Badge variant="default" className={platformHealth.className}>
                {platformHealth.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Sessions</span>
              <span className="text-sm text-muted-foreground">
                {stats.activeAppointments} ongoing
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Engagement</span>
              <span
                className={`text-sm ${
                  engagementTrend >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {engagementTrend > 0 ? "+" : ""}
                {engagementTrend}% this week
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Load</span>
              <Badge variant="secondary" className={systemLoad.className}>
                {systemLoad.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Departments</span>
              <span className="text-sm font-bold">
                {stats.totalDepartments}
              </span>
            </div>
            {/* <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tutor-to-Tutee Ratio</span>
              <span className="text-sm font-bold">
                1:{stats.totalTutors > 0 ? Math.round(stats.totalTutees / stats.totalTutors) : 0}
              </span>
            </div> */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Avg. Sessions per User
              </span>
              <span className="text-sm font-bold">
                {stats.totalUsers > 0
                  ? (stats.totalAppointments / stats.totalUsers).toFixed(1)
                  : "0"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Success Rate</span>
              <span className="text-sm font-bold text-green-600">
                {completionRate}
                %
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
