"use client";

type Props = {
  titleComplete: boolean;
  descriptionComplete: boolean;
  availabilityComplete: boolean;
  bannerComplete: boolean;
  description: number;
  DESCRIPTION_LENGTH: number;
  QUIZ_COMPLETED: number;
};

export default function CompletionChecklist({
  titleComplete,
  descriptionComplete,
  availabilityComplete,
  bannerComplete,
  description,
  DESCRIPTION_LENGTH,
  QUIZ_COMPLETED
}: Props) {
  const items = [
    { label: "Title", complete: titleComplete },
    { label: `Description ${description}/${DESCRIPTION_LENGTH}`, complete: descriptionComplete },
    { label: "Schedule Availability", complete: availabilityComplete },
    { label: "Upload Banner", complete: bannerComplete },
    // {
    //   label: `Quizzes created (${totalQuizzes}/${QUIZ_COMPLETED})`,
    //   complete: totalQuizzes >= QUIZ_COMPLETED,
    // },
  ];

  return (
    <div className="md:col-span-1 text-lg">
      <h3 className="font-semibold mb-3 select-none">Completion Checklist</h3>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li
            key={idx}
            className={`flex items-center gap-2 select-none ${
              item.complete ? "text-green-600" : "text-red-500"
            }`}
          >
            {item.complete ? "✔️" : "❌"} {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
