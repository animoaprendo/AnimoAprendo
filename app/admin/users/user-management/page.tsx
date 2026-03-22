"use client";

import { getCollectionData } from "@/app/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

type User = {
  id: string;
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  emailAddresses: { emailAddress: string }[];
  imageUrl?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastSignInAt?: string;
  onboarded?: boolean;
  publicMetadata?: any; // Include publicMetadata to access collegeInformation
};

type UserStats = {
  totalAppointments: number;
  completedAppointments: number;
  averageRating: number;
  activeChats: number;
  subjects?: string[];
  debug?: {
    userIdCandidates: string[];
    rawIdentityFields: string[];
    matchedAppointmentIds: string[];
    completedAppointmentIds: string[];
    activeAppointmentIds: string[];
    matchedReviewIds: string[];
    ratingReviewerType: "tutee" | "tutor";
    tutorReceivedReviewIds: string[];
    tuteeReceivedReviewIds: string[];
    resolvedRatingSource: "tutor-received" | "tutee-received" | "none";
  };
};

type UserWithStats = User & {
  stats: UserStats;
};

type SortField =
  | "name"
  | "role"
  | "status"
  | "appointments"
  | "rating"
  | "lastActive";
type SortDirection = "asc" | "desc";

export default function UserManagement() {
  const { user } = useUser();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Check if user is superadmin
  const isSuperAdmin =
    user?.publicMetadata?.isAdmin === true &&
    user?.publicMetadata?.adminRole === "superadmin";
  const adminCollegeInfo = (user?.publicMetadata as any)?.collegeInformation;
  const userCollege =
    adminCollegeInfo?.college ||
    ((user?.publicMetadata as any)?.college as string | undefined);
  const userDepartment =
    adminCollegeInfo?.department ||
    ((user?.publicMetadata as any)?.department as string | undefined);

  const [overallStats, setOverallStats] = useState({
    totalUsers: 0,
    totalTutors: 0,
    totalTutees: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
  });

  useEffect(() => {
    // Only fetch data if user is an admin
    if (user?.publicMetadata?.isAdmin) {
      fetchUserData();
    }
  }, [user, isSuperAdmin, userCollege, userDepartment]);

  useEffect(() => {
    filterUsers();
  }, [
    users,
    searchTerm,
    roleFilter,
    statusFilter,
    sortField,
    sortDirection,
    isSuperAdmin,
    userCollege,
    userDepartment,
  ]);

  const normalizeUserId = (value: unknown) =>
    String(value || "").replace(/^user_/, "").trim().toLowerCase();

  const toRecord = (value: any): Record<string, any> =>
    value && typeof value === "object" ? (value as Record<string, any>) : {};

  const unwrapUserPayload = (rawUser: any) => {
    const root = toRecord(rawUser);
    const data = toRecord(root.data);
    const payload = Object.keys(data).length > 0 ? data : root;
    return { root, payload };
  };

  const buildUserIdCandidates = (rawUser: any) => {
    const { root, payload } = unwrapUserPayload(rawUser);

    const rawIdentityFields = [
      payload?.id,
      root?.id,
      payload?._id,
      root?._id,
      payload?.userId,
      root?.userId,
      payload?.external_id,
      payload?.externalId,
      payload?.clerkId,
      root?.external_id,
      root?.externalId,
      root?.clerkId,
      payload?.public_metadata?.userId,
      payload?.public_metadata?.clerkId,
      payload?.publicMetadata?.userId,
      payload?.publicMetadata?.clerkId,
      root?.public_metadata?.userId,
      root?.public_metadata?.clerkId,
      root?.publicMetadata?.userId,
      root?.publicMetadata?.clerkId,
      payload?.primaryEmailAddress?.id,
      root?.primaryEmailAddress?.id,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const rawCandidates = [...rawIdentityFields];

    const emailCandidates = [
      ...(Array.isArray(payload?.email_addresses) ? payload.email_addresses : []),
      ...(Array.isArray(payload?.emailAddresses) ? payload.emailAddresses : []),
      ...(Array.isArray(root?.email_addresses) ? root.email_addresses : []),
      ...(Array.isArray(root?.emailAddresses) ? root.emailAddresses : []),
    ]
      .map((entry: any) =>
        String(entry?.email_address || entry?.emailAddress || "").trim().toLowerCase()
      )
      .filter(Boolean);

    const usernameCandidate = String(payload?.username || root?.username || "").trim().toLowerCase();

    const extraCandidates = [
      ...emailCandidates,
      usernameCandidate,
    ].filter(Boolean);

    rawCandidates.push(...extraCandidates);

    const normalized = rawCandidates.map((value) => normalizeUserId(value)).filter(Boolean);

    const candidates = new Set(
      [
        ...rawCandidates,
        ...normalized,
        ...normalized.map((value) => `user_${value}`),
      ].map((value) => String(value || "").trim())
    );

    return {
      candidates,
      rawIdentityFields,
    };
  };

  const matchesUserByCandidates = (value: unknown, candidates: Set<string>) => {
    const raw = String(value || "").trim();
    if (!raw) return false;
    const normalized = normalizeUserId(raw);

    return candidates.has(raw) || candidates.has(normalized) || candidates.has(`user_${normalized}`);
  };

  const getRole = (rawUser: any): "tutor" | "tutee" => {
    const { root, payload } = unwrapUserPayload(rawUser);
    const role = String(
      payload?.role ||
        root?.role ||
        payload?.public_metadata?.role ||
        payload?.publicMetadata?.role ||
        root?.public_metadata?.role ||
        root?.publicMetadata?.role ||
        "tutee"
    ).toLowerCase();

    return role === "tutor" ? "tutor" : "tutee";
  };

  const getCollegeInformation = (rawUser: any) =>
    unwrapUserPayload(rawUser).payload?.public_metadata?.collegeInformation ||
    unwrapUserPayload(rawUser).payload?.publicMetadata?.collegeInformation ||
    unwrapUserPayload(rawUser).root?.public_metadata?.collegeInformation ||
    unwrapUserPayload(rawUser).root?.publicMetadata?.collegeInformation ||
    {};

  const formatIsoDate = (value: any) => {
    if (!value) return new Date().toISOString();
    if (typeof value === "string") return value;
    if (typeof value === "number") return new Date(value).toISOString();
    return new Date(value).toISOString();
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch full datasets for accurate admin stats.
      const [usersResponse, appointmentsResponse, reviewsResponse, subjectsResponse] = await Promise.all([
        getCollectionData("users"),
        getCollectionData("appointments"),
        getCollectionData("reviews"),
        getCollectionData("subjects"),
      ]);

      const usersData = usersResponse?.data || [];
      const appointmentsData = appointmentsResponse?.data || [];
      const reviewsData = reviewsResponse?.data || [];
      const subjectsData = subjectsResponse?.data || [];

      // Filter out admin users (focusing on regular users only)
      // Make filtering more flexible to catch users regardless of data structure
      const regularUsers = usersData.filter((user: any) => {
        const isAdmin =
          user.public_metadata?.isAdmin === true ||
          user.publicMetadata?.isAdmin === true;
        const hasRole = getRole(user);

        return (
          !isAdmin && (hasRole === "tutor" || hasRole === "tutee")
        );
      });

      // If no regular users found, show all users as fallback
      const usersToProcess = regularUsers.length > 0 ? regularUsers : usersData;

      // Calculate statistics for each user
      const usersWithStats: UserWithStats[] = await Promise.all(
        usersToProcess.map(async (user: any) => {
          const { root, payload } = unwrapUserPayload(user);
          const { candidates: userIdCandidates, rawIdentityFields } = buildUserIdCandidates(user);

          const userAppointments = appointmentsData.filter(
            (apt: any) =>
              matchesUserByCandidates(apt.tutorId, userIdCandidates) ||
              matchesUserByCandidates(apt.tuteeId, userIdCandidates)
          );

          const completedAppointments = userAppointments.filter(
            (apt: any) =>
              String(apt?.status || "").trim().toLowerCase() === "completed"
          );

          const role = getRole(user);

          const tutorReceivedReviews = reviewsData.filter(
            (review: any) =>
              String(review?.reviewerType || "").toLowerCase() === "tutee" &&
              matchesUserByCandidates(review?.tutorId, userIdCandidates)
          );

          const tuteeReceivedReviews = reviewsData.filter(
            (review: any) =>
              String(review?.reviewerType || "").toLowerCase() === "tutor" &&
              matchesUserByCandidates(review?.tuteeId, userIdCandidates)
          );

          const averageFrom = (items: any[]) => {
            if (items.length === 0) return 0;
            const total = items.reduce(
              (sum: number, review: any) => sum + Number(review?.rating || 0),
              0
            );
            return total / items.length;
          };

          const tutorReceivedAverage = averageFrom(tutorReceivedReviews);
          const tuteeReceivedAverage = averageFrom(tuteeReceivedReviews);

          let matchedRatingReviews: any[] = [];
          let resolvedRatingSource: "tutor-received" | "tutee-received" | "none" = "none";

          if (role === "tutor") {
            if (tutorReceivedReviews.length > 0) {
              matchedRatingReviews = tutorReceivedReviews;
              resolvedRatingSource = "tutor-received";
            } else if (tuteeReceivedReviews.length > 0) {
              // Role metadata can be stale; use available data as fallback.
              matchedRatingReviews = tuteeReceivedReviews;
              resolvedRatingSource = "tutee-received";
            }
          } else {
            if (tuteeReceivedReviews.length > 0) {
              matchedRatingReviews = tuteeReceivedReviews;
              resolvedRatingSource = "tutee-received";
            } else if (tutorReceivedReviews.length > 0) {
              matchedRatingReviews = tutorReceivedReviews;
              resolvedRatingSource = "tutor-received";
            }
          }

          const averageRating =
            resolvedRatingSource === "tutor-received"
              ? tutorReceivedAverage
              : resolvedRatingSource === "tutee-received"
              ? tuteeReceivedAverage
              : 0;

          // Get user's subjects if they're a tutor
          let subjects: string[] = [];
          if (role === "tutor") {
            const tutorSubjects = subjectsData.filter(
              (subject: any) =>
                matchesUserByCandidates(subject?.userId, userIdCandidates) &&
                String(subject?.status || "").toLowerCase() === "available"
            );

            subjects = Array.from(
              new Set(
                tutorSubjects
                  .map((subject: any) => String(subject?.subject || "").trim())
                  .filter(Boolean)
              )
            );
          }

          const stats: UserStats = {
            totalAppointments: userAppointments.length,
            completedAppointments: completedAppointments.length,
            averageRating: Number.isFinite(averageRating)
              ? Number(averageRating.toFixed(1))
              : 0,
            activeChats: userAppointments.filter((apt: any) =>
              ["pending", "accepted"].includes(String(apt?.status || "").toLowerCase())
            ).length,
            subjects,
            debug: {
              userIdCandidates: Array.from(userIdCandidates.values()),
              rawIdentityFields,
              matchedAppointmentIds: userAppointments.map((apt: any) =>
                String(apt?._id || apt?.messageId || "unknown")
              ),
              completedAppointmentIds: completedAppointments.map((apt: any) =>
                String(apt?._id || apt?.messageId || "unknown")
              ),
              activeAppointmentIds: userAppointments
                .filter((apt: any) =>
                  ["pending", "accepted"].includes(
                    String(apt?.status || "").toLowerCase()
                  )
                )
                .map((apt: any) => String(apt?._id || apt?.messageId || "unknown")),
              matchedReviewIds: matchedRatingReviews.map((review: any) =>
                String(review?._id || "unknown")
              ),
              ratingReviewerType: role === "tutor" ? "tutee" : "tutor",
              tutorReceivedReviewIds: tutorReceivedReviews.map((review: any) =>
                String(review?._id || "unknown")
              ),
              tuteeReceivedReviewIds: tuteeReceivedReviews.map((review: any) =>
                String(review?._id || "unknown")
              ),
              resolvedRatingSource,
            },
          };

          const firstName =
            payload.firstName || payload.first_name || payload.given_name || root.firstName || root.first_name || "Unknown";
          const lastName =
            payload.lastName || payload.last_name || payload.family_name || root.lastName || root.last_name || "";

          const rawEmailList =
            payload.emailAddresses ||
            payload.email_addresses ||
            root.emailAddresses ||
            root.email_addresses ||
            (payload.primaryEmailAddress ? [payload.primaryEmailAddress] : []) ||
            (root.primaryEmailAddress ? [root.primaryEmailAddress] : []);

          const normalizedEmailAddresses = Array.isArray(rawEmailList)
            ? rawEmailList
                .map((entry: any) => ({
                  emailAddress: entry?.emailAddress || entry?.email_address || "",
                }))
                .filter((entry) => entry.emailAddress)
            : [];

          const publicMetadata =
            payload.public_metadata ||
            payload.publicMetadata ||
            root.public_metadata ||
            root.publicMetadata ||
            {};

          const mappedId =
            payload.id ||
            root.id ||
            payload.userId ||
            root.userId ||
            String(payload._id || root._id || "");

          const debugCandidates = new Set([
            ...Array.from(userIdCandidates.values()),
            String(mappedId || "").trim(),
            normalizeUserId(mappedId),
          ].filter(Boolean));

          return {
            id: String(mappedId || ""),
            _id: String(payload._id || root._id || mappedId || ""),
            firstName,
            lastName,
            username:
              payload.username ||
              root.username ||
              normalizedEmailAddresses?.[0]?.emailAddress?.split("@")[0] ||
              "user",
            emailAddresses: normalizedEmailAddresses,
            imageUrl:
              payload.imageUrl ||
              payload.image_url ||
              payload.profileImageUrl ||
              root.imageUrl ||
              root.image_url ||
              root.profileImageUrl,
            role,
            createdAt: formatIsoDate(payload.createdAt || payload.created_at || root.createdAt || root.created_at),
            updatedAt: formatIsoDate(payload.updatedAt || payload.updated_at || payload.lastUpdatedAt || root.updatedAt || root.updated_at || root.lastUpdatedAt),
            lastSignInAt:
              payload.lastSignInAt ||
              payload.last_sign_in_at ||
              payload.lastActiveAt ||
              root.lastSignInAt ||
              root.last_sign_in_at ||
              root.lastActiveAt,
            onboarded:
              payload.onboarded !== false &&
              publicMetadata?.onboarded !== false,
            publicMetadata, // Preserve normalized metadata including collegeInformation
            stats: {
              totalAppointments: stats.totalAppointments,
              completedAppointments: stats.completedAppointments,
              averageRating: stats.averageRating,
              activeChats: stats.activeChats,
              subjects: stats.subjects,
              debug: {
                ...stats.debug,
                userIdCandidates: Array.from(debugCandidates.values()),
                rawIdentityFields:
                  rawIdentityFields.length > 0
                    ? rawIdentityFields
                    : [
                        String(payload.id || "").trim(),
                        String(root.id || "").trim(),
                        String(payload._id || "").trim(),
                        String(root._id || "").trim(),
                        normalizedEmailAddresses?.[0]?.emailAddress || "",
                      ].filter(Boolean),
              },
            },
          } as UserWithStats;
        })
      );

      setUsers(usersWithStats);

      // Apply admin role-based filtering for statistics
      let statsUsers = usersWithStats;
      if (!isSuperAdmin && (userCollege || userDepartment)) {
        statsUsers = usersWithStats.filter((user) => {
          // Get user's college and department information
          const userCollegeInfo = (user as any).publicMetadata
            ?.collegeInformation;
          const userCollegeName = userCollegeInfo?.college;
          const userDepartmentName = userCollegeInfo?.department;

          // If admin has a specific college, only show users from that college
          if (userCollege && userCollegeName !== userCollege) {
            return false;
          }

          // If admin has a specific department (not ALL_DEPARTMENTS), only show users from that department
          if (
            userDepartment &&
            userDepartment !== "ALL_DEPARTMENTS" &&
            userDepartmentName !== userDepartment
          ) {
            return false;
          }

          return true;
        });
      }

      // Calculate overall statistics from filtered users
      const tutors = statsUsers.filter((user) => user.role === "tutor");
      const tutees = statsUsers.filter((user) => user.role === "tutee");
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      const newUsers = statsUsers.filter(
        (user) => new Date(user.createdAt) > lastMonth
      );
      const activeUsers = statsUsers.filter(
        (user) =>
          user.lastSignInAt &&
          new Date(user.lastSignInAt) >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      setOverallStats({
        totalUsers: statsUsers.length,
        totalTutors: tutors.length,
        totalTutees: tutees.length,
        activeUsers: activeUsers.length,
        newUsersThisMonth: newUsers.length,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Set empty arrays to prevent crashes
      setUsers([]);
      setOverallStats({
        totalUsers: 0,
        totalTutors: 0,
        totalTutees: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply admin role-based filtering first
    if (!isSuperAdmin && (userCollege || userDepartment)) {
      filtered = filtered.filter((user) => {
        // Get user's college and department information
        const userCollegeInfo = (user as any).publicMetadata
          ?.collegeInformation;
        const userCollegeName = userCollegeInfo?.college;
        const userDepartmentName = userCollegeInfo?.department;

        // If admin has a specific college, only show users from that college
        if (userCollege && userCollegeName !== userCollege) {
          return false;
        }

        // If admin has a specific department (not ALL_DEPARTMENTS), only show users from that department
        if (
          userDepartment &&
          userDepartment !== "ALL_DEPARTMENTS" &&
          userDepartmentName !== userDepartment
        ) {
          return false;
        }

        return true;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          `${user.firstName} ${user.lastName}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.emailAddresses?.[0]?.emailAddress || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (statusFilter === "active") {
        filtered = filtered.filter(
          (user) => user.lastSignInAt && new Date(user.lastSignInAt) > weekAgo
        );
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter(
          (user) => !user.lastSignInAt || new Date(user.lastSignInAt) <= weekAgo
        );
      } else if (statusFilter === "new") {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1);
        filtered = filtered.filter(
          (user) => new Date(user.createdAt) > monthAgo
        );
      }
    }

    // Sort the filtered results
    const sorted = sortUsersArray(filtered);
    setFilteredUsers(sorted);
  };

  const sortUsersArray = (usersToSort: UserWithStats[]) => {
    return [...usersToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "role":
          aValue = a.role;
          bValue = b.role;
          break;
        case "status":
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          aValue = a.lastSignInAt && new Date(a.lastSignInAt) > weekAgo ? 1 : 0;
          bValue = b.lastSignInAt && new Date(b.lastSignInAt) > weekAgo ? 1 : 0;
          break;
        case "appointments":
          aValue = a.stats.totalAppointments;
          bValue = b.stats.totalAppointments;
          break;
        case "rating":
          aValue = a.stats.averageRating;
          bValue = b.stats.averageRating;
          break;
        case "lastActive":
          aValue = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
          bValue = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
          break;
        default:
          aValue = a.firstName;
          bValue = b.firstName;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleViewUser = (user: UserWithStats) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Security check - only admins can access this page
  if (!user) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground">Loading...</div>
          </CardContent>
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
            <div className="text-muted-foreground mt-2">
              You do not have permission to access this page.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-muted-foreground opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const formatLastSignIn = (lastSignIn?: string) => {
    if (!lastSignIn) return "Never";
    const date = new Date(lastSignIn);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <RefreshCw className="h-4 w-4 animate-spin" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <Button onClick={fetchUserData} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Regular platform users
            </p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tutors</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.totalTutors}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.totalUsers > 0 ? 
                Math.round((overallStats.totalTutors / overallStats.totalUsers) * 100) : 0
              }% of users
            </p>
          </CardContent>
        </Card> */}

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tutees</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overallStats.totalTutees}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.totalUsers > 0 ? 
                Math.round((overallStats.totalTutees / overallStats.totalUsers) * 100) : 0
              }% of users
            </p>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {overallStats.activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Active in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New This Month
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {overallStats.newUsersThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              Recent registrations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage and view all tutors and tutees on the platform
            {!isSuperAdmin && userCollege && (
              <span className="block mt-1 text-blue-600">
                Viewing users from {userCollege}
                {userDepartment && userDepartment !== "ALL_DEPARTMENTS"
                  ? ` - ${userDepartment} department`
                  : " - All departments"}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or username"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            {/* <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="tutor">Tutors</SelectItem>
                <SelectItem value="tutee">Tutees</SelectItem>
              </SelectContent>
            </Select> */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="new">New Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                  ? `Filtered results from ${users.length} total users`
                  : "All registered users"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("name")}
                    >
                      User
                      {getSortIcon("name")}
                    </Button>
                  </TableHead>
                  <TableHead>College/Department</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      {getSortIcon("status")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("appointments")}
                    >
                      Appointments
                      {getSortIcon("appointments")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("rating")}
                    >
                      Rating
                      {getSortIcon("rating")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("lastActive")}
                    >
                      Last Active
                      {getSortIcon("lastActive")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.imageUrl} />
                          <AvatarFallback>
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const collegeInfo = (user as any).publicMetadata
                          ?.collegeInformation;
                        if (collegeInfo?.college || collegeInfo?.department) {
                          return (
                            <div className="space-y-1">
                              {collegeInfo.college && (
                                <Badge variant="outline" className="text-xs">
                                  {collegeInfo.college}
                                </Badge>
                              )}
                              {collegeInfo.department && (
                                <Badge variant="secondary" className="text-xs">
                                  {collegeInfo.department}
                                </Badge>
                              )}
                            </div>
                          );
                        }
                        return (
                          <span className="text-muted-foreground text-sm">
                            Not set
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.lastSignInAt &&
                          new Date(user.lastSignInAt) >
                            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                            ? "default"
                            : "outline"
                        }
                      >
                        {user.lastSignInAt &&
                        new Date(user.lastSignInAt) >
                          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{user.stats.totalAppointments}</span>
                        {user.stats.completedAppointments > 0 && (
                          <span className="text-sm text-muted-foreground">
                            ({user.stats.completedAppointments} completed)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === "tutor" && user.stats.averageRating > 0 ? (
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{user.stats.averageRating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatLastSignIn(user.lastSignInAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewUser(user)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              navigator.clipboard.writeText(user.id)
                            }
                          >
                            Copy User ID
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No users found</h3>
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "No users match the current filters."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser?.imageUrl} />
                <AvatarFallback>
                  {selectedUser
                    ? getInitials(selectedUser.firstName, selectedUser.lastName)
                    : ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>
                  {selectedUser?.firstName} {selectedUser?.lastName}
                </div>
                <div className="text-sm text-muted-foreground font-normal">
                  @{selectedUser?.username}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Detailed information about this user
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      {selectedUser.emailAddresses?.[0]?.emailAddress ||
                        "No email"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Member since:{" "}
                      </span>
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </div>
                    {/* College and Department Information */}
                    {(() => {
                      const collegeInfo = (selectedUser as any).publicMetadata
                        ?.collegeInformation;
                      if (collegeInfo?.college || collegeInfo?.department) {
                        return (
                          <>
                            {collegeInfo.college && (
                              <div>
                                <span className="text-muted-foreground">
                                  College:{" "}
                                </span>
                                <Badge variant="outline">
                                  {collegeInfo.college}
                                </Badge>
                              </div>
                            )}
                            {collegeInfo.department && (
                              <div>
                                <span className="text-muted-foreground">
                                  Department:{" "}
                                </span>
                                <Badge variant="outline">
                                  {collegeInfo.department}
                                </Badge>
                              </div>
                            )}
                            {collegeInfo.yearLevel && (
                              <div>
                                <span className="text-muted-foreground">
                                  Year Level:{" "}
                                </span>
                                <Badge variant="secondary">
                                  {collegeInfo.yearLevel}
                                </Badge>
                              </div>
                            )}
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Activity Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Appointments:
                      </span>
                      <span>{selectedUser.stats.totalAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed:</span>
                      <span>{selectedUser.stats.completedAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Average Rating:
                      </span>
                      <span className="flex items-center">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                        {selectedUser.stats.averageRating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Last Active:
                      </span>
                      <span>{formatLastSignIn(selectedUser.lastSignInAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subjects (for tutors) */}
              {selectedUser.role === "tutor" && selectedUser.stats.subjects && (
                <div>
                  <h4 className="font-medium mb-2">Teaching Subjects</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.stats.subjects.map((subject, index) => (
                      <Badge key={index} variant="outline">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
