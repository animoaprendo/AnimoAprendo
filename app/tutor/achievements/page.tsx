import { fetchAppointments, fetchUsers } from "@/app/actions";
import { getGamificationLeaderboard } from "@/app/admin/actions";
import {
  getApprovedSubjectOfferingsCount,
  getDailyLoginStreak,
  getUserGamificationProfile,
} from "@/app/gamification-actions";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { GamificationSystem } from "@/lib/gamification/system";
import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  Award,
  Crown,
  Flame,
  Medal,
  Star,
  Target,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect, RedirectType } from "next/navigation";

const normalizeUserId = (id?: string) => (id || "").replace(/^user_/, "");

export default async function TutorAchievementsPage() {
  const user = await currentUser();

  if (!user) redirect("/", RedirectType.replace);

  const [
    gamificationProfileResult,
    approvedOfferingsResult,
    dailyLoginStreakResult,
    appointmentsResult,
    leaderboardResult,
  ] = await Promise.all([
    getUserGamificationProfile(user.id),
    getApprovedSubjectOfferingsCount(user.id),
    getDailyLoginStreak(user.id),
    fetchAppointments(user.id),
    getGamificationLeaderboard(),
  ]);

  const gamificationStats = {
    totalAppointments: 0,
    completed: 0,
    upcoming: 0,
    approvedSubjectOfferings: 0,
    totalReviews: 0,
    averageRating: 0,
    streakDays: 0,
    profileCompleteness: 50,
    responseTime: 0,
    cancelationRate: 0,
  };

  const gamificationProfile =
    gamificationProfileResult.success && gamificationProfileResult.data
      ? gamificationProfileResult.data
      : null;

  if (gamificationProfile) {
    gamificationStats.totalAppointments = gamificationProfile.stats?.totalSessions || 0;
    gamificationStats.completed = gamificationProfile.stats?.completedSessions || 0;
    gamificationStats.totalReviews = gamificationProfile.stats?.totalReviews || 0;
    gamificationStats.averageRating = gamificationProfile.stats?.averageRating || 0;
    gamificationStats.streakDays = gamificationProfile.currentStreak || 0;
    gamificationStats.profileCompleteness =
      gamificationProfile.stats?.profileCompleteness || 50;
    gamificationStats.responseTime =
      gamificationProfile.stats?.averageResponseTime || 0;
    gamificationStats.cancelationRate =
      gamificationProfile.stats?.canceledSessions > 0 && gamificationProfile.stats?.totalSessions > 0
        ? (gamificationProfile.stats.canceledSessions / gamificationProfile.stats.totalSessions) * 100
        : 0;
  }

  if (approvedOfferingsResult.success && approvedOfferingsResult.data) {
    gamificationStats.approvedSubjectOfferings =
      approvedOfferingsResult.data.approvedOfferingsCount;
  }

  if (dailyLoginStreakResult.success && dailyLoginStreakResult.data) {
    gamificationStats.streakDays = dailyLoginStreakResult.data.streakDays;
  }

  if (appointmentsResult.success && Array.isArray(appointmentsResult.appointments)) {
    const tutorAppointments = appointmentsResult.appointments.filter(
      (apt: any) => apt.tutorId === user.id,
    );

    gamificationStats.totalAppointments = tutorAppointments.length;
    gamificationStats.completed = tutorAppointments.filter(
      (apt: any) => apt.status === "completed",
    ).length;
    gamificationStats.upcoming = tutorAppointments.filter(
      (apt: any) =>
        (apt.status === "accepted" || apt.status === "completed") &&
        new Date(apt.datetimeISO) > new Date(),
    ).length;
  }

  const achievements = GamificationSystem.checkAchievements(gamificationStats);
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked);
  const completionPercentage = Math.round(
    (unlockedAchievements.length / achievements.length) * 100,
  );

  const nextGoals = achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((a, b) => {
      const aProgress =
        a.progress !== undefined && a.maxProgress
          ? (a.progress / a.maxProgress) * 100
          : 0;
      const bProgress =
        b.progress !== undefined && b.maxProgress
          ? (b.progress / b.maxProgress) * 100
          : 0;

      return bProgress - aProgress;
    })
    .slice(0, 3);

  const allProfiles =
    leaderboardResult.success && Array.isArray(leaderboardResult.data)
      ? [...leaderboardResult.data].sort((a: any, b: any) => (b.totalXP || 0) - (a.totalXP || 0))
      : [];

  const topProfiles = allProfiles.slice(0, 10);
  const currentUserRank =
    allProfiles.findIndex(
      (profile: any) =>
        normalizeUserId(String(profile.userId || "")) === normalizeUserId(user.id),
    ) + 1;

  const leaderboardUserIds = [
    ...new Set(topProfiles.map((profile: any) => profile.userId).filter(Boolean)),
  ];

  let leaderboardUsers: Record<string, any> = {};
  if (leaderboardUserIds.length > 0) {
    const usersResult = await fetchUsers(leaderboardUserIds);

    if (
      usersResult.success &&
      usersResult.data &&
      Array.isArray(usersResult.data.users)
    ) {
      leaderboardUsers = usersResult.data.users.reduce((acc: Record<string, any>, userItem: any) => {
        const userId = String(userItem?.id || "");
        if (userId) {
          acc[userId] = userItem;
          acc[normalizeUserId(userId)] = userItem;
        }
        return acc;
      }, {});
    }
  }

  const leaderboardEntries = topProfiles.map((profile: any, index: number) => {
    const profileUserId = String(profile.userId || "");
    const lookupKey = normalizeUserId(profileUserId);
    const userInfo = leaderboardUsers[profileUserId] || leaderboardUsers[lookupKey];

    return {
      rank: index + 1,
      userId: profileUserId,
      displayName:
        userInfo?.displayName ||
        [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(" ") ||
        userInfo?.username ||
        "Tutor",
      imageUrl: userInfo?.imageUrl,
      totalXP: profile.totalXP || 0,
      currentLevel: profile.currentLevel || 1,
      completedSessions: profile.stats?.completedSessions || 0,
      isCurrentUser:
        normalizeUserId(profileUserId) === normalizeUserId(user.id),
    };
  });

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Achievements & Leaderboard</h1>
          <p className="text-muted-foreground">
            Track your progress, unlock milestones, and see where you rank among tutors.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href="/tutor/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total XP</CardDescription>
            <CardTitle className="text-2xl">{gamificationProfile?.totalXP || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Zap className="w-4 h-4 mr-1" />
              Level {gamificationProfile?.currentLevel || 1}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Achievements</CardDescription>
            <CardTitle className="text-2xl">
              {unlockedAchievements.length}/{achievements.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">{completionPercentage}% completed</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Sessions</CardDescription>
            <CardTitle className="text-2xl">{gamificationStats.completed}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Target className="w-4 h-4 mr-1" />
              {gamificationStats.totalAppointments} total sessions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Streak</CardDescription>
            <CardTitle className="text-2xl">{gamificationStats.streakDays} days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Flame className="w-4 h-4 mr-1" />
              Keep your momentum going
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Achievement Progress
            </CardTitle>
            <CardDescription>
              You have unlocked {unlockedAchievements.length} achievements so far.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall completion</span>
                <span>{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Next goals</h3>
              {nextGoals.length > 0 ? (
                nextGoals.map((achievement) => {
                  const progress =
                    achievement.progress !== undefined && achievement.maxProgress
                      ? Math.min(
                          100,
                          Math.round((achievement.progress / achievement.maxProgress) * 100),
                        )
                      : 0;

                  return (
                    <div key={achievement.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium leading-tight">{achievement.name}</p>
                          <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        </div>
                        <Badge variant="secondary">+{achievement.xpReward} XP</Badge>
                      </div>
                      {achievement.maxProgress ? (
                        <>
                          <Progress value={progress} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">
                            {achievement.progress || 0}/{achievement.maxProgress}
                          </p>
                        </>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">All achievements unlocked. Great work!</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Tutor Leaderboard
            </CardTitle>
            <CardDescription>
              {currentUserRank > 0
                ? `You are currently ranked #${currentUserRank}.`
                : "Rank appears once your profile has leaderboard data."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboardEntries.length > 0 ? (
                leaderboardEntries.map((entry) => {
                  const rankIcon =
                    entry.rank === 1 ? (
                      <Crown className="w-4 h-4 text-amber-500" />
                    ) : entry.rank === 2 ? (
                      <Medal className="w-4 h-4 text-slate-500" />
                    ) : entry.rank === 3 ? (
                      <Star className="w-4 h-4 text-orange-500" />
                    ) : null;

                  return (
                    <div
                      key={entry.userId || entry.rank}
                      className={`flex items-center justify-between rounded-md border p-3 ${
                        entry.isCurrentUser ? "bg-primary/5 border-primary/30" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 text-sm font-semibold text-muted-foreground">#{entry.rank}</div>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={entry.imageUrl} alt={entry.displayName} />
                          <AvatarFallback>
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {entry.displayName}
                            {entry.isCurrentUser ? " (You)" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Level {entry.currentLevel} • {entry.completedSessions} sessions
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {rankIcon}
                        <Badge>{entry.totalXP} XP</Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Leaderboard data is not available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
