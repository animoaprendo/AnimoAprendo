"use client";
import { useParams, useRouter } from "next/navigation";
import React, { use, useState } from "react";
import { ArrowLeft, Clock, Star } from "lucide-react";
import Stepper, { Step } from "@/components/reactbits/stepper";
import { PiPauseCircle, PiWarningBold } from "react-icons/pi";
import Link from "next/link";

interface Availability {
  id: string;
  day: string;
  start: string;
  end: string;
}

interface CardInfo {
  _id: { $oid: string };
  userId: string;
  subject: string;
  description: string;
  availability: Availability[];
  banner: string;
  status: string;
}

const mockOffers: CardInfo[] = [
  {
    _id: { $oid: "68e124f6ca2cd032c7132635" },
    userId: "user_32v6ZOB8bP3oHl5kBPSDgvxc7eG",
    subject: "Mathematics",
    description:
      "<p>Get help with algebra, geometry, and advanced calculus from an experienced tutor.</p>",
    availability: [
      { id: "1", day: "Monday", start: "08:00", end: "09:00" },
      { id: "2", day: "Wednesday", start: "13:00", end: "14:00" },
    ],
    banner:
      "https://9idxhts2vbwdh6hb.public.blob.vercel-storage.com/keikchoco2-O9gw3FUynxpw5S2mxxD61TTgm4E5ln.jpg",
    status: "available",
  },
  {
    _id: { $oid: "68e124f6ca2cd032c7132636" },
    userId: "user_65ds9d7c8bP3oHl5kBPSDgvxc7eG",
    subject: "Physics",
    description:
      "<p>Master motion, energy, and waves with practical examples and problem-solving sessions.</p>",
    availability: [{ id: "1", day: "Tuesday", start: "10:00", end: "11:30" }],
    banner:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200",
    status: "paused",
  },
];

const mockReviews = [
  {
    id: 1,
    name: "John Smith",
    image: "https://i.pravatar.cc/100?img=1",
    rating: 5,
    comment: "Very patient and clear explanations! Highly recommend.",
  },
  {
    id: 2,
    name: "Emily Johnson",
    image: "https://i.pravatar.cc/100?img=2",
    rating: 4,
    comment: "Helped me understand complex topics in a short time.",
  },
  {
    id: 3,
    name: "Michael Brown",
    image: "https://i.pravatar.cc/100?img=3",
    rating: 5,
    comment: "Great tutor, really knows how to make learning fun!",
  },
  {
    id: 4,
    name: "Sarah Lee",
    image: "https://i.pravatar.cc/100?img=4",
    rating: 5,
    comment: "Explains every detail clearly and makes sure you understand.",
  },
  {
    id: 5,
    name: "David Wilson",
    image: "https://i.pravatar.cc/100?img=5",
    rating: 4,
    comment: "Really good tutor, would definitely book again.",
  },
  {
    id: 6,
    name: "Jessica Taylor",
    image: "https://i.pravatar.cc/100?img=6",
    rating: 5,
    comment: "Very knowledgeable and kind. The sessions were great!",
  },
  {
    id: 7,
    name: "Chris Evans",
    image: "https://i.pravatar.cc/100?img=7",
    rating: 4,
    comment: "Enjoyed the lessons and learned a lot. Thank you!",
  },
  {
    id: 8,
    name: "Alex Kim",
    image: "https://i.pravatar.cc/100?img=8",
    rating: 5,
    comment: "The best tutor I’ve ever had. Excellent pacing.",
  },
  {
    id: 9,
    name: "Olivia Martinez",
    image: "https://i.pravatar.cc/100?img=9",
    rating: 4,
    comment: "Very helpful and approachable!",
  },
  {
    id: 10,
    name: "Liam Chen",
    image: "https://i.pravatar.cc/100?img=10",
    rating: 5,
    comment: "Learned so much in just a few sessions!",
  },
  {
    id: 10,
    name: "Liam Chen",
    image: "https://i.pravatar.cc/100?img=10",
    rating: 5,
    comment: "Learned so much in just a few sessions!",
  },
  {
    id: 10,
    name: "Liam Chen",
    image: "https://i.pravatar.cc/100?img=10",
    rating: 5,
    comment: "Learned so much in just a few sessions!",
  },
  {
    id: 10,
    name: "Liam Chen",
    image: "https://i.pravatar.cc/100?img=10",
    rating: 5,
    comment: "Learned so much in just a few sessions!",
  },
  {
    id: 10,
    name: "Liam Chen",
    image: "https://i.pravatar.cc/100?img=10",
    rating: 5,
    comment: "Learned so much in just a few sessions!",
  },
];

