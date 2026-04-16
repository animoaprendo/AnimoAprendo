"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Download, RotateCcw, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getCollectionData } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  downloadXlsx,
  filterAppointmentsByScope,
  findUserById,
  formatDate,
  getAdminScope,
  getUserCollegeInformation,
  toYmd,
} from "../utils";

type AnyRecord = Record<string, any>;

type TrendRow = {
  period: string;
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  declined: number;
  cancelled: number;
};

function toPeriodKey(value: string, granularity: "day" | "month") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  if (granularity === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  return toYmd(date);
}

export default function BookingTrendReportsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AnyRecord[]>([]);
  const [users, setUsers] = useState<AnyRecord[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [granularity, setGranularity] = useState<"day" | "month">("day");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const scope = getAdminScope(user as AnyRecord | undefined);

  useEffect(() => {
    if (!user?.publicMetadata?.isAdmin) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [appointmentsResult, usersResult] = await Promise.all([
          getCollectionData("appointments"),
          getCollectionData("users"),
        ]);

        setAppointments((appointmentsResult?.data || []) as AnyRecord[]);
        setUsers((usersResult?.data || []) as AnyRecord[]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const scopedAppointments = useMemo(
    () => filterAppointmentsByScope(appointments, users, scope),
    [appointments, users, scope]
  );

  const filteredAppointments = useMemo(() => {
    return scopedAppointments.filter((apt) => {
      const tutor = findUserById(users, apt.tutorId);
      const info = getUserCollegeInformation(tutor);
      const college = String(info.college || "Unassigned");
      const department = String(info.department || "Unassigned");

      const dateKey = toYmd(apt.datetimeISO || apt.createdAt || new Date());
      if (dateFrom && dateKey < dateFrom) return false;
      if (dateTo && dateKey > dateTo) return false;
      if (statusFilter !== "all" && apt.status !== statusFilter) return false;
      if (modeFilter !== "all" && apt.mode !== modeFilter) return false;
      if (collegeFilter && college !== collegeFilter) return false;
      if (departmentFilter && department !== departmentFilter) return false;

      const searchText = search.trim().toLowerCase();
      if (!searchText) return true;

      const subject = String(apt.subject || "").toLowerCase();
      return subject.includes(searchText);
    });
  }, [
    scopedAppointments,
    users,
    dateFrom,
    dateTo,
    statusFilter,
    modeFilter,
    collegeFilter,
    departmentFilter,
    search,
  ]);

  const trendRows = useMemo(() => {
    const map = new Map<string, TrendRow>();

    filteredAppointments.forEach((apt) => {
      const period = toPeriodKey(apt.datetimeISO || apt.createdAt || new Date().toISOString(), granularity);

      if (!map.has(period)) {
        map.set(period, {
          period,
          total: 0,
          pending: 0,
          accepted: 0,
          completed: 0,
          declined: 0,
          cancelled: 0,
        });
      }

      const row = map.get(period)!;
      row.total += 1;

      if (apt.status === "pending") row.pending += 1;
      if (apt.status === "accepted") row.accepted += 1;
      if (apt.status === "completed") row.completed += 1;
      if (apt.status === "declined") row.declined += 1;
      if (apt.status === "cancelled") row.cancelled += 1;
    });

    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [filteredAppointments, granularity]);

  const uniqueColleges = useMemo(() => {
    const values = new Set<string>();
    scopedAppointments.forEach((apt) => {
      const tutor = findUserById(users, apt.tutorId);
      values.add(String(getUserCollegeInformation(tutor).college || "Unassigned"));
    });
    return Array.from(values).sort();
  }, [scopedAppointments, users]);

  const uniqueDepartments = useMemo(() => {
    const values = new Set<string>();
    scopedAppointments.forEach((apt) => {
      const tutor = findUserById(users, apt.tutorId);
      values.add(String(getUserCollegeInformation(tutor).department || "Unassigned"));
    });
    return Array.from(values).sort();
  }, [scopedAppointments, users]);

  const statusSummary = useMemo(() => {
    return {
      total: filteredAppointments.length,
      pending: filteredAppointments.filter((row) => row.status === "pending").length,
      accepted: filteredAppointments.filter((row) => row.status === "accepted").length,
      completed: filteredAppointments.filter((row) => row.status === "completed").length,
      declined: filteredAppointments.filter((row) => row.status === "declined").length,
      cancelled: filteredAppointments.filter((row) => row.status === "cancelled").length,
    };
  }, [filteredAppointments]);

  const trendChartData = useMemo(
    () =>
      trendRows.map((row) => ({
        period: row.period,
        total: row.total,
        completed: row.completed,
        pending: row.pending,
      })),
    [trendRows]
  );

  const statusBreakdownData = useMemo(
    () => [
      { status: "Pending", value: statusSummary.pending },
      { status: "Accepted", value: statusSummary.accepted },
      { status: "Completed", value: statusSummary.completed },
      { status: "Declined", value: statusSummary.declined },
      { status: "Cancelled", value: statusSummary.cancelled },
    ],
    [statusSummary]
  );

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setModeFilter("all");
    setCollegeFilter("");
    setDepartmentFilter("");
    setGranularity("day");
    setDateFrom("");
    setDateTo("");
  }

  async function handleExportXlsx() {
    await downloadXlsx(
      "booking-trend-report.xlsx",
      "Booking Trends",
      trendRows.map((row) => ({
        Period: row.period,
        Total: row.total,
        Pending: row.pending,
        Accepted: row.accepted,
        Completed: row.completed,
        Declined: row.declined,
        Cancelled: row.cancelled,
      }))
    );
  }

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
            <div className="text-muted-foreground mt-2">You do not have permission to access this report.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Booking Trends Report</CardTitle>
          <CardDescription>
            Appointment frequency trend with status distribution and scoped filtering.
            {!scope.isSuperAdmin && scope.college && (
              <span className="block mt-1 text-blue-600">
                Viewing {scope.college}
                {scope.department && scope.department !== "ALL_DEPARTMENTS" ? ` - ${scope.department}` : " - All departments"}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-blue-800">{statusSummary.total}</div>
                <div className="text-xs text-blue-700">Total</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-yellow-800">{statusSummary.pending}</div>
                <div className="text-xs text-yellow-700">Pending</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-green-800">{statusSummary.accepted}</div>
                <div className="text-xs text-green-700">Accepted</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-emerald-800">{statusSummary.completed}</div>
                <div className="text-xs text-emerald-700">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-rose-50 border-rose-200">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-rose-800">{statusSummary.declined}</div>
                <div className="text-xs text-rose-700">Declined</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-50 border-zinc-200">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-zinc-800">{statusSummary.cancelled}</div>
                <div className="text-xs text-zinc-700">Cancelled</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search subject"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="in-person">In-person</SelectItem>
                </SelectContent>
              </Select>
              <Select value={granularity} onValueChange={(value) => setGranularity(value as "day" | "month")}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Granularity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex flex-wrap gap-3">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-[180px]" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-[180px]" />
                <Select value={collegeFilter || "all"} onValueChange={(value) => setCollegeFilter(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-full sm:w-[210px]">
                    <SelectValue placeholder="College" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colleges</SelectItem>
                    {uniqueColleges.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={departmentFilter || "all"} onValueChange={(value) => setDepartmentFilter(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepartments.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleExportXlsx} disabled={trendRows.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export XLSX
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Periods: {trendRows.length}</Badge>
            <Badge variant="secondary">Range: {dateFrom || "any"} to {dateTo || "any"}</Badge>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Trend Over Time</CardTitle>
                <CardDescription>Volume of bookings across selected periods.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status Distribution</CardTitle>
                <CardDescription>Current filtered booking statuses.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBreakdownData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{granularity === "day" ? "Date" : "Month"}</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Declined</TableHead>
                  <TableHead className="text-right">Cancelled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendRows.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="font-medium">
                      {granularity === "day" && row.period !== "Unknown" ? formatDate(row.period) : row.period}
                    </TableCell>
                    <TableCell className="text-right">{row.total}</TableCell>
                    <TableCell className="text-right">{row.pending}</TableCell>
                    <TableCell className="text-right">{row.accepted}</TableCell>
                    <TableCell className="text-right">{row.completed}</TableCell>
                    <TableCell className="text-right">{row.declined}</TableCell>
                    <TableCell className="text-right">{row.cancelled}</TableCell>
                  </TableRow>
                ))}
                {!loading && trendRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No records found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
