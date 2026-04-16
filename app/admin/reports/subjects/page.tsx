"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Download, RotateCcw, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
  getAdminScope,
  getUserCollegeInformation,
  toYmd,
} from "../utils";

type AnyRecord = Record<string, any>;

type SubjectRow = {
  subject: string;
  college: string;
  department: string;
  bookings: number;
  accepted: number;
  completed: number;
  pending: number;
  uniqueTutors: number;
  uniqueTutees: number;
};

export default function SubjectReportsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AnyRecord[]>([]);
  const [users, setUsers] = useState<AnyRecord[]>([]);

  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
      const dateKey = toYmd(apt.datetimeISO || apt.createdAt || new Date());
      if (dateFrom && dateKey < dateFrom) return false;
      if (dateTo && dateKey > dateTo) return false;
      if (statusFilter !== "all" && apt.status !== statusFilter) return false;

      const tutor = findUserById(users, apt.tutorId);
      const tutorScope = getUserCollegeInformation(tutor);

      const subjectText = String(apt.subject || "Unspecified").toLowerCase();
      const searchText = search.trim().toLowerCase();
      const matchesSearch = !searchText || subjectText.includes(searchText);

      const college = String(tutorScope.college || "Unassigned");
      const department = String(tutorScope.department || "Unassigned");
      const matchesCollege = !collegeFilter || college === collegeFilter;
      const matchesDepartment = !departmentFilter || department === departmentFilter;

      return matchesSearch && matchesCollege && matchesDepartment;
    });
  }, [scopedAppointments, users, dateFrom, dateTo, statusFilter, search, collegeFilter, departmentFilter]);

  const subjectRows = useMemo(() => {
    const map = new Map<string, SubjectRow & { tutorIds: Set<string>; tuteeIds: Set<string> }>();

    filteredAppointments.forEach((apt) => {
      const tutor = findUserById(users, apt.tutorId);
      const tutorScope = getUserCollegeInformation(tutor);
      const college = String(tutorScope.college || "Unassigned");
      const department = String(tutorScope.department || "Unassigned");
      const subject = String(apt.subject || "Unspecified");
      const key = [subject, college, department].join("||");

      if (!map.has(key)) {
        map.set(key, {
          subject,
          college,
          department,
          bookings: 0,
          accepted: 0,
          completed: 0,
          pending: 0,
          uniqueTutors: 0,
          uniqueTutees: 0,
          tutorIds: new Set<string>(),
          tuteeIds: new Set<string>(),
        });
      }

      const row = map.get(key)!;
      row.bookings += 1;
      if (apt.status === "accepted") row.accepted += 1;
      if (apt.status === "completed") row.completed += 1;
      if (apt.status === "pending") row.pending += 1;
      if (apt.tutorId) row.tutorIds.add(String(apt.tutorId));
      if (apt.tuteeId) row.tuteeIds.add(String(apt.tuteeId));
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        uniqueTutors: row.tutorIds.size,
        uniqueTutees: row.tuteeIds.size,
      }))
      .sort((a, b) => b.bookings - a.bookings);
  }, [filteredAppointments, users]);

  const uniqueColleges = useMemo(() => {
    const values = new Set<string>();
    scopedAppointments.forEach((apt) => {
      const tutor = findUserById(users, apt.tutorId);
      const info = getUserCollegeInformation(tutor);
      values.add(String(info.college || "Unassigned"));
    });
    return Array.from(values).sort();
  }, [scopedAppointments, users]);

  const uniqueDepartments = useMemo(() => {
    const values = new Set<string>();
    scopedAppointments.forEach((apt) => {
      const tutor = findUserById(users, apt.tutorId);
      const info = getUserCollegeInformation(tutor);
      values.add(String(info.department || "Unassigned"));
    });
    return Array.from(values).sort();
  }, [scopedAppointments, users]);

  const totalBookings = filteredAppointments.length;

  const topSubjectChartData = useMemo(
    () =>
      subjectRows.slice(0, 8).map((row) => ({
        subject:
          row.subject.length > 18 ? `${row.subject.slice(0, 18)}...` : row.subject,
        bookings: row.bookings,
        completed: row.completed,
      })),
    [subjectRows]
  );

  const statusPieData = useMemo(
    () => [
      {
        name: "Pending",
        value: filteredAppointments.filter((row) => row.status === "pending").length,
        color: "#f59e0b",
      },
      {
        name: "Accepted",
        value: filteredAppointments.filter((row) => row.status === "accepted").length,
        color: "#10b981",
      },
      {
        name: "Completed",
        value: filteredAppointments.filter((row) => row.status === "completed").length,
        color: "#2563eb",
      },
      {
        name: "Declined",
        value: filteredAppointments.filter((row) => row.status === "declined").length,
        color: "#f43f5e",
      },
      {
        name: "Cancelled",
        value: filteredAppointments.filter((row) => row.status === "cancelled").length,
        color: "#6b7280",
      },
    ].filter((item) => item.value > 0),
    [filteredAppointments]
  );


  function clearFilters() {
    setSearch("");
    setCollegeFilter("");
    setDepartmentFilter("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  async function handleExportXlsx() {
    await downloadXlsx("subject-demand-report.xlsx", "Subject Demand", subjectRows.map((row) => ({
      Subject: row.subject,
      College: row.college,
      Department: row.department,
      Bookings: row.bookings,
      Accepted: row.accepted,
      Completed: row.completed,
      Pending: row.pending,
      "Unique Tutors": row.uniqueTutors,
      "Unique Tutees": row.uniqueTutees,
    })));
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
          <CardTitle className="text-2xl font-bold">Subject Demand Report</CardTitle>
          <CardDescription>
            Most booked subjects with scoped analytics and Excel-compatible export.
            {!scope.isSuperAdmin && scope.college && (
              <span className="block mt-1 text-blue-600">
                Viewing {scope.college}
                {scope.department && scope.department !== "ALL_DEPARTMENTS" ? ` - ${scope.department}` : " - All departments"}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-800">{totalBookings}</div>
                <div className="text-sm text-blue-700">Filtered Bookings</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-800">{subjectRows.length}</div>
                <div className="text-sm text-emerald-700">Subjects</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-800">{subjectRows.reduce((sum, row) => sum + row.uniqueTutors, 0)}</div>
                <div className="text-sm text-amber-700">Tutor Instances</div>
              </CardContent>
            </Card>
            <Card className="bg-violet-50 border-violet-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-violet-800">{subjectRows.reduce((sum, row) => sum + row.uniqueTutees, 0)}</div>
                <div className="text-sm text-violet-700">Tutee Instances</div>
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
              <Select value={collegeFilter || "all"} onValueChange={(value) => setCollegeFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-full md:w-[210px]">
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
                <SelectTrigger className="w-full md:w-[230px]">
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

            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-[180px]" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-[180px]" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleExportXlsx} disabled={subjectRows.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export XLSX
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Rows: {subjectRows.length}</Badge>
            <Badge variant="secondary">Bookings: {totalBookings}</Badge>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Subjects by Bookings</CardTitle>
                <CardDescription>Quick view of demand concentration.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSubjectChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" interval={0} angle={-20} textAnchor="end" height={60} fontSize={12} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status Mix</CardTitle>
                <CardDescription>Distribution of filtered bookings.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPieData} dataKey="value" nameKey="name" outerRadius={95}>
                        {statusPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Tutors</TableHead>
                  <TableHead className="text-right">Tutees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjectRows.map((row) => (
                  <TableRow key={`${row.subject}-${row.college}-${row.department}`}>
                    <TableCell className="font-medium">{row.subject}</TableCell>
                    <TableCell>{row.college}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="text-right">{row.bookings}</TableCell>
                    <TableCell className="text-right">{row.accepted}</TableCell>
                    <TableCell className="text-right">{row.completed}</TableCell>
                    <TableCell className="text-right">{row.pending}</TableCell>
                    <TableCell className="text-right">{row.uniqueTutors}</TableCell>
                    <TableCell className="text-right">{row.uniqueTutees}</TableCell>
                  </TableRow>
                ))}
                {!loading && subjectRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
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