export default function OfferDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  // NEW: track how many reviews are visible
  const [visibleCount, setVisibleCount] = useState(5);

  const offer = mockOffers.find((offer) => offer._id.$oid === slug);

  if (!offer) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center text-green-900">
        <p className="text-2xl font-bold">Offer not found</p>
        <button
          onClick={() => router.push("/browse")}
          className="mt-4 btn btn-outline border-green-900 text-green-900 hover:bg-green-900 hover:text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (offer.status === "paused") {
    return (
      <Stepper
        initialStep={1}
        stepCircleContainerClassName="bg-white/95"
        disableStepIndicators={true}
        footerClassName="hidden"
      >
        <Step>
          <div className="flex flex-col items-center gap-8 mb-6">
            <PiPauseCircle className="text-red-700 size-12 -mb-4" />
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-center font-bold text-2xl">Offer Paused</h1>
              <p className="text-lg text-center">
                It looks like the tutor has paused this offer. Please check back
                later or explore other available offers.
              </p>
            </div>
            <Link
              href={"/browse"}
              className="bg-green-700 hover:bg-green-600 text-white/95 hover:scale-105 transition-all rounded-2xl shadow font-bold px-4 py-3"
              replace={true}
            >
              Go Back
            </Link>
          </div>
        </Step>
      </Stepper>
    );
  }

  const buttonLabel = offer.status === "available" ? "Chat Now" : "Inquire Now";
  const visibleReviews = mockReviews.slice(0, visibleCount);

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 5, mockReviews.length));
  };

  const handleShowLess = () => {
    setVisibleCount(5);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b text-green-900 w-full">
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-[86rem] mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-green-800 hover:text-green-900 hover:cursor-pointer col-span-full text-lg font-semibold"
        >
          <ArrowLeft size={24} /> Back
        </button>

        {/* Left/Main Content */}
        <div className="flex flex-col gap-4 md:col-span-2">
          <img
            src={offer.banner}
            alt={offer.subject}
            className="w-full h-96 object-cover rounded-2xl shadow-md"
          />
          <div className="p-6 bg-white rounded-2xl shadow-lg">
            <h1 className="text-3xl font-bold mb-2">{offer.subject}</h1>
            <div
              className="text-green-800 text-sm leading-relaxed mb-4"
              dangerouslySetInnerHTML={{ __html: offer.description }}
            />
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">Availability</h2>
              <div className="space-y-2">
                {offer.availability.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-2 bg-green-50 p-2 rounded-lg"
                  >
                    <Clock size={16} className="text-green-700" />
                    <span>
                      {slot.day}: {slot.start} - {slot.end}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Link
              className={`btn mt-6 w-full py-3 rounded-xl text-white font-semibold transition ${
              offer.status === "available"
                ? "bg-green-700 hover:bg-green-800"
                : "bg-gray-400 cursor-not-allowed"
              }`}
              href={
              offer.status === "available"
                ? `/chat/${offer.userId.replace(/^user_/, "")}`
                : "#"
              }
              onClick={(e) => {
              if (offer.status !== "available") e.preventDefault();
              }}
            >
              {buttonLabel}
            </Link>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="font-bold text-lg mb-3">Tutor Information</h2>
            <div className="flex items-center gap-4">
              <img
                src="https://i.pravatar.cc/100?img=12"
                alt="Tutor"
                className="w-16 h-16 rounded-full border-4 border-green-700"
              />
              <div>
                <p className="font-semibold text-green-900">Jane Doe</p>
                <p className="text-sm text-green-700">Mathematics Tutor</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="font-bold text-lg mb-3">Reminders</h2>
            <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
              <li>Confirm your schedule before booking.</li>
              <li>Be prepared with topics you want to cover.</li>
              <li>Respect the tutor’s available hours.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="max-w-7xl mx-auto mt-10 px-6">
        <h2 className="text-2xl font-bold text-green-900 mb-6">⭐ Reviews</h2>
        <div className="space-y-6">
          {visibleReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white p-5 rounded-2xl shadow-md flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={review.image}
                  alt={review.name}
                  className="w-12 h-12 rounded-full border-2 border-green-700"
                />
                <div>
                  <p className="font-semibold text-green-900">{review.name}</p>
                  <div className="flex items-center">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className="text-yellow-500 fill-yellow-500"
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-green-800 leading-relaxed">
                {review.comment}
              </p>
            </div>
          ))}
        </div>

        {mockReviews.length > 5 && (
          <div className="flex justify-center mt-6">
            {visibleCount < mockReviews.length ? (
              <button
                onClick={handleShowMore}
                className="text-green-800 font-semibold hover:underline"
              >
                See More
              </button>
            ) : (
              <button
                onClick={handleShowLess}
                className="text-green-800 font-semibold hover:underline"
              >
                See Less
              </button>
            )}
          </div>
        )}
      </div>

      {/* Other Offers Section */}
      <div className="max-w-7xl mx-auto mt-16 mb-10 px-6">
        <h2 className="text-2xl font-bold text-green-900 mb-6">
          📚 Other Offers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockOffers
            .filter((o) => o._id.$oid !== offer._id.$oid)
            .map((other) => (
              <div
                key={other._id.$oid}
                onClick={() => router.push(`/browse/${other._id.$oid}`)}
                className="cursor-pointer bg-white p-4 rounded-2xl shadow-md hover:scale-[1.02] transition-transform"
              >
                <img
                  src={other.banner}
                  alt={other.subject}
                  className="w-full h-40 object-cover rounded-xl mb-3"
                />
                <h3 className="font-bold text-green-900 text-lg mb-1">
                  {other.subject}
                </h3>
                <p
                  className="text-sm text-green-800 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: other.description }}
                />
                <button className="mt-3 w-full bg-green-700 hover:bg-green-800 text-white rounded-lg py-2 font-semibold">
                  View Offer
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
