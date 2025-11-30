import Image from "next/image";
import RatingGFX from "./star-rating";
import { Key } from "react";
import Link from "next/link";
import { StarIcon } from "@heroicons/react/20/solid";
import TutorRank from "./ui/rank";

interface CardInfo {
  Title: string;
  Image: string;
  Description: string;
  Rating: number;
  ExtraInfo: { Day: string; Time: string }[];
  TutorInfo: {
    UserId: string;
    Name: string;
    Image: string;
    Rank: number;
    Rating: number;
  };
  Reviews: {
    Image: string;
    Name: string;
    Username: string;
    Rating: number;
    Comment: string;
  }[];
}

export default function SubjectCardTemplate(item: CardInfo, i: Key) {
  return (
    <Link
      href={"/tutee/browse/" + i.toString()}
      key={i}
      className="card bg-base-100 shadow-sm rounded-xl overflow-hidden"
    >
      <figure className="h-fit">
        <Image
          src={item.Image}
          alt=""
          width={500}
          height={500}
          className="w-full aspect-video object-cover"
        />
      </figure>
      <div className="card-body bg-green-50">
        <div className="flex gap-2 items-center w-full">
          <img
            src={item.TutorInfo.Image}
            alt=""
            className="rounded-full h-8 aspect-square object-cover"
          />
          {item.TutorInfo.Name}
          <TutorRank rank={item.TutorInfo.Rank} />
        </div>
        <hr />
        <span className="flex flex-row items-center gap-1 font-semibold text-black/80"><StarIcon className="size-5"/> {item.Rating.toFixed(1)}</span>
        <h2 className="line-clamp-2 font-bold text-lg grow max-h-[3em]">
          {item.Title}
        </h2>
        <ul className="flex flex-wrap mt-auto gap-1 *:rounded-full *:shadow-md *:px-2 *:py-0.5 *w-fit-content *:text-nowrap overflow-x-auto overflow-y-visible scroll no-scrollbar *:grow *:basis-0 *:text-center">
          {item.ExtraInfo.map((info, i) => (
            <li
              key={i}
              className={
                info.Day == "Monday"
                  ? "bg-amber-300"
                  : info.Day == "Tuesday"
                    ? "bg-blue-400"
                    : info.Day == "Wednesday"
                      ? "bg-emerald-400"
                      : info.Day == "Thursday"
                        ? "bg-fuchsia-300"
                        : info.Day == "Friday"
                          ? "bg-indigo-300"
                          : info.Day == "Saturday"
                            ? "bg-red-300"
                            : info.Day == "Sunday"
                              ? "bg-teal-300"
                              : "bg-neutral"
              }
            >
              {info.Day} {info.Time}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
