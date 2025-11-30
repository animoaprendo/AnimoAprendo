"use client";

import { getGamificationLeaderboard, resetGamificationProfiles, getUsersForLeaderboard, getSerializedGamificationProfile } from "@/app/admin/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import {
    Award,
    Crown,
    Medal,
    RotateCcw,
    Search,
    Trash2,
    Trophy,
    Users,
    Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface LeaderboardUser {
  userId: string;
  name: string;
  email: string;
  imageUrl?: string;
  college?: string;
  department?: string;
  yearLevel?: number;
  totalXP: number;
  currentLevel: number;
  completedSessions: number;
  currentStreak: number;
  averageRating: number;
  totalReviews: number;
}

interface UserGamificationProfile {
  userId: string;
  totalXP: number;
  currentLevel: number;
  xpEarnedToday?: number;
  xpEarnedThisWeek?: number;
  xpEarnedThisMonth?: number;
  unlockedAchievements: string[];
  achievementProgress?: any[];
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string; // ISO string from server
  streakStartDate?: string;
  stats: {
    totalSessions: number;
    completedSessions: number;
    canceledSessions: number;
    averageRating: number;
    totalReviews: number;
    averageResponseTime: number;
    profileCompleteness: number;
    subjectsMastered: string[];
    weeklyGoalStreak: number;
  };
  weeklyGoals?: any[];
  preferences?: any;
  createdAt: string; // ISO string from server
  updatedAt: string; // ISO string from server
}

type SortField = 'totalXP' | 'currentLevel' | 'completedSessions' | 'currentStreak' | 'averageRating';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'tutors' | 'tutees';

