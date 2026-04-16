export type AdminScope = {
  isSuperAdmin: boolean;
  college?: string;
  department?: string;
};

type AnyRecord = Record<string, any>;

export function getAdminScope(user: AnyRecord | null | undefined): AdminScope {
  const metadata = (user?.publicMetadata || {}) as AnyRecord;
  const collegeInfo = (metadata.collegeInformation || {}) as AnyRecord;

  const college =
    (collegeInfo.college as string | undefined) ||
    (metadata.college as string | undefined);
  const department =
    (collegeInfo.department as string | undefined) ||
    (metadata.department as string | undefined);

  return {
    isSuperAdmin: metadata.isAdmin === true && metadata.adminRole === "superadmin",
    college,
    department,
  };
}

export function getUserCollegeInformation(user: AnyRecord | null | undefined): {
  college?: string;
  department?: string;
} {
  if (!user) return {};

  const metaFromSnake = (user.public_metadata || {}) as AnyRecord;
  const metaFromCamel = (user.publicMetadata || {}) as AnyRecord;
  const fromNested =
    (metaFromSnake.collegeInformation as AnyRecord) ||
    (metaFromCamel.collegeInformation as AnyRecord) ||
    {};

  return {
    college:
      (fromNested.college as string | undefined) ||
      (metaFromSnake.college as string | undefined) ||
      (metaFromCamel.college as string | undefined),
    department:
      (fromNested.department as string | undefined) ||
      (metaFromSnake.department as string | undefined) ||
      (metaFromCamel.department as string | undefined),
  };
}

export function normalizeUserId(value: unknown): string {
  return String(value || "").replace(/^user_/, "").trim().toLowerCase();
}

export function idsMatch(left: unknown, right: unknown): boolean {
  const l = normalizeUserId(left);
  const r = normalizeUserId(right);
  return Boolean(l) && Boolean(r) && l === r;
}

export function findUserById(users: AnyRecord[], id: unknown): AnyRecord | undefined {
  return users.find((u) =>
    [u?.id, u?._id, u?.userId, u?.external_id, u?.externalId].some((candidate) =>
      idsMatch(candidate, id)
    )
  );
}

export function userInScope(
  collegeInfo: { college?: string; department?: string },
  scope: AdminScope
): boolean {
  if (scope.isSuperAdmin) return true;

  if (!scope.college && !scope.department) {
    return true;
  }

  if (scope.college && collegeInfo.college !== scope.college) {
    return false;
  }

  if (
    scope.department &&
    scope.department !== "ALL_DEPARTMENTS" &&
    collegeInfo.department !== scope.department
  ) {
    return false;
  }

  return true;
}

export function filterAppointmentsByScope(
  appointments: AnyRecord[],
  users: AnyRecord[],
  scope: AdminScope
): AnyRecord[] {
  if (scope.isSuperAdmin) return appointments;

  return appointments.filter((apt) => {
    const tutor = findUserById(users, apt?.tutorId);
    const tutee = findUserById(users, apt?.tuteeId);

    const tutorScope = userInScope(getUserCollegeInformation(tutor), scope);
    const tuteeScope = userInScope(getUserCollegeInformation(tutee), scope);

    return tutorScope || tuteeScope;
  });
}

export function getUserDisplayName(user: AnyRecord | undefined): string {
  if (!user) return "Unknown";

  const firstName = (user.firstName as string | undefined) || "";
  const lastName = (user.lastName as string | undefined) || "";
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) return fullName;
  if (user.username) return String(user.username);

  const email =
    user.emailAddresses?.[0]?.emailAddress ||
    user.email_addresses?.[0]?.email_address ||
    user.email ||
    "Unknown";

  return String(email);
}

export function formatDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

export function toYmd(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0 || typeof window === "undefined") return;

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadXlsx(
  filename: string,
  sheetName: string,
  rows: Record<string, unknown>[]
) {
  if (rows.length === 0 || typeof window === "undefined") return;

  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFileXLSX(workbook, filename);
}
