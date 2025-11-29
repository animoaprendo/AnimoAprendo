"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Star,
  TrendingUp,
  Eye,
  UserCheck,
  UserX,
  MoreHorizontal,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { getCollectionData, fetchAppointments, fetchUsers } from "@/app/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
};

type UserStats = {
  totalAppointments: number;
  completedAppointments: number;
  averageRating: number;
  activeChats: number;
  subjects?: string[];
};

type UserWithStats = User & {
  stats: UserStats;
};

type SortField = 'name' | 'role' | 'status' | 'appointments' | 'rating' | 'lastActive';
type SortDirection = 'asc' | 'desc';

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [overallStats, setOverallStats] = useState({
    totalUsers: 0,
    totalTutors: 0,
    totalTutees: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter, sortField, sortDirection]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch users and appointments
      const [usersResponse, appointmentsResponse] = await Promise.all([
        getCollectionData("users"),
        fetchAppointments(),
      ]);

      const usersData = usersResponse.data || [];
      const appointmentsData = appointmentsResponse.appointments || [];
      
      // Filter out admin users (focusing on regular users only)
      // Make filtering more flexible to catch users regardless of data structure
      const regularUsers = usersData.filter((user: any) => {
        const isAdmin = user.isAdmin || 
                       user.publicMetadata?.isAdmin || 
                       user.publicMetadata?.adminRole;
        const hasRole = user.role || 
                       user.publicMetadata?.role;
        
        return !isAdmin && (hasRole === 'tutor' || hasRole === 'tutee' || !hasRole);
      });
      
      // If no regular users found, show all users as fallback
      const usersToProcess = regularUsers.length > 0 ? regularUsers : usersData;

      // Calculate statistics for each user
      const usersWithStats: UserWithStats[] = await Promise.all(
        usersToProcess.map(async (user: any) => {
          const userAppointments = appointmentsData.filter((apt: any) => 
            apt.tutorId === user.id || apt.tuteeId === user.id
          );

          const completedAppointments = userAppointments.filter((apt: any) => 
            apt.status === 'completed'
          );

          // Calculate average rating (this would need to be implemented based on your review system)
          const averageRating = 4.2; // Placeholder - you'd calculate this from reviews

          // Get user's subjects if they're a tutor
          let subjects: string[] = [];
          if (user.role === 'tutor') {
            // This would come from their offerings/subjects
            subjects = ['Mathematics', 'Science']; // Placeholder
          }

          const stats: UserStats = {
            totalAppointments: userAppointments.length,
            completedAppointments: completedAppointments.length,
            averageRating,
            activeChats: Math.floor(Math.random() * 5), // Placeholder
            subjects,
          };

          return {
            id: user.id || user._id || user.userId,
            _id: user._id || user.id,
            firstName: user.firstName || user.first_name || user.given_name || 'Unknown',
            lastName: user.lastName || user.last_name || user.family_name || '',
            username: user.username || user.email_addresses?.[0]?.email_address?.split('@')[0] || 'user',
            emailAddresses: user.emailAddresses || user.email_addresses || 
                          (user.primaryEmailAddress ? [user.primaryEmailAddress] : []),
            imageUrl: user.imageUrl || user.image_url || user.profileImageUrl,
            role: user.role || user.publicMetadata?.role || 'tutee',
            createdAt: user.createdAt || user.created_at || user.createdAt || new Date().toISOString(),
            updatedAt: user.updatedAt || user.updated_at || user.lastUpdatedAt || new Date().toISOString(),
            lastSignInAt: user.lastSignInAt || user.last_sign_in_at || user.lastActiveAt,
            onboarded: user.onboarded !== false && user.publicMetadata?.onboarded !== false,
            stats,
          };
        })
      );

      setUsers(usersWithStats);

      // Calculate overall statistics
      const tutors = usersWithStats.filter(user => user.role === 'tutor');
      const tutees = usersWithStats.filter(user => user.role === 'tutee');
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      const newUsers = usersWithStats.filter(user => 
        new Date(user.createdAt) > lastMonth
      );
      const activeUsers = usersWithStats.filter(user => 
        user.lastSignInAt && new Date(user.lastSignInAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      setOverallStats({
        totalUsers: usersWithStats.length,
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      if (statusFilter === "active") {
        filtered = filtered.filter(user => 
          user.lastSignInAt && new Date(user.lastSignInAt) > weekAgo
        );
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter(user => 
          !user.lastSignInAt || new Date(user.lastSignInAt) <= weekAgo
        );
      } else if (statusFilter === "new") {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1);
        filtered = filtered.filter(user => 
          new Date(user.createdAt) > monthAgo
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
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'status':
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          aValue = a.lastSignInAt && new Date(a.lastSignInAt) > weekAgo ? 1 : 0;
          bValue = b.lastSignInAt && new Date(b.lastSignInAt) > weekAgo ? 1 : 0;
          break;
        case 'appointments':
          aValue = a.stats.totalAppointments;
          bValue = b.stats.totalAppointments;
          break;
        case 'rating':
          aValue = a.stats.averageRating;
          bValue = b.stats.averageRating;
          break;
        case 'lastActive':
          aValue = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
          bValue = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
          break;
        default:
          aValue = a.firstName;
          bValue = b.firstName;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewUser = (user: UserWithStats) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-muted-foreground opacity-50" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  const formatLastSignIn = (lastSignIn?: string) => {
    if (!lastSignIn) return 'Never';
    const date = new Date(lastSignIn);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Regular platform users</p>
          </CardContent>
        </Card>

        <Card>
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
        </Card>

        <Card>
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
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overallStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Active in last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{overallStats.newUsersThisMonth}</div>
            <p className="text-xs text-muted-foreground">Recent registrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>
            Manage and view all tutors and tutees on the platform
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
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="tutor">Tutors</SelectItem>
                <SelectItem value="tutee">Tutees</SelectItem>
              </SelectContent>
            </Select>
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
                  : "All registered users"
                }
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
                      onClick={() => handleSort('name')}
                    >
                      User
                      {getSortIcon('name')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort('role')}
                    >
                      Role
                      {getSortIcon('role')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {getSortIcon('status')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort('appointments')}
                    >
                      Appointments
                      {getSortIcon('appointments')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort('rating')}
                    >
                      Rating
                      {getSortIcon('rating')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort('lastActive')}
                    >
                      Last Active
                      {getSortIcon('lastActive')}
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
                      <Badge 
                        variant={user.role === 'tutor' ? 'default' : 'secondary'}
                      >
                        {user.role === 'tutor' ? (
                          <>
                            <GraduationCap className="w-3 h-3 mr-1" />
                            Tutor
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-3 h-3 mr-1" />
                            Tutee
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          user.lastSignInAt && 
                          new Date(user.lastSignInAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
                            ? 'default' : 'outline'
                        }
                      >
                        {user.lastSignInAt && 
                        new Date(user.lastSignInAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
                          ? 'Active' : 'Inactive'}
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
                      {user.role === 'tutor' && user.stats.averageRating > 0 ? (
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
                          <DropdownMenuItem onClick={() => handleViewUser(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => navigator.clipboard.writeText(user.id)}
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
                  : "No users match the current filters."
                }
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
                  {selectedUser ? getInitials(selectedUser.firstName, selectedUser.lastName) : ''}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{selectedUser?.firstName} {selectedUser?.lastName}</div>
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
                      {selectedUser.emailAddresses?.[0]?.emailAddress || 'No email'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Role: </span>
                      <Badge variant={selectedUser.role === 'tutor' ? 'default' : 'secondary'}>
                        {selectedUser.role}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Member since: </span>
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Activity Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Appointments:</span>
                      <span>{selectedUser.stats.totalAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed:</span>
                      <span>{selectedUser.stats.completedAppointments}</span>
                    </div>
                    {selectedUser.role === 'tutor' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Average Rating:</span>
                        <span className="flex items-center">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                          {selectedUser.stats.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Active:</span>
                      <span>{formatLastSignIn(selectedUser.lastSignInAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subjects (for tutors) */}
              {selectedUser.role === 'tutor' && selectedUser.stats.subjects && (
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

              {/* Recent Activity Placeholder */}
              <div>
                <h4 className="font-medium mb-2">Recent Activity</h4>
                <div className="text-sm text-muted-foreground">
                  Feature coming soon
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
