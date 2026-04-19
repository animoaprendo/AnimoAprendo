import { fetchAppointments, fetchUsers, getCollectionData } from "@/app/actions";
import {
  getDailyLoginStreak,
  getApprovedSubjectOfferingsCount,
  getUserGamificationProfile
} from '@/app/gamification-actions';
import { AchievementSystem } from '@/components/gamification/achievement-system';
import { LevelCard } from '@/components/gamification/level-card';
import { StatsOverview } from '@/components/gamification/progress-tracking';
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
import { getMicrosoftAccessToken } from '@/lib/microsoft-oauth';
import { currentUser } from "@clerk/nextjs/server";
import {
  Award,
  CalendarDays,
  Clock,
  Eye,
  MapPin,
  Star,
  User
} from "lucide-react";
import Link from "next/link";
import { redirect, RedirectType } from "next/navigation";
import { MdLeaderboard } from "react-icons/md";

// Utility function to calculate XP required for a level
function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.5, level - 2));
}

const dayLabelMap: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const dayOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function formatAvailabilityTime(hourOfDay: number, minute: number): string {
  const normalizedHour = Number.isFinite(hourOfDay) ? hourOfDay : 0;
  const normalizedMinute = Number.isFinite(minute) ? minute : 0;
  const date = new Date(0, 0, 0, normalizedHour, normalizedMinute);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function Dashboard() {
  const user = await currentUser();

  if (!user) redirect("/", RedirectType.replace);

  // Fetch real appointments from database
  const appointmentsResult = await fetchAppointments(user.id);
  const tokens = await getMicrosoftAccessToken(user.id);

  let upcomingAppointments: any[] = [];
  
  // Get real gamification data from database
  const gamificationProfileResult = await getUserGamificationProfile(user.id);
  let hasError = false;
  
  // Initialize default stats
  let gamificationStats = {
    totalAppointments: 0,
    completed: 0,
    upcoming: 0,
    approvedSubjectOfferings: 0,
    totalReviews: 0,
    averageRating: 0,
    streakDays: 0,
    profileCompleteness: 50,
    responseTime: 0,
    cancelationRate: 0
  };
  
  let gamificationProfile = null;
  
  // Use real gamification data if available
  if (gamificationProfileResult.success && gamificationProfileResult.data) {
    gamificationProfile = gamificationProfileResult.data;
    gamificationStats = {
      totalAppointments: gamificationProfile.stats.totalSessions,
      completed: gamificationProfile.stats.completedSessions,
      upcoming: 0, // Will be calculated from appointments
      approvedSubjectOfferings: 0,
      totalReviews: gamificationProfile.stats.totalReviews,
      averageRating: gamificationProfile.stats.averageRating,
      streakDays: gamificationProfile.currentStreak,
      profileCompleteness: gamificationProfile.stats.profileCompleteness,
      responseTime: gamificationProfile.stats.averageResponseTime,
      cancelationRate: gamificationProfile.stats.canceledSessions > 0 ? 
        (gamificationProfile.stats.canceledSessions / gamificationProfile.stats.totalSessions) * 100 : 0
    };
  }

  const approvedOfferingsResult = await getApprovedSubjectOfferingsCount(user.id);
  if (approvedOfferingsResult.success && approvedOfferingsResult.data) {
    gamificationStats.approvedSubjectOfferings = approvedOfferingsResult.data.approvedOfferingsCount;
  }

  const dailyLoginStreakResult = await getDailyLoginStreak(user.id);
  if (dailyLoginStreakResult.success && dailyLoginStreakResult.data) {
    gamificationStats.streakDays = dailyLoginStreakResult.data.streakDays;
  }

  const userPublicMetadata = user.publicMetadata as Record<string, any>;
  const rawTutorAvailability = Array.isArray(userPublicMetadata?.tutorAvailability)
    ? userPublicMetadata.tutorAvailability
    : [];
  const tutorAvailability = [...rawTutorAvailability]
    .filter((slot: any) => slot?.day && Array.isArray(slot?.timeRanges) && slot.timeRanges.length > 0)
    .sort((a: any, b: any) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

  const normalizeUserId = (id?: string) => (id || "").replace(/^user_/, "");

  // Fetch recent reviews the logged-in tutor received from tutees.
  let recentReviews: any[] = [];
  const reviewsResult = await getCollectionData("reviews");
  if (reviewsResult?.success && Array.isArray(reviewsResult.data)) {
    recentReviews = reviewsResult.data
      .filter((review: any) => {
        const reviewTutorId = String(review?.tutorId || "");
        return (
          review?.reviewerType === "tutee" &&
          (
            reviewTutorId === user.id ||
            normalizeUserId(reviewTutorId) === normalizeUserId(user.id)
          )
        );
      })
      .sort((a: any, b: any) => {
        const aDate = new Date(a?.createdAt || 0).getTime();
        const bDate = new Date(b?.createdAt || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 5);
  }

  let reviewUserMap: Record<string, any> = {};
  let reviewOfferingMap: Record<string, any> = {};
  if (recentReviews.length > 0) {
    const reviewerIds = [...new Set(recentReviews.map((review: any) => review?.reviewerId).filter(Boolean))];
    const reviewersResult = await fetchUsers(reviewerIds);

    if (
      reviewersResult.success &&
      reviewersResult.data &&
      Array.isArray(reviewersResult.data.users)
    ) {
      reviewUserMap = reviewersResult.data.users.reduce((acc: Record<string, any>, reviewer: any) => {
        const reviewerId = String(reviewer?.id || "");
        if (reviewerId) {
          acc[reviewerId] = reviewer;
          acc[normalizeUserId(reviewerId)] = reviewer;
        }
        return acc;
      }, {});
    }

    // Fetch offerings to get subject information
    const offeringIds = [...new Set(recentReviews.map((review: any) => review?.offerId).filter(Boolean))];
    if (offeringIds.length > 0) {
      const offeringsResult = await getCollectionData("subjects"); // 'subjects' collection contains offerings
      if (offeringsResult?.success && Array.isArray(offeringsResult.data)) {
        reviewOfferingMap = offeringsResult.data.reduce((acc: Record<string, any>, offering: any) => {
          const offeringId = String(offering?._id || "");
          if (offeringId) {
            acc[offeringId] = offering;
          }
          return acc;
        }, {});
      }
    }
  }

  // console.log(gamificationProfile)
  if (appointmentsResult.success && appointmentsResult.appointments) {
    const now = new Date();

    // Filter appointments where current user is the tutor
    const tutorAppointments = appointmentsResult.appointments.filter(
      (apt: any) => apt.tutorId === user.id
    );

    // Calculate statistics
    const totalAppointments = tutorAppointments.length;
    const completedAppointments = tutorAppointments.filter(
      (apt: any) => apt.status === "completed"
    ).length;

    // Get upcoming appointments (accepted or completed, future dates)
    const upcoming = tutorAppointments
      .filter(
        (apt: any) =>
          (apt.status === "accepted" || apt.status === "completed") &&
          new Date(apt.datetimeISO) > now
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.datetimeISO).getTime() - new Date(b.datetimeISO).getTime()
      )
      .slice(0, 5); // Limit to 5 most recent

    const upcomingCount = upcoming.length;

    // Keep one source of truth for displayed stats.
    gamificationStats.totalAppointments = totalAppointments;
    gamificationStats.completed = completedAppointments;
    gamificationStats.upcoming = upcomingCount;

    // Fetch tutee user data for the upcoming appointments
    if (upcoming.length > 0) {
      const tuteeIds = upcoming.map((apt: any) => apt.tuteeId);
      const usersResult = await fetchUsers(tuteeIds);

      if (
        usersResult.success &&
        usersResult.data &&
        usersResult.data.users &&
        Array.isArray(usersResult.data.users)
      ) {
        // Map appointment data with user names
        upcomingAppointments = upcoming.map((apt: any) => {
          const tuteeData = usersResult.data.users.find(
            (u: any) => u.id === apt.tuteeId
          );
          const appointmentDate = new Date(apt.datetimeISO);
          const endDate = apt.endDate ? new Date(apt.endDate) : null;

          return {
            id: apt._id || apt.messageId,
            tutee: tuteeData ? tuteeData.displayName : "Unknown User",
            tuteeId: tuteeData?.id || apt.tuteeId,
            subject: apt.subject || "Tutoring Session",
            appointmentType: apt.appointmentType || "single",
            startDate: appointmentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            endDate: endDate
              ? endDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : undefined,
            time: `${appointmentDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}`,
            mode: apt.mode === "online" ? "Online" : "Face-to-Face",
            status: apt.status,
            rawDate: apt.datetimeISO,
          };
        });
        
      } else {
        // Fallback: show appointments even if user data fetch failed
        upcomingAppointments = upcoming.map((apt: any) => {
          const appointmentDate = new Date(apt.datetimeISO);

          return {
            id: apt._id || apt.messageId,
            tutee: "Loading...", // Will show this if user data fails to load
            tuteeId: apt.tuteeId,
            subject: apt.subject || "Tutoring Session",
            date: appointmentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            time: `${appointmentDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })} - ${new Date(
              appointmentDate.getTime() + 60 * 60 * 1000
            ).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}`,
            mode: apt.mode === "online" ? "Online" : "Face-to-Face",
            status: apt.status,
            rawDate: apt.datetimeISO,
          };
        });
      }
    }
  } else {
    // Handle error case
    hasError = true;
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-80 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-primary/20">
                <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />
                <AvatarFallback className="text-lg">
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>

              <h2 className="text-xl font-semibold mb-2">{user.fullName}</h2>
              <p className="text-muted-foreground mb-4">@{user.username}</p>

              <Button asChild className="w-full">
                <Link href="/tutor/profile">
                  <Eye className="w-4 h-4 mr-2" />
                  View Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Gamification Level Card */}
          {gamificationProfile ? (
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-linear-to-br from-primary/20 to-primary/5" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Level Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">Level {gamificationProfile.currentLevel}</h3>
                    <p className="text-sm text-muted-foreground">
                      {gamificationProfile.totalXP} total XP
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {gamificationProfile.totalXP} XP
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to Level {gamificationProfile.currentLevel + 1}</span>
                    <span>{Math.round(((gamificationProfile.totalXP % 100) / 100) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(gamificationProfile.totalXP % 100)} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {100 - (gamificationProfile.totalXP % 100)} XP until next level
                  </p>
                </div>

                <div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/tutor/achievements">
                      <MdLeaderboard className="w-4 h-4 mr-2" />
                      View Leaderboards
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <LevelCard
              userId={user.id}
              stats={gamificationStats}
            />
          )}
          
          {/* Achievement System */}
          <AchievementSystem
            stats={gamificationStats}
          />

          {/* Availability Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Availability
              </CardTitle>
              <CardDescription>
                Your current weekly tutoring schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tutorAvailability.length > 0 ? (
                <div className="space-y-3">
                  {tutorAvailability.map((slot: any) => (
                    <div key={slot.day} className="rounded-md border p-3 space-y-1">
                      <p className="text-sm font-semibold">
                        {dayLabelMap[slot.day] || slot.day}
                      </p>
                      <div className="space-y-1">
                        {slot.timeRanges.map((range: any, idx: number) => (
                          <p key={range?.id || idx} className="text-xs text-muted-foreground">
                            {formatAvailabilityTime(
                              Number(range?.timeStart?.hourOfDay),
                              Number(range?.timeStart?.minute)
                            )}
                            {" - "}
                            {formatAvailabilityTime(
                              Number(range?.timeEnd?.hourOfDay),
                              Number(range?.timeEnd?.minute)
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No availability set yet.
                </div>
              )}

              <Button variant="outline" className="w-full" asChild>
                <Link href="/tutor/profile">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Manage Availability
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Welcome back, {user.fullName}!
            </h1>
            <p className="text-muted-foreground text-lg">
              Here's an overview of your tutoring activity and upcoming
              sessions.
            </p>
          </div>

          <Separator />

          {/* Weekly Goals */}
          {/* <WeeklyGoals 
            stats={gamificationStats}
          /> */}

          {/* Gamification Stats Overview */}
          <StatsOverview stats={gamificationStats} />

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Upcoming Appointments
              </CardTitle>
              <CardDescription>
                Your next scheduled tutoring sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appt) => (
                    <Card key={appt.id} className="p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {appt.tuteeId ? (
                              <Link href={`/profile/${appt.tuteeId}`} className="font-semibold hover:underline">
                                {appt.tutee}
                              </Link>
                            ) : (
                              <h4 className="font-semibold">{appt.tutee}</h4>
                            )}
                            {appt.status === "completed" && (
                              <Badge variant="secondary" className="text-xs">
                                Completed
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              {appt.appointmentType === "single"
                                ? "Single Session  •"
                                : "Recurring Session  •"}
                            </span>
                            <span>{appt.subject}</span>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {appt.mode === "in-person" ? "Onsite" : "Online"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {appt.startDate}{" "}
                            {appt.endDate && `- ${appt.endDate}`} • {appt.time}
                          </p>
                        </div>
                        <Button asChild size="sm">
                          <Link href="/tutor/appointments">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : hasError ? (
                  <div className="text-center py-8">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
                    <h3 className="font-medium text-destructive mb-2">
                      Unable to load appointments
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Please refresh the page or try again later
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">
                      No upcoming appointments
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      New appointment requests will appear here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Recent Reviews
              </CardTitle>
              <CardDescription>
                Latest feedback from your tutees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReviews.length > 0 ? (
                  recentReviews.map((review: any) => {
                    const reviewerId = String(review?.reviewerId || "");
                    const reviewer =
                      reviewUserMap[reviewerId] ||
                      reviewUserMap[normalizeUserId(reviewerId)];
                    const offering = reviewOfferingMap[String(review?.offerId || "")];
                    const subjectName = offering?.subject || "Subject";

                    return (
                      <Card key={review._id || `${review.appointmentId}-${review.createdAt}`} className="p-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-col gap-1">
                              {reviewer?.id ? (
                                <Link href={`/profile/${reviewer.id}`} className="font-semibold hover:underline">
                                  {reviewer?.displayName || "Anonymous Tutee"}
                                </Link>
                              ) : (
                                <h4 className="font-semibold">
                                  {reviewer?.displayName || "Anonymous Tutee"}
                                </h4>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {subjectName}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {review?.createdAt
                                ? new Date(review.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-amber-500">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`h-4 w-4 ${idx < Number(review?.rating || 0) ? "fill-current" : "text-muted-foreground/30"}`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-muted-foreground">
                              {Number(review?.rating || 0).toFixed(1)}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {review?.comment?.trim() || "No comment provided."}
                          </p>
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">No recent reviews yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Reviews from your tutees will appear here.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
