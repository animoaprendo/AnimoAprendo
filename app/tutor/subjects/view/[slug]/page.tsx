"use client";
import { getOffer, getOffers } from "@/app/tutor/actions";
import RadialProgress from "@/components/radial-progress";
import RatingGFX from "@/components/star-rating";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { FaArrowAltCircleLeft } from "react-icons/fa";

export default function TutorViewSubject({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useUser();
  const userId = user?.id;

  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const result = await getOffer(userId, slug);
      setData(result.data || []);
    }
    if (userId) fetchData();
  }, [userId]);

  // Use the first subject only
  const item = data[0];

  // Dummy stats
  const rating = 4.3;
  const ratio = 0.27;

  return (
    <div className="flex flex-col gap-6 w-10/12 mx-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center">
        <Link
          href={"/tutor/subjects"}
          className="flex flex-row items-center gap-2 text-lg text-green-700 font-semibold hover:underline"
        >
          <FaArrowAltCircleLeft /> Back to Subjects
        </Link>
        <div className="flex flex-row gap-2 *:px-4 *:py-2 *:rounded-xl *:cursor-pointer">
          <div className="bg-amber-200 hover:bg-amber-300">Edit</div>
          <div className="bg-red-800 text-white hover:bg-red-700">Delete</div>
        </div>
      </div>

      {/* Subject Section */}
      <section className="flex flex-wrap gap-8">
        {/* Left: Banner + Description */}
        <div className="flex-1 min-w-[300px] rounded-2xl overflow-hidden shadow-lg bg-white">
          <figure className="h-72 w-full">
            <Image
              src={
                item && item.banner && item.banner.trim() !== ""
                  ? item.banner
                  : "https://placehold.co/1200x1200.png?text=No+Image"
              }
              alt={item?.subject}
              width={600}
              height={300}
              className="w-full h-full object-cover"
            />
          </figure>

          <div className="p-6 space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-green-900">
              {item?.subject}
            </h1>
            <div
              className="prose prose-sm max-w-none text-gray-700 [&_li[data-list='ordered']]:list-decimal [&_li[data-list='ordered']]:pl-6 [&_li[data-list='bullet']]:list-disc [&_li[data-list='bullet']]:pl-6 [&_.ql-ui]:hidden"
              dangerouslySetInnerHTML={{ __html: item?.description }}
            />

            {item?.availability.length > 0 && (
              <div className="mt-4">
                <h2 className="font-semibold text-lg">Availability</h2>
                <ul className="flex flex-wrap gap-2 mt-2">
                  {item?.availability.map((slot: any) => (
                    <li
                      key={slot.id}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                    >
                      {slot.day} {slot.start}–{slot.end}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right: Statistics */}
        <div className="flex flex-col gap-6 items-center p-6 rounded-2xl shadow-xl bg-neutral-100 min-w-[250px] h-fit">
          <h1 className="font-bold text-xl">Course Statistics</h1>
          <RadialProgress
            value={(rating / 5) * 100}
            text={rating.toFixed(1)}
            label="Rating"
          />
          <RadialProgress
            value={ratio * 100}
            text={`${(ratio * 100).toFixed(1)}%`}
            label="View → Appointment Ratio"
          />
        </div>
      </section>
    </div>
  );
}
