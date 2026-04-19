import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  MessageSquare,
  Star,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import clientPromise from "@/lib/mongodb";

type PageProps = {
  params: Promise<{ userId: string }>;
};

type UserRecord = {
  _id?: string;
  id?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  username?: string;
  image_url?: string;
  profile_image_url?: string;
  imageUrl?: string;
  email_addresses?: { email_address?: string }[];
  public_metadata?: Record<string, any>;
  publicMetadata?: Record<string, any>;
};

type OfferingRecord = {
  _id: string;
  subject?: string;
  description?: string;
  userId?: string;
  status?: string;
  availability?: { day?: string; start?: string; end?: string }[];
};

type ReviewRecord = {
  _id: string;
  appointmentId?: string;
  offerId?: string;
  rating?: number;
  comment?: string;
  reviewerId?: string;
  reviewerType?: "tutor" | "tutee";
  tutorId?: string;
  tuteeId?: string;
  createdAt?: string;
};

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function normalizeUserId(userId?: string | null): string {
  return String(userId || "").replace(/^user_/, "").trim().toLowerCase();
}

function capitalize(word: string): string {
  if (!word) return "";
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

function formatDate(value?: string): string {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatYearLevel(value: unknown): string {
  if (value === null || value === undefined) return "N/A";

  const raw = String(value).trim();
  if (!raw) return "N/A";

  const match = raw.match(/\d+/);
  if (!match) return raw;

  const year = Number(match[0]);
  if (!Number.isFinite(year) || year <= 0) return raw;

  const mod100 = year % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[year % 10] || "th";

  return `${year}${suffix} year`;
}

function formatAvailabilityPreview(availability: OfferingRecord["availability"]): string {
  if (!Array.isArray(availability) || availability.length === 0) {
    return "No schedule listed";
  }

  const uniqueDays = new Set(
    availability
      .map((slot) => String(slot?.day || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const orderedDays = WEEK_DAYS.filter((day) => uniqueDays.has(day)).map(capitalize);
  if (orderedDays.length === 0) {
    return `${availability.length} time slot${availability.length !== 1 ? "s" : ""}`;
  }

  return `${orderedDays.join(", ")} (${availability.length} slot${availability.length !== 1 ? "s" : ""})`;
}

function averageRating(reviews: ReviewRecord[]): number {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return total / reviews.length;
}

function buildDisplayName(user?: UserRecord | null): string {
  const firstName = user?.first_name || user?.firstName || "";
  const lastName = user?.last_name || user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user?.username || "Unknown User";
}

async function getProfileData(userIdParam: string) {
  const client = await clientPromise;
  const db = client.db("main");

  const usersCollection = db.collection<UserRecord>("users");
  const subjectsCollection = db.collection<OfferingRecord>("subjects");
  const reviewsCollection = db.collection<ReviewRecord>("reviews");

  const normalizedTargetUserId = normalizeUserId(userIdParam);
  const prefixedTargetUserId = `user_${normalizedTargetUserId}`;

  const user = await usersCollection.findOne({
    $or: [
      { id: userIdParam },
      { id: prefixedTargetUserId },
      { _id: userIdParam },
      { _id: normalizedTargetUserId },
      { _id: prefixedTargetUserId },
    ],
  });

  if (!user) {
    return null;
  }

  const canonicalUserId = String(user.id || user._id || userIdParam);
  const normalizedCanonicalUserId = normalizeUserId(canonicalUserId);

  const userIdCandidates = [
    canonicalUserId,
    normalizedCanonicalUserId,
    `user_${normalizedCanonicalUserId}`,
  ].filter(Boolean);

  const offerings = await subjectsCollection
    .find({
      userId: { $in: userIdCandidates },
      status: "available",
    })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  const allRelatedReviews = await reviewsCollection
    .find({
      $or: [
        { tutorId: { $in: userIdCandidates } },
        { tuteeId: { $in: userIdCandidates } },
      ],
    })
    .sort({ createdAt: -1 })
    .toArray();

  const tutorReceivedReviews = allRelatedReviews.filter((review) => {
    const sameTutor = normalizeUserId(review.tutorId) === normalizedCanonicalUserId;
    return sameTutor && review.reviewerType === "tutee";
  });

  const tuteeReceivedReviews = allRelatedReviews.filter((review) => {
    const sameTutee = normalizeUserId(review.tuteeId) === normalizedCanonicalUserId;
    return sameTutee && review.reviewerType === "tutor";
  });

  const reviewerIds = Array.from(
    new Set(
      [...tutorReceivedReviews, ...tuteeReceivedReviews]
        .map((review) => String(review.reviewerId || ""))
        .filter(Boolean)
    )
  );

  const normalizedReviewerIds = reviewerIds.map((id) => normalizeUserId(id));
  const prefixedReviewerIds = normalizedReviewerIds.map((id) => `user_${id}`);

  const reviewers = reviewerIds.length
    ? await usersCollection
        .find({
          $or: [
            { id: { $in: reviewerIds } },
            { id: { $in: prefixedReviewerIds } },
            { _id: { $in: reviewerIds } },
            { _id: { $in: normalizedReviewerIds } },
            { _id: { $in: prefixedReviewerIds } },
          ],
        })
        .toArray()
    : [];

  const reviewerMap = new Map<string, UserRecord>();
  for (const reviewer of reviewers) {
    const idKey = normalizeUserId(String(reviewer.id || reviewer._id || ""));
    if (idKey) {
      reviewerMap.set(idKey, reviewer);
    }
  }

  const offeringIds = offerings.map((offering) => String(offering._id));
  const ratingRows =
    offeringIds.length > 0
      ? await reviewsCollection
          .aggregate<{ _id: string; avgRating: number; totalReviews: number }>([
            {
              $match: {
                offerId: { $in: offeringIds },
                reviewerType: "tutee",
              },
            },
            {
              $group: {
                _id: "$offerId",
                avgRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 },
              },
            },
          ])
          .toArray()
      : [];

  const offeringRatingsMap = new Map(
    ratingRows.map((row) => [
      row._id,
      {
        avgRating: Number(row.avgRating || 0),
        totalReviews: Number(row.totalReviews || 0),
      },
    ])
  );

  return {
    user,
    canonicalUserId,
    offerings,
    tutorReceivedReviews,
    tuteeReceivedReviews,
    reviewerMap,
    offeringRatingsMap,
  };
}

function ReviewCard({
  review,
  reviewerName,
  reviewerImage,
}: {
  review: ReviewRecord;
  reviewerName: string;
  reviewerImage?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7">
              <AvatarImage src={reviewerImage} alt={reviewerName} />
              <AvatarFallback>{reviewerName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-sm font-medium truncate">{reviewerName}</p>
          </div>
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
            {Number(review.rating || 0).toFixed(1)}
          </Badge>
        </div>

        {review.comment ? (
          <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">No written comment</p>
        )}

        <div className="text-xs text-gray-500">{formatDate(review.createdAt)}</div>
      </CardContent>
    </Card>
  );
}

export default async function UserProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const profileData = await getProfileData(userId);

  if (!profileData) {
    notFound();
  }

  const { user, offerings, tutorReceivedReviews, tuteeReceivedReviews, reviewerMap, offeringRatingsMap } = profileData;

  const metadata = (user.public_metadata || user.publicMetadata || {}) as Record<string, any>;
  const collegeInformation = metadata.collegeInformation || {};
  const profileRole = metadata.role || metadata.accountType || "user";
  const isVerifiedTutor = Boolean(metadata.verified);

  const displayName = buildDisplayName(user);
  const profileImage = user.image_url || user.profile_image_url || user.imageUrl;
  const initials = displayName.charAt(0).toUpperCase() || "U";

  const tutorAvg = averageRating(tutorReceivedReviews);
  const tuteeAvg = averageRating(tuteeReceivedReviews);

  const hasAcademicInfo =
    Boolean(collegeInformation.college) ||
    Boolean(collegeInformation.department) ||
    Boolean(collegeInformation.yearLevel) ||
    Boolean(collegeInformation.section);

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
            <Avatar className="h-20 w-20 border">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold truncate">{displayName}</h1>
                <Badge variant="secondary" className="capitalize">{String(profileRole)}</Badge>
                {isVerifiedTutor ? <Badge className="bg-green-600 hover:bg-green-600">Verified</Badge> : null}
              </div>

              {user.username ? <p className="text-sm text-muted-foreground">@{user.username}</p> : null}

              {metadata.bio ? <p className="text-sm text-gray-700 leading-relaxed">{String(metadata.bio)}</p> : null}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-gray-500">Current offerings</p>
                    <p className="text-xl font-semibold">{offerings.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-gray-500">Tutor rating</p>
                    <p className="text-xl font-semibold">{tutorReceivedReviews.length ? tutorAvg.toFixed(1) : "N/A"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-gray-500">Tutor reviews</p>
                    <p className="text-xl font-semibold">{tutorReceivedReviews.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-gray-500">Tutee rating</p>
                    <p className="text-xl font-semibold">{tuteeReceivedReviews.length ? tuteeAvg.toFixed(1) : "N/A"}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Academic info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {hasAcademicInfo ? (
                  <>
                    <p><span className="text-gray-500">College:</span> {collegeInformation.college || "N/A"}</p>
                    <p><span className="text-gray-500">Department:</span> {collegeInformation.department || "N/A"}</p>
                    <p><span className="text-gray-500">Year Level:</span> {formatYearLevel(collegeInformation.yearLevel)}</p>
                  </>
                ) : (
                  <p className="text-gray-500">No academic details available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Availability snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {offerings.length > 0 ? (
                  <p className="text-gray-700">
                    Active across {new Set(offerings.flatMap((offering) => (offering.availability || []).map((slot) => String(slot?.day || "").toLowerCase()).filter(Boolean))).size} day(s)
                    with {offerings.reduce((sum, offering) => sum + (offering.availability?.length || 0), 0)} listed time slot(s).
                  </p>
                ) : (
                  <p className="text-gray-500">No active offerings to derive availability from.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Current offerings
          </CardTitle>
          <CardDescription>Subjects this tutor is currently offering.</CardDescription>
        </CardHeader>
        <CardContent>
          {offerings.length === 0 ? (
            <p className="text-sm text-gray-500">No active offerings available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offerings.map((offering) => {
                const offeringRating = offeringRatingsMap.get(String(offering._id));
                return (
                  <Card key={String(offering._id)}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{offering.subject || "Untitled subject"}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatAvailabilityPreview(offering.availability)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                          {offeringRating?.avgRating ? offeringRating.avgRating.toFixed(1) : "N/A"}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-700 line-clamp-2">
                        {offering.description?.replace(/<[^>]+>/g, "") || "No description provided"}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {offeringRating?.totalReviews || 0} review{(offeringRating?.totalReviews || 0) !== 1 ? "s" : ""}
                        </span>
                        <Link href={`/browse/${offering._id}`} className="text-xs font-medium text-blue-600 hover:underline">
                          View offering
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Reviews as tutor
            </CardTitle>
            <CardDescription>Feedback this user received from tutees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tutorReceivedReviews.length === 0 ? (
              <p className="text-sm text-gray-500">No tutor reviews yet.</p>
            ) : (
              tutorReceivedReviews.slice(0, 10).map((review) => {
                const reviewer = reviewerMap.get(normalizeUserId(review.reviewerId));
                const reviewerName = buildDisplayName(reviewer) || "Anonymous";
                const reviewerImage = reviewer?.image_url || reviewer?.profile_image_url || reviewer?.imageUrl;

                return (
                  <ReviewCard
                    key={String(review._id)}
                    review={review}
                    reviewerName={reviewerName}
                    reviewerImage={reviewerImage}
                  />
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Reviews as tutee
            </CardTitle>
            <CardDescription>Feedback this user received from tutors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tuteeReceivedReviews.length === 0 ? (
              <p className="text-sm text-gray-500">No tutee reviews yet.</p>
            ) : (
              tuteeReceivedReviews.slice(0, 10).map((review) => {
                const reviewer = reviewerMap.get(normalizeUserId(review.reviewerId));
                const reviewerName = buildDisplayName(reviewer) || "Anonymous";
                const reviewerImage = reviewer?.image_url || reviewer?.profile_image_url || reviewer?.imageUrl;

                return (
                  <ReviewCard
                    key={String(review._id)}
                    review={review}
                    reviewerName={reviewerName}
                    reviewerImage={reviewerImage}
                  />
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
