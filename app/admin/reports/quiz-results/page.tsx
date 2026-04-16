"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Download, RotateCcw, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  formatDate,
  findUserById,
  getAdminScope,
  getUserCollegeInformation,
  getUserDisplayName,
  toYmd,
} from "../utils";

type AnyRecord = Record<string, any>;

type QuizRawRow = {
  subject: string;
  college: string;
  department: string;
  appointmentId: string;
  tutorName: string;
  tuteeName: string;
  firstAttemptScore: number | null;
  firstAttemptCompletedAt: string;
  secondAttemptScore: number | null;
  secondAttemptCompletedAt: string;
  scoreChange: number | null;
};

type SubjectQuizSummary = {
  subject: string;
  college: string;
  department: string;
  firstAttemptCount: number;
  secondAttemptCount: number;
  pairedCount: number;
  firstAttemptAverage: number;
  secondAttemptAverage: number;
  averageChange: number;
};

function toNumericScore(value: unknown): number | null {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return numeric;
}

export default function QuizResultsReportPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AnyRecord[]>([]);
  const [users, setUsers] = useState<AnyRecord[]>([]);

  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
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

      const tutor = findUserById(users, apt.tutorId);
      const tutee = findUserById(users, apt.tuteeId);
      const tutorScope = getUserCollegeInformation(tutor);

      const college = String(tutorScope.college || "Unassigned");
      const department = String(tutorScope.department || "Unassigned");
      if (collegeFilter && college !== collegeFilter) return false;
      if (departmentFilter && department !== departmentFilter) return false;

      const searchText = search.trim().toLowerCase();
      if (!searchText) return true;

      const combinedText = [
        String(apt.subject || ""),
        String(apt.messageId || apt._id || ""),
        getUserDisplayName(tutor),
        getUserDisplayName(tutee),
      ]
        .join(" ")
        .toLowerCase();

      return combinedText.includes(searchText);
    });
  }, [scopedAppointments, users, search, collegeFilter, departmentFilter, dateFrom, dateTo]);

  const rawRows = useMemo(() => {
    const rows: QuizRawRow[] = [];

    filteredAppointments.forEach((apt) => {
      const quizAttempts = Array.isArray(apt.quizAttempts) ? apt.quizAttempts : [];
      if (quizAttempts.length === 0) return;

      const tutor = findUserById(users, apt.tutorId);
      const tutee = findUserById(users, apt.tuteeId);
      const tutorScope = getUserCollegeInformation(tutor);

      const firstAttempt = quizAttempts.find((attempt: AnyRecord) => Number(attempt?.attempt) === 1);
      const secondAttempt = quizAttempts.find((attempt: AnyRecord) => Number(attempt?.attempt) === 2);
      const firstScore = toNumericScore(firstAttempt?.score);
      const secondScore = toNumericScore(secondAttempt?.score);

      rows.push({
        subject: String(apt.subject || "Unspecified"),
        college: String(tutorScope.college || "Unassigned"),
        department: String(tutorScope.department || "Unassigned"),
        appointmentId: String(apt.messageId || apt._id || "N/A"),
        tutorName: getUserDisplayName(tutor),
        tuteeName: getUserDisplayName(tutee),
        firstAttemptScore: firstScore,
        firstAttemptCompletedAt: firstAttempt?.completedAt
          ? new Date(firstAttempt.completedAt).toLocaleString()
          : "N/A",
        secondAttemptScore: secondScore,
        secondAttemptCompletedAt: secondAttempt?.completedAt
          ? new Date(secondAttempt.completedAt).toLocaleString()
          : "N/A",
        scoreChange:
          firstScore !== null && secondScore !== null
            ? secondScore - firstScore
            : null,
      });
    });

    rows.sort((a, b) => {
      const aDate = new Date(
        a.secondAttemptCompletedAt !== "N/A" ? a.secondAttemptCompletedAt : a.firstAttemptCompletedAt
      ).getTime();
      const bDate = new Date(
        b.secondAttemptCompletedAt !== "N/A" ? b.secondAttemptCompletedAt : b.firstAttemptCompletedAt
      ).getTime();
      return bDate - aDate;
    });

    return rows;
  }, [filteredAppointments, users]);

  const overallStats = useMemo(() => {
    const firstScores = rawRows
      .map((row) => row.firstAttemptScore)
      .filter((value): value is number => value !== null);
    const secondScores = rawRows
      .map((row) => row.secondAttemptScore)
      .filter((value): value is number => value !== null);
    const paired = rawRows.filter((row) => row.firstAttemptScore !== null && row.secondAttemptScore !== null);

    const firstAverage =
      firstScores.length > 0
        ? firstScores.reduce((sum, value) => sum + value, 0) / firstScores.length
        : 0;
    const secondAverage =
      secondScores.length > 0
        ? secondScores.reduce((sum, value) => sum + value, 0) / secondScores.length
        : 0;
    const averageChange =
      paired.length > 0
        ? paired.reduce((sum, row) => sum + (row.scoreChange || 0), 0) / paired.length
        : 0;

    const improvedCount = paired.filter((row) => (row.scoreChange || 0) > 0).length;
    const declinedCount = paired.filter((row) => (row.scoreChange || 0) < 0).length;
    const unchangedCount = paired.filter((row) => (row.scoreChange || 0) === 0).length;

    return {
      rawRowCount: rawRows.length,
      firstAttemptCount: firstScores.length,
      secondAttemptCount: secondScores.length,
      pairedCount: paired.length,
      firstAverage,
      secondAverage,
      averageChange,
      improvedCount,
      declinedCount,
      unchangedCount,
    };
  }, [rawRows]);

  const subjectSummaryRows = useMemo(() => {
    const map = new Map<
      string,
      {
        subject: string;
        college: string;
        department: string;
        firstAttemptCount: number;
        secondAttemptCount: number;
        pairedCount: number;
        firstAttemptScoreTotal: number;
        secondAttemptScoreTotal: number;
        pairedDeltaTotal: number;
      }
    >();

    rawRows.forEach((row) => {
      const key = [row.subject, row.college, row.department].join("||");

      if (!map.has(key)) {
        map.set(key, {
          subject: row.subject,
          college: row.college,
          department: row.department,
          firstAttemptCount: 0,
          secondAttemptCount: 0,
          pairedCount: 0,
          firstAttemptScoreTotal: 0,
          secondAttemptScoreTotal: 0,
          pairedDeltaTotal: 0,
        });
      }

      const entry = map.get(key)!;

      if (typeof row.firstAttemptScore === "number") {
        entry.firstAttemptCount += 1;
        entry.firstAttemptScoreTotal += row.firstAttemptScore;
      }

      if (typeof row.secondAttemptScore === "number") {
        entry.secondAttemptCount += 1;
        entry.secondAttemptScoreTotal += row.secondAttemptScore;
      }

      if (typeof row.scoreChange === "number") {
        entry.pairedCount += 1;
        entry.pairedDeltaTotal += row.scoreChange;
      }
    });

    return Array.from(map.values())
      .map((entry): SubjectQuizSummary => ({
        subject: entry.subject,
        college: entry.college,
        department: entry.department,
        firstAttemptCount: entry.firstAttemptCount,
        secondAttemptCount: entry.secondAttemptCount,
        pairedCount: entry.pairedCount,
        firstAttemptAverage:
          entry.firstAttemptCount > 0
            ? Number((entry.firstAttemptScoreTotal / entry.firstAttemptCount).toFixed(2))
            : 0,
        secondAttemptAverage:
          entry.secondAttemptCount > 0
            ? Number((entry.secondAttemptScoreTotal / entry.secondAttemptCount).toFixed(2))
            : 0,
        averageChange:
          entry.pairedCount > 0
            ? Number((entry.pairedDeltaTotal / entry.pairedCount).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.pairedCount - a.pairedCount || b.secondAttemptAverage - a.secondAttemptAverage);
  }, [rawRows]);

  const scoreComparisonChartData = useMemo(
    () => [
      {
        name: "Average Score",
        firstAttempt: Number(overallStats.firstAverage.toFixed(2)),
        secondAttempt: Number(overallStats.secondAverage.toFixed(2)),
      },
    ],
    [overallStats]
  );

  const outcomeChartData = useMemo(
    () => [
      { outcome: "Improved", count: overallStats.improvedCount },
      { outcome: "Declined", count: overallStats.declinedCount },
      { outcome: "Unchanged", count: overallStats.unchangedCount },
    ],
    [overallStats]
  );

  const subjectComparisonChartData = useMemo(
    () =>
      subjectSummaryRows.slice(0, 8).map((row) => ({
        subject: row.subject.length > 16 ? `${row.subject.slice(0, 16)}...` : row.subject,
        firstAttemptAverage: row.firstAttemptAverage,
        secondAttemptAverage: row.secondAttemptAverage,
      })),
    [subjectSummaryRows]
  );

  const uniqueColleges = useMemo(() => {
    const values = new Set<string>();
    filteredAppointments.forEach((apt) => {
      const tutor = findUserById(users, apt.tutorId);
      const info = getUserCollegeInformation(tutor);
      values.add(String(info.college || "Unassigned"));
    });
    return Array.from(values).sort();
  }, [filteredAppointments, users]);

  const uniqueDepartments = useMemo(() => {
    const values = new Set<string>();
    filteredAppointments.forEach((apt) => {
      const tutor = findUserById(users, apt.tutorId);
      const info = getUserCollegeInformation(tutor);
      values.add(String(info.department || "Unassigned"));
    });
    return Array.from(values).sort();
  }, [filteredAppointments, users]);

  function clearFilters() {
    setSearch("");
    setCollegeFilter("");
    setDepartmentFilter("");
    setDateFrom("");
    setDateTo("");
  }

  async function handleExportQuizResultsXlsx() {
    await downloadXlsx(
      "overall-quiz-results-report.xlsx",
      "Quiz Results",
      rawRows.map((row) => ({
        Subject: row.subject,
        College: row.college,
        Department: row.department,
        "Appointment ID": row.appointmentId,
        Tutor: row.tutorName,
        Tutee: row.tuteeName,
        "1st Attempt Score": row.firstAttemptScore ?? "N/A",
        "1st Attempt Completed At": row.firstAttemptCompletedAt,
        "2nd Attempt Score": row.secondAttemptScore ?? "N/A",
        "2nd Attempt Completed At": row.secondAttemptCompletedAt,
        "Score Change (2nd - 1st)": row.scoreChange ?? "N/A",
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
          <CardTitle className="text-2xl font-bold">Overall Quiz Results Report</CardTitle>
          <CardDescription>
            Cross-subject view of first and second quiz attempts with overall change metrics and raw attempts.
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
                  placeholder="Search by subject, tutor, tutee, or appointment"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
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
                <Button onClick={handleExportQuizResultsXlsx} disabled={rawRows.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Quiz XLSX
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-800">{overallStats.rawRowCount}</div>
                <div className="text-sm text-blue-700">Appointments with Attempts</div>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-indigo-800">{overallStats.firstAverage.toFixed(1)}%</div>
                <div className="text-sm text-indigo-700">Avg 1st Attempt</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-800">{overallStats.secondAverage.toFixed(1)}%</div>
                <div className="text-sm text-emerald-700">Avg 2nd Attempt</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-800">{overallStats.averageChange > 0 ? "+" : ""}{overallStats.averageChange.toFixed(1)}</div>
                <div className="text-sm text-amber-700">Avg Score Change</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{overallStats.pairedCount}</div>
                <div className="text-sm text-slate-700">Paired Attempts</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Improved: {overallStats.improvedCount}</Badge>
            <Badge variant="secondary">Declined: {overallStats.declinedCount}</Badge>
            <Badge variant="secondary">Unchanged: {overallStats.unchangedCount}</Badge>
            <Badge variant="secondary">Subjects: {subjectSummaryRows.length}</Badge>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Overall Attempt Score Comparison</CardTitle>
                <CardDescription>Average scores across all subjects.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreComparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="firstAttempt" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="secondAttempt" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Overall Change Outcomes</CardTitle>
                <CardDescription>Count of paired attempts by score movement.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={outcomeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="outcome" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Per-Subject Attempt Comparison</CardTitle>
                <CardDescription>Average first vs second attempt score per subject.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectComparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" interval={0} angle={-20} textAnchor="end" height={60} fontSize={12} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="firstAttemptAverage" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="secondAttemptAverage" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">1st Avg</TableHead>
                    <TableHead className="text-right">2nd Avg</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Paired</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectSummaryRows.map((row) => (
                    <TableRow key={`${row.subject}-${row.college}-${row.department}`}>
                      <TableCell className="font-medium">{row.subject}</TableCell>
                      <TableCell className="text-right">{row.firstAttemptAverage.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{row.secondAttemptAverage.toFixed(1)}%</TableCell>
                      <TableCell className={`text-right ${row.averageChange > 0 ? "text-green-700" : row.averageChange < 0 ? "text-rose-700" : "text-slate-700"}`}>
                        {row.averageChange > 0 ? "+" : ""}{row.averageChange.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">{row.pairedCount}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && subjectSummaryRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No subject-level quiz data found for the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Tutee</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead className="text-right">1st Score</TableHead>
                  <TableHead>1st Completed</TableHead>
                  <TableHead className="text-right">2nd Score</TableHead>
                  <TableHead>2nd Completed</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawRows.map((row) => (
                  <TableRow key={`${row.appointmentId}-${row.subject}`}>
                    <TableCell className="font-medium">{row.subject}</TableCell>
                    <TableCell className="font-mono text-xs">{row.appointmentId}</TableCell>
                    <TableCell>{row.tuteeName}</TableCell>
                    <TableCell>{row.tutorName}</TableCell>
                    <TableCell className="text-right">
                      {row.firstAttemptScore === null ? "N/A" : `${row.firstAttemptScore}%`}
                    </TableCell>
                    <TableCell>{row.firstAttemptCompletedAt === "N/A" ? "N/A" : formatDate(row.firstAttemptCompletedAt)}</TableCell>
                    <TableCell className="text-right">
                      {row.secondAttemptScore === null ? "N/A" : `${row.secondAttemptScore}%`}
                    </TableCell>
                    <TableCell>{row.secondAttemptCompletedAt === "N/A" ? "N/A" : formatDate(row.secondAttemptCompletedAt)}</TableCell>
                    <TableCell className={`text-right ${typeof row.scoreChange === "number" ? row.scoreChange > 0 ? "text-green-700" : row.scoreChange < 0 ? "text-rose-700" : "text-slate-700" : "text-slate-500"}`}>
                      {typeof row.scoreChange === "number" ? `${row.scoreChange > 0 ? "+" : ""}${row.scoreChange.toFixed(1)}` : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rawRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No raw quiz attempt data found for the selected filters.
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
