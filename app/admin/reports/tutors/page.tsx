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
  getAdminScope,
  getUserCollegeInformation,
  getUserDisplayName,
  idsMatch,
  normalizeUserId,
  toYmd,
} from "../utils";

type AnyRecord = Record<string, any>;

type TutorRow = {
  tutorId: string;
  tutorName: string;
  college: string;
  department: string;
  bookings: number;
  accepted: number;
  completed: number;
  pending: number;
  completionRate: number;
  avgRating: number;
  subjects: string;
};

export default function TutorReportsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AnyRecord[]>([]);
  const [users, setUsers] = useState<AnyRecord[]>([]);
  const [reviews, setReviews] = useState<AnyRecord[]>([]);

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
        const [appointmentsResult, usersResult, reviewsResult] = await Promise.all([
          getCollectionData("appointments"),
          getCollectionData("users"),
          getCollectionData("reviews"),
        ]);

        setAppointments((appointmentsResult?.data || []) as AnyRecord[]);
        setUsers((usersResult?.data || []) as AnyRecord[]);
        setReviews((reviewsResult?.data || []) as AnyRecord[]);
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
      const info = getUserCollegeInformation(tutor);
      const college = String(info.college || "Unassigned");
      const department = String(info.department || "Unassigned");

      if (collegeFilter && college !== collegeFilter) return false;
      if (departmentFilter && department !== departmentFilter) return false;

      const searchText = search.trim().toLowerCase();
      if (!searchText) return true;

      const tutorName = getUserDisplayName(tutor).toLowerCase();
      const subject = String(apt.subject || "").toLowerCase();
      return tutorName.includes(searchText) || subject.includes(searchText);
    });
  }, [scopedAppointments, users, dateFrom, dateTo, statusFilter, collegeFilter, departmentFilter, search]);

  const tutorRows = useMemo(() => {
    const reviewsByTutor = new Map<string, number[]>();

    reviews.forEach((review) => {
      const tutorKey = normalizeUserId(review.tutorId);
      const rating = Number(review.rating);
      if (!tutorKey || Number.isNaN(rating)) return;

      if (!reviewsByTutor.has(tutorKey)) reviewsByTutor.set(tutorKey, []);
      reviewsByTutor.get(tutorKey)!.push(rating);
    });

    const map = new Map<string, TutorRow & { subjectSet: Set<string> }>();

    filteredAppointments.forEach((apt) => {
      const tutorId = String(apt.tutorId || "unknown");
      const key = normalizeUserId(tutorId) || tutorId;
      const tutor = findUserById(users, apt.tutorId);
      const info = getUserCollegeInformation(tutor);

      if (!map.has(key)) {
        map.set(key, {
          tutorId,
          tutorName: getUserDisplayName(tutor),
          college: String(info.college || "Unassigned"),
          department: String(info.department || "Unassigned"),
          bookings: 0,
          accepted: 0,
          completed: 0,
          pending: 0,
          completionRate: 0,
          avgRating: 0,
          subjects: "",
          subjectSet: new Set<string>(),
        });
      }

      const row = map.get(key)!;
      row.bookings += 1;
      if (apt.status === "accepted") row.accepted += 1;
      if (apt.status === "completed") row.completed += 1;
      if (apt.status === "pending") row.pending += 1;
      if (apt.subject) row.subjectSet.add(String(apt.subject));
    });

    return Array.from(map.values())
      .map((row) => {
        const reviewKey = normalizeUserId(row.tutorId);
        const ratings =
          reviewsByTutor.get(reviewKey) ||
          Array.from(reviewsByTutor.entries()).find(([candidate]) => idsMatch(candidate, row.tutorId))?.[1] ||
          [];

        const avgRating =
          ratings.length > 0
            ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
            : 0;

        const completionRate = row.bookings > 0 ? (row.completed / row.bookings) * 100 : 0;

        return {
          ...row,
          subjects: Array.from(row.subjectSet).sort().join(", "),
          completionRate,
          avgRating,
        };
      })
      .sort((a, b) => b.bookings - a.bookings);
  }, [filteredAppointments, users, reviews]);

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

  const topTutorDemandChart = useMemo(
    () =>
      tutorRows.slice(0, 8).map((row) => ({
        tutor:
          row.tutorName.length > 14
            ? `${row.tutorName.slice(0, 14)}...`
            : row.tutorName,
        bookings: row.bookings,
        completed: row.completed,
      })),
    [tutorRows]
  );

  const qualityTrendChart = useMemo(
    () =>
      tutorRows.slice(0, 8).map((row) => ({
        tutor:
          row.tutorName.length > 14
            ? `${row.tutorName.slice(0, 14)}...`
            : row.tutorName,
        completionRate: Number(row.completionRate.toFixed(1)),
        avgRating: Number(row.avgRating.toFixed(2)),
      })),
    [tutorRows]
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
    await downloadXlsx("tutor-demand-report.xlsx", "Tutor Demand", tutorRows.map((row) => ({
      Tutor: row.tutorName,
      College: row.college,
      Department: row.department,
      Bookings: row.bookings,
      Accepted: row.accepted,
      Completed: row.completed,
      Pending: row.pending,
      "Completion Rate (%)": row.completionRate.toFixed(2),
      "Average Rating": row.avgRating.toFixed(2),
      Subjects: row.subjects,
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
          <CardTitle className="text-2xl font-bold">Tutor Demand Report</CardTitle>
          <CardDescription>
            Top in-demand tutors by booking frequency, completion rate, and rating.
            {!scope.isSuperAdmin && scope.college && (
              <span className="block mt-1 text-blue-600">
                Viewing {scope.college}
                {scope.department && scope.department !== "ALL_DEPARTMENTS" ? ` - ${scope.department}` : " - All departments"}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search tutor or subject"
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
                <Button onClick={handleExportXlsx} disabled={tutorRows.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export XLSX
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Tutors: {tutorRows.length}</Badge>
            <Badge variant="secondary">Bookings: {filteredAppointments.length}</Badge>
          </div>

          <div className="grid gap-4">
            <Card className="border-sky-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Tutor Demand</CardTitle>
                <CardDescription>Bookings and completions by tutor.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topTutorDemandChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tutor" interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* <Card className="border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quality Trend</CardTitle>
                <CardDescription>Completion rate and average rating comparison.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={qualityTrendChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tutor" interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="completionRate" stroke="#4f46e5" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="avgRating" stroke="#f59e0b" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card> */}
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Avg Rating</TableHead>
                  <TableHead>Subjects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tutorRows.map((row) => (
                  <TableRow key={row.tutorId}>
                    <TableCell className="font-medium">{row.tutorName}</TableCell>
                    <TableCell>{row.college}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="text-right">{row.bookings}</TableCell>
                    <TableCell className="text-right">{row.completed}</TableCell>
                    <TableCell className="text-right">{row.completionRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{row.avgRating.toFixed(2)}</TableCell>
                    <TableCell className="max-w-[380px] truncate">{row.subjects || "-"}</TableCell>
                  </TableRow>
                ))}
                {!loading && tutorRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