export default function LeaderboardsPage() {
  const { user } = useUser();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [filteredData, setFilteredData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("totalXP");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Check if user is superadmin
  const isSuperAdmin = user?.publicMetadata?.isAdmin === true && user?.publicMetadata?.adminRole === "superadmin";
  const userCollege = user?.publicMetadata?.college as string | undefined;
  const userDepartment = user?.publicMetadata?.department as string | undefined;

  useEffect(() => {
    if (user?.publicMetadata?.isAdmin && !dataFetched) {
      fetchLeaderboardData();
    }
  }, [user, isSuperAdmin, userCollege, userDepartment, dataFetched]);

  useEffect(() => {
    filterAndSortData();
  }, [leaderboardData, searchTerm, filterType, sortField, sortOrder]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      // Get all users and their gamification profiles
      const [usersResult, gamificationResult] = await Promise.all([
        getUsersForLeaderboard(),
        getGamificationLeaderboard()
      ]);

      if (usersResult.success) {
        const users = usersResult.data || [];
        let gamificationProfiles: UserGamificationProfile[] = [];

        // If we have gamification API, use it, otherwise show users with no gamification data
        if (gamificationResult.success && gamificationResult.data && gamificationResult.data.length > 0) {
          gamificationProfiles = gamificationResult.data;
        } else {
          // Instead of making individual API calls, create empty profiles for users
          // This prevents excessive API calls when gamification data doesn't exist
          console.warn('Gamification API failed or returned no data. Showing users with default gamification values.');
          setApiError('Gamification data unavailable. Showing users with default values.');
          
          gamificationProfiles = users.map((user: any) => ({
            userId: user.id,
            totalXP: 0,
            currentLevel: 1,
            xpEarnedToday: 0,
            xpEarnedThisWeek: 0,
            xpEarnedThisMonth: 0,
            unlockedAchievements: [],
            achievementProgress: [],
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: new Date().toISOString(),
            streakStartDate: new Date().toISOString(),
            stats: {
              totalSessions: 0,
              completedSessions: 0,
              canceledSessions: 0,
              averageRating: 0,
              totalReviews: 0,
              averageResponseTime: 0,
              profileCompleteness: 50,
              subjectsMastered: [],
              weeklyGoalStreak: 0,
            },
            weeklyGoals: [],
            preferences: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
        }

        // Combine user data with gamification profiles
        const leaderboardUserResults = users
          .map((user: any) => {
            const profile = gamificationProfiles.find((p: any) => p.userId === user.id);
            if (!profile) return null;

            // Skip admin users
            if (user.isAdmin || user.publicMetadata?.isAdmin) return null;

            const collegeInfo = user.public_metadata?.collegeInformation || user.publicMetadata?.collegeInformation;
            
            return {
              userId: user.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown User',
              email: user.emailAddresses?.[0]?.emailAddress || user.email || 'No email',
              imageUrl: user.imageUrl,
              college: collegeInfo?.college,
              department: collegeInfo?.department,
              yearLevel: collegeInfo?.yearLevel,
              totalXP: profile.totalXP || 0,
              currentLevel: profile.currentLevel || 1,
              completedSessions: profile.stats?.completedSessions || 0,
              currentStreak: profile.currentStreak || 0,
              averageRating: profile.stats?.averageRating || 0,
              totalReviews: profile.stats?.totalReviews || 0,
            } as LeaderboardUser;
          });
        
        const leaderboardUsers: LeaderboardUser[] = leaderboardUserResults.filter((user): user is LeaderboardUser => user !== null);

        // Apply role-based filtering
        let filteredUsers = leaderboardUsers;
        if (!isSuperAdmin && (userCollege || userDepartment)) {
          filteredUsers = leaderboardUsers.filter(leaderboardUser => {
            // If admin has a specific college, only show users from that college
            if (userCollege && leaderboardUser.college !== userCollege) {
              return false;
            }
            
            // If admin has a specific department (not ALL_DEPARTMENTS), only show users from that department
            if (userDepartment && userDepartment !== 'ALL_DEPARTMENTS' && leaderboardUser.department !== userDepartment) {
              return false;
            }
            
            return true;
          });
        }

        setLeaderboardData(filteredUsers);
        setDataFetched(true);
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      toast.error("Failed to load leaderboard data");
      setApiError("Failed to load leaderboard data");
      setDataFetched(true); // Prevent retries
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortData = () => {
    let filtered = [...leaderboardData];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.college && user.college.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply role filter (tutors vs tutees)
    if (filterType !== "all") {
      // This would need to be implemented based on how you distinguish tutors from tutees
      // For now, we'll assume all users are included
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredData(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleResetAllProfiles = async () => {
    try {
      setResetLoading(true);
      
      const result = await resetGamificationProfiles({
        resetType: isSuperAdmin ? "all" : "filtered",
        userColleges: isSuperAdmin ? undefined : [userCollege].filter((c): c is string => Boolean(c)),
        userDepartments: isSuperAdmin ? undefined : [userDepartment].filter((d): d is string => Boolean(d)),
        editorId: user?.id || ""
      });
      
      if (result.success) {
        toast.success(isSuperAdmin 
          ? "All gamification profiles have been reset successfully!" 
          : "Gamification profiles for your assigned users have been reset successfully!"
        );
        setIsResetDialogOpen(false);
        await fetchLeaderboardData(); // Refresh data
      } else {
        toast.error(result.error || "Failed to reset profiles");
      }
    } catch (error) {
      console.error("Error resetting profiles:", error);
      toast.error("Failed to reset profiles");
    } finally {
      setResetLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">#{index + 1}</span>;
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 10) return "bg-purple-100 text-purple-800 border-purple-200";
    if (level >= 7) return "bg-blue-100 text-blue-800 border-blue-200";
    if (level >= 4) return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Security check - only admins can access this page
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user.publicMetadata?.isAdmin) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-600 font-medium">Access Denied</div>
            <div className="text-muted-foreground mt-2">You do not have permission to access this page.</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-6 h-6 animate-spin" />
            <span className="text-lg font-medium">Loading leaderboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Gamification Leaderboards
              </CardTitle>
              <CardDescription>
                View user rankings and manage gamification data
                {!isSuperAdmin && userCollege && (
                  <span className="block mt-1 text-blue-600">
                    Viewing rankings for {userCollege}
                    {userDepartment && userDepartment !== 'ALL_DEPARTMENTS' ? ` - ${userDepartment} department` : ' - All departments'}
                  </span>
                )}
                {apiError && (
                  <span className="block mt-1 text-yellow-600 text-sm">
                    ⚠️ {apiError}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => setIsResetDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isSuperAdmin ? 'Reset All Profiles' : 'Reset User Profiles'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-800">{filteredData.length}</div>
                <div className="text-blue-600 text-sm">Total Users</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-800">
                  {Math.round(filteredData.reduce((sum, user) => sum + user.totalXP, 0) / Math.max(filteredData.length, 1))}
                </div>
                <div className="text-green-600 text-sm">Avg XP</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-800">
                  {filteredData.filter(user => user.currentLevel >= 5).length}
                </div>
                <div className="text-purple-600 text-sm">Level 5+</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-800">
                  {filteredData.filter(user => user.currentStreak >= 7).length}
                </div>
                <div className="text-yellow-600 text-sm">7+ Day Streak</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, email, college, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="tutors">Tutors</SelectItem>
                  <SelectItem value="tutees">Tutees</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => {
                setDataFetched(false);
                fetchLeaderboardData();
              }} size="icon">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Leaderboard Tabs */}
          <Tabs defaultValue="xp" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="xp" onClick={() => handleSort('totalXP')}>
                <Zap className="w-4 h-4 mr-2" />
                XP Leaders
              </TabsTrigger>
              <TabsTrigger value="level" onClick={() => handleSort('currentLevel')}>
                <Award className="w-4 h-4 mr-2" />
                Top Levels
              </TabsTrigger>
              <TabsTrigger value="sessions" onClick={() => handleSort('completedSessions')}>
                <Users className="w-4 h-4 mr-2" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="streak" onClick={() => handleSort('currentStreak')}>
                <Trophy className="w-4 h-4 mr-2" />
                Streaks
              </TabsTrigger>
              <TabsTrigger value="rating" onClick={() => handleSort('averageRating')}>
                <Medal className="w-4 h-4 mr-2" />
                Ratings
              </TabsTrigger>
            </TabsList>

            {/* Leaderboard Table */}
            <TabsContent value="xp" className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>College/Dept</TableHead>
                      <TableHead className="text-center">Level</TableHead>
                      <TableHead className="text-right">XP</TableHead>
                      <TableHead className="text-center">Sessions</TableHead>
                      <TableHead className="text-center">Streak</TableHead>
                      <TableHead className="text-right">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">
                          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold">No Users Found</h3>
                          <p className="text-muted-foreground">
                            {searchTerm || filterType !== "all" 
                              ? "Try adjusting your search or filter criteria."
                              : "No users have gamification profiles yet."}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((user, index) => (
                        <TableRow key={user.userId} className={index < 3 ? "bg-yellow-50/50" : ""}>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              {getRankIcon(index)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.imageUrl} />
                                <AvatarFallback>
                                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {user.college && (
                                <Badge variant="outline" className="text-xs">
                                  {user.college}
                                </Badge>
                              )}
                              {user.department && (
                                <Badge variant="secondary" className="text-xs">
                                  {user.department}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`${getLevelColor(user.currentLevel)} text-xs`}>
                              Level {user.currentLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {user.totalXP.toLocaleString()} XP
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {user.completedSessions}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={user.currentStreak >= 7 ? "default" : "secondary"} 
                              className="text-xs"
                            >
                              {user.currentStreak} days
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {user.averageRating > 0 ? (
                              <div className="flex items-center justify-end space-x-1">
                                <span className="text-sm font-medium">{user.averageRating.toFixed(1)}</span>
                                <span className="text-yellow-500">⭐</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No ratings</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            {/* Other tab contents with same table structure */}
            {['level', 'sessions', 'streak', 'rating'].map(tabValue => (
              <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-20">Rank</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>College/Dept</TableHead>
                        <TableHead className="text-center">Level</TableHead>
                        <TableHead className="text-right">XP</TableHead>
                        <TableHead className="text-center">Sessions</TableHead>
                        <TableHead className="text-center">Streak</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No Users Found</h3>
                            <p className="text-muted-foreground">
                              {searchTerm || filterType !== "all" 
                                ? "Try adjusting your search or filter criteria."
                                : "No users have gamification profiles yet."}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((user, index) => (
                          <TableRow key={user.userId} className={index < 3 ? "bg-yellow-50/50" : ""}>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                {getRankIcon(index)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.imageUrl} />
                                  <AvatarFallback>
                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {user.college && (
                                  <Badge variant="outline" className="text-xs">
                                    {user.college}
                                  </Badge>
                                )}
                                {user.department && (
                                  <Badge variant="secondary" className="text-xs">
                                    {user.department}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`${getLevelColor(user.currentLevel)} text-xs`}>
                                Level {user.currentLevel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {user.totalXP.toLocaleString()} XP
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {user.completedSessions}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={user.currentStreak >= 7 ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {user.currentStreak} days
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {user.averageRating > 0 ? (
                                <div className="flex items-center justify-end space-x-1">
                                  <span className="text-sm font-medium">{user.averageRating.toFixed(1)}</span>
                                  <span className="text-yellow-500">⭐</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No ratings</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {isSuperAdmin ? 'Reset All Profiles?' : 'Reset User Profiles?'}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                This will permanently reset {isSuperAdmin ? 'all user' : 'your assigned users'} gamification data including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>XP and levels</li>
                <li>Achievements and streaks</li>
                <li>Session statistics</li>
                <li>All progress data</li>
              </ul>
              {!isSuperAdmin && (
                <p className="text-blue-600 font-medium">
                  This will only affect users from {userCollege}{userDepartment && userDepartment !== 'ALL_DEPARTMENTS' ? ` - ${userDepartment} department` : ' - All departments'}
                </p>
              )}
              <p className="text-red-600 font-medium">This action cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsResetDialogOpen(false)}
              disabled={resetLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleResetAllProfiles}
              disabled={resetLoading}
            >
              {resetLoading && <RotateCcw className="w-4 h-4 mr-2 animate-spin" />}
              Reset All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
