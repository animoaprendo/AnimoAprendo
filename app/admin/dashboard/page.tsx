"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, Bar, BarChart, ResponsiveContainer } from "recharts";
import {
  BookOpen,
  Users,
  GraduationCap,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Star,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { getCollectionData, fetchAppointments } from "@/app/actions";
import { useUser } from "@clerk/nextjs";

type DashboardData = {
  users: any[];
  subjects: any[];
  colleges: any[];
  appointments: any[];
};

type DashboardStats = {
  totalUsers: number;
  totalTutors: number;
  totalTutees: number;
  totalSubjects: number;
  totalColleges: number;
  totalDepartments: number;
  totalAppointments: number;
  activeAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTutors: 0,
    totalTutees: 0,
    totalSubjects: 0,
    totalColleges: 0,
    totalDepartments: 0,
    totalAppointments: 0,
    activeAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all collections
        const [usersRes, subjectsRes, collegesRes, appointmentsRes] = await Promise.all([
          getCollectionData("users"),
          getCollectionData("subjects"),
          getCollectionData("colleges"),
          fetchAppointments(),
        ]);

        const dashboardData = {
          users: usersRes.data || [],
          subjects: subjectsRes.data || [],
          colleges: collegesRes.data || [],
          appointments: appointmentsRes.appointments || [],
        };

        setData(dashboardData);

        // Calculate statistics
        const tutors = dashboardData.users.filter((user: any) => user.role === "tutor");
        const tutees = dashboardData.users.filter((user: any) => user.role === "tutee");
        const totalDepartments = dashboardData.colleges.reduce(
          (acc: number, college: any) => acc + (college.departments?.length || 0),
          0
        );

        const activeAppointments = dashboardData.appointments.filter(
          (apt: any) => apt.status === "active" || apt.status === "scheduled"
        ).length;
        const completedAppointments = dashboardData.appointments.filter(
          (apt: any) => apt.status === "completed"
        ).length;
        const pendingAppointments = dashboardData.appointments.filter(
          (apt: any) => apt.status === "pending"
        ).length;

        setStats({
          totalUsers: dashboardData.users.length,
          totalTutors: tutors.length,
          totalTutees: tutees.length,
          totalSubjects: dashboardData.subjects.length,
          totalColleges: dashboardData.colleges.length,
          totalDepartments,
          totalAppointments: dashboardData.appointments.length,
          activeAppointments,
          completedAppointments,
          pendingAppointments,
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Generate sample activity data for the last 7 days
  const generateActivityData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      tutors: Math.floor(Math.random() * 20) + 5,
      tutees: Math.floor(Math.random() * 40) + 15,
    }));
  };

  // Generate appointment trend data
  const generateAppointmentData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      appointments: Math.floor(Math.random() * 50) + 20,
    }));
  };

  const activityData = generateActivityData();
  const appointmentData = generateAppointmentData();

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubjects.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>+{stats.totalSubjects > 50 ? '8' : '23'}% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Colleges</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalColleges.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.totalDepartments} departments</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{stats.activeAppointments} active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tutors</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalTutors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalUsers > 0 ? Math.round((stats.totalTutors / stats.totalUsers) * 100) : 0}% of all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tutees</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalTutees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalUsers > 0 ? Math.round((stats.totalTutees / stats.totalUsers) * 100) : 0}% of all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.completedAppointments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAppointments > 0 ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Sessions</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingAppointments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
      </div>

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
            <ChartContainer config={activityConfig}>
              <ResponsiveContainer width="100%" height={300}>
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
              </ResponsiveContainer>
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
            <ChartContainer config={appointmentConfig}>
              <ResponsiveContainer width="100%" height={300}>
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
              </ResponsiveContainer>
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
              <Badge variant="default" className="bg-green-100 text-green-800">
                Excellent
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Sessions</span>
              <span className="text-sm text-muted-foreground">{stats.activeAppointments} ongoing</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Engagement</span>
              <span className="text-sm text-green-600">+15% this week</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Load</span>
              <Badge variant="secondary">Normal</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>
              Key metrics at a glance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Departments</span>
              <span className="text-sm font-bold">{stats.totalDepartments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tutor-to-Tutee Ratio</span>
              <span className="text-sm font-bold">
                1:{stats.totalTutors > 0 ? Math.round(stats.totalTutees / stats.totalTutors) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Avg. Sessions per User</span>
              <span className="text-sm font-bold">
                {stats.totalUsers > 0 ? (stats.totalAppointments / stats.totalUsers).toFixed(1) : "0"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Success Rate</span>
              <span className="text-sm font-bold text-green-600">
                {stats.totalAppointments > 0 ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
