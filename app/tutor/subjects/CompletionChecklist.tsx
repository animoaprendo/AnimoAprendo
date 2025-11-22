"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";

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
    { label: "Subject Title", complete: titleComplete },
    { label: `Description (${description}/${DESCRIPTION_LENGTH})`, complete: descriptionComplete },
    { label: "Schedule Availability", complete: availabilityComplete },
    { label: "Banner Image", complete: bannerComplete },
  ];

  const completedItems = items.filter(item => item.complete).length;
  const progress = (completedItems / items.length) * 100;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Progress</h3>
          <span className="text-sm text-muted-foreground">
            {completedItems}/{items.length} completed
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {progress === 100 ? "Ready to submit!" : "Complete all items to enable submission"}
        </p>
      </div>

      <div>
        <h4 className="font-medium mb-3 text-base">Completion Checklist</h4>
        <ul className="space-y-3">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 text-sm"
            >
              {item.complete ? (
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={item.complete ? "text-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
