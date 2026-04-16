"use client";

import { useEffect, useMemo, useState } from "react";

interface AvailabilitySlot {
  day: string;
  timeRanges: Array<{
    id: string;
    timeStart: { hourOfDay: number; minute: number };
    timeEnd: { hourOfDay: number; minute: number };
  }>;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentDate: string;
  setAppointmentDate: (date: string) => void;
  appointmentTime: string;
  setAppointmentTime: (time: string) => void;
  appointmentDurationOption: "15" | "30" | "45" | "60" | "120" | "custom";
  setAppointmentDurationOption: (
    option: "15" | "30" | "45" | "60" | "120" | "custom"
  ) => void;
  customDurationMinutes: string;
  setCustomDurationMinutes: (minutes: string) => void;
  appointmentMode: "online" | "in-person";
  setAppointmentMode: (mode: "online" | "in-person") => void;
  appointmentType: "single" | "recurring";
  setAppointmentType: (type: "single" | "recurring") => void;
  selectedRecurringDates: string[];
  setSelectedRecurringDates: (dates: string[]) => void;
  onSend: () => void;
  isSubmitting?: boolean;
  currentUserAvailability?: AvailabilitySlot[];
  otherUserAvailability?: AvailabilitySlot[];
  subjectAvailability?: AvailabilitySlot[];
  userRole?: "tutee" | "tutor";
}

export default function AppointmentModal({
  isOpen,
  onClose,
  appointmentDate,
  setAppointmentDate,
  appointmentTime,
  setAppointmentTime,
  appointmentDurationOption,
  setAppointmentDurationOption,
  customDurationMinutes,
  setCustomDurationMinutes,
  appointmentMode,
  setAppointmentMode,
  appointmentType,
  setAppointmentType,
  selectedRecurringDates,
  setSelectedRecurringDates,
  onSend,
  isSubmitting = false,
  currentUserAvailability = [],
  otherUserAvailability = [],
  subjectAvailability = [],
  userRole = "tutee",
}: AppointmentModalProps) {
  if (!isOpen) return null;

  // Debug - log availability data with detailed info
  useEffect(() => {
    console.log("AppointmentModal - Availability updated");
    console.log("  Current user availability:", currentUserAvailability?.length || 0, "days");
    console.log("  Other user availability:", otherUserAvailability?.length || 0, "days");
    if (currentUserAvailability?.length > 0) {
      console.log("    Current user days:", currentUserAvailability.map((s) => s.day).join(", "));
    }
    if (otherUserAvailability?.length > 0) {
      console.log("    Other user days:", otherUserAvailability.map((s) => s.day).join(", "));
    }
  }, [currentUserAvailability, otherUserAvailability]);

  // Calculate minimum date (at least tomorrow to ensure 24-hour lead time)
  const getMinDate = () => {
    const now = new Date();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const minDate = getMinDate();

  const parseDateString = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const sortDateStrings = (dates: string[]) => {
    return [...dates].sort((a, b) => a.localeCompare(b));
  };

  // Helper function to get day name from date string
  const getDayNameFromDateString = (dateString: string): string => {
    const date = new Date(`${dateString}T00:00:00`);
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[date.getDay()];
  };

  // Helper function to convert time string like "08:00" to minutes from midnight
  const timeStringToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const min = parseDateString(minDate);
    return new Date(min.getFullYear(), min.getMonth(), 1);
  });

  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const normalizeDay = (day?: string) => (day || "").toLowerCase();
  const getSlotForDay = (slots: AvailabilitySlot[] = [], dayName: string) =>
    slots.find((slot) => normalizeDay(slot.day) === dayName);

  // Determine tutee and tutor availability based on userRole
  const tuteeAvailability = userRole === "tutee" ? currentUserAvailability : otherUserAvailability;
  const tutorAvailability = userRole === "tutee" ? otherUserAvailability : currentUserAvailability;

  // Helper function to check if a date has tutee + subject matched availability (GREEN)
  const isDateMatchedWithSubject = (dateString: string): boolean => {
    if (!tuteeAvailability || !subjectAvailability || subjectAvailability.length === 0) {
      return false;
    }

    const dayName = getDayNameFromDateString(dateString);
    const tuteeDaySlot = getSlotForDay(tuteeAvailability, dayName);
    const subjectDaySlot = getSlotForDay(subjectAvailability, dayName);

    return Boolean(tuteeDaySlot && subjectDaySlot);
  };

  // Helper function to check if a date has tutee + tutor matched availability (YELLOW)
  const isDateMatched = (dateString: string): boolean => {
    if (!tuteeAvailability || !tutorAvailability) return false;

    const dayName = getDayNameFromDateString(dateString);
    const tuteeDaySlot = getSlotForDay(tuteeAvailability, dayName);
    const tutorDaySlot = getSlotForDay(tutorAvailability, dayName);

    return Boolean(tuteeDaySlot && tutorDaySlot);
  };

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmptySlots = firstDayOfMonth.getDay();

    const days: Array<{
      day: number;
      dateString: string;
      isDisabled: boolean;
      isSelected: boolean;
      matchType: "none" | "tutor-tutee" | "subject-aligned";
    } | null> = [];

    for (let i = 0; i < leadingEmptySlots; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateString = formatDateString(new Date(year, month, day));
      let matchType: "none" | "tutor-tutee" | "subject-aligned" = "none";
      
      if (isDateMatchedWithSubject(dateString)) {
        matchType = "subject-aligned";
      } else if (isDateMatched(dateString)) {
        matchType = "tutor-tutee";
      }
      
      days.push({
        day,
        dateString,
        isDisabled: dateString < minDate,
        isSelected: selectedRecurringDates.includes(dateString),
        matchType,
      });
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [calendarMonth, minDate, selectedRecurringDates, currentUserAvailability, otherUserAvailability, subjectAvailability]);

  const handleToggleRecurringDate = (dateString: string) => {
    if (dateString < minDate) return;

    if (selectedRecurringDates.includes(dateString)) {
      setSelectedRecurringDates(
        selectedRecurringDates.filter((date) => date !== dateString)
      );
      return;
    }

    setSelectedRecurringDates(sortDateStrings([...selectedRecurringDates, dateString]));
  };

  const handleDateSelection = (dateString: string) => {
    if (dateString < minDate) return;

    if (appointmentType === "single") {
      setAppointmentDate(appointmentDate === dateString ? "" : dateString);
      return;
    }

    handleToggleRecurringDate(dateString);
  };

  const selectedDurationMinutes =
    appointmentDurationOption === "custom"
      ? Number(customDurationMinutes)
      : Number(appointmentDurationOption);
  const hasValidDuration =
    Number.isFinite(selectedDurationMinutes) && selectedDurationMinutes > 0;

  const canSend =
    appointmentType === "single"
      ? Boolean(appointmentDate && appointmentTime && hasValidDuration)
      : Boolean(selectedRecurringDates.length > 0 && hasValidDuration);

  const durationOptions = [
    { value: "15", label: "15 min" },
    { value: "30", label: "30 min" },
    { value: "45", label: "45 min" },
    { value: "60", label: "1 hr" },
    { value: "120", label: "2 hr" },
    { value: "custom", label: "Custom" },
  ] as const;

  const allTimeOptions = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
  ];

  // Section times for the selected date:
  // Matched = (Tutee + Subject) OR (Tutee + Tutor), Other = everything else.
  const sectionedTimes = useMemo(() => {
    if (!appointmentDate || !hasValidDuration) {
      return {
        matched: [] as string[],
        other: allTimeOptions,
      };
    }

    const dayName = getDayNameFromDateString(appointmentDate);
    const tuteeDaySlot = getSlotForDay(tuteeAvailability, dayName);
    const tutorDaySlot = getSlotForDay(tutorAvailability, dayName);
    const subjectDaySlot = getSlotForDay(subjectAvailability, dayName);

    const matched: string[] = [];
    const other: string[] = [];

    allTimeOptions.forEach((time) => {
      const startMinutes = timeStringToMinutes(time);
      const endMinutes = startMinutes + selectedDurationMinutes;

      const canFitWithinOverlap = (
        slotA?: AvailabilitySlot,
        slotB?: AvailabilitySlot
      ) => {
        if (!slotA || !slotB) return false;

        return slotA.timeRanges.some((rangeA) => {
          const rangeAStart = rangeA.timeStart.hourOfDay * 60 + rangeA.timeStart.minute;
          const rangeAEnd = rangeA.timeEnd.hourOfDay * 60 + rangeA.timeEnd.minute;

          return slotB.timeRanges.some((rangeB) => {
            const rangeBStart = rangeB.timeStart.hourOfDay * 60 + rangeB.timeStart.minute;
            const rangeBEnd = rangeB.timeEnd.hourOfDay * 60 + rangeB.timeEnd.minute;

            const overlapStart = Math.max(rangeAStart, rangeBStart);
            const overlapEnd = Math.min(rangeAEnd, rangeBEnd);

            return startMinutes >= overlapStart && endMinutes <= overlapEnd;
          });
        });
      };

      const fitsTuteeSubject = canFitWithinOverlap(tuteeDaySlot, subjectDaySlot);
      const fitsTuteeTutor = canFitWithinOverlap(tuteeDaySlot, tutorDaySlot);

      if (fitsTuteeSubject || fitsTuteeTutor) {
        matched.push(time);
      } else {
        other.push(time);
      }
    });

    return { matched, other };
  }, [
    appointmentDate,
    hasValidDuration,
    selectedDurationMinutes,
    tuteeAvailability,
    tutorAvailability,
    subjectAvailability,
  ]);

  useEffect(() => {
    if (!appointmentDate || !appointmentTime) return;

    const existsInMatched = sectionedTimes.matched.includes(appointmentTime);
    const existsInOther = sectionedTimes.other.includes(appointmentTime);

    if (!existsInMatched && !existsInOther) {
      setAppointmentTime(
        sectionedTimes.matched[0] || sectionedTimes.other[0] || "08:00"
      );
    }
  }, [appointmentDate, appointmentTime, sectionedTimes, setAppointmentTime]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-lg p-6 overflow-y-auto">
        <h3 className="text-lg font-semibold text-green-900 mb-4">
          Schedule Appointment
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Time</label>
              <select
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {sectionedTimes.matched.length > 0 && (
                  <optgroup label="Matched Times">
                    {sectionedTimes.matched.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </optgroup>
                )}
                {sectionedTimes.other.length > 0 && (
                  <optgroup label="Other Times">
                    {sectionedTimes.other.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Duration</label>
              <select
                value={appointmentDurationOption}
                onChange={(e) =>
                  setAppointmentDurationOption(
                    e.target.value as
                      | "15"
                      | "30"
                      | "45"
                      | "60"
                      | "120"
                      | "custom"
                  )
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                {durationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {appointmentDurationOption === "custom" && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Custom duration (minutes)
              </label>
              <input
                type="number"
                min={1}
                value={customDurationMinutes}
                onChange={(e) => setCustomDurationMinutes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter minutes"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mode</label>
              <select
                value={appointmentMode}
                onChange={(e) =>
                  setAppointmentMode(e.target.value as "online" | "in-person")
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="online">Online</option>
                <option value="in-person">Onsite</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Session Type
              </label>
              <select
                value={appointmentType}
                onChange={(e) =>
                  setAppointmentType(e.target.value as "single" | "recurring")
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="single">Single Session</option>
                <option value="recurring">Recurring Sessions</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {appointmentType === "single"
                  ? "Select session date"
                  : "Select recurring dates"}
              </label>
              <p className="text-xs text-gray-500">
                {appointmentType === "single"
                  ? "Choose one date for this appointment."
                  : "Pick any days you want (for example Mon, Wed, Fri)."}
              </p>
              {tuteeAvailability && tuteeAvailability.length > 0 && tutorAvailability && tutorAvailability.length > 0 && (
                <div className="text-xs mt-2 space-y-1">
                  {subjectAvailability && subjectAvailability.length > 0 ? (
                    <>
                      <p className="text-green-600">🟢 Green dates: Tutee & Subject availability aligned</p>
                      <p className="text-yellow-600">🟡 Yellow dates: Tutee & Tutor availability aligned</p>
                    </>
                  ) : (
                    <p className="text-yellow-600">🟡 Yellow dates: Tutee & Tutor availability aligned</p>
                  )}
                </div>
              )}
            </div>

            <div className="border rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() - 1,
                        1
                      )
                    )
                  }
                  className="px-2 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                >
                  Prev
                </button>
                <div className="text-sm font-medium text-gray-700">
                  {calendarMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() + 1,
                        1
                      )
                    )
                  }
                  className="px-2 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                >
                  Next
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                {weekLabels.map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="h-8" />;
                  }

                  const isSingleSelected =
                    appointmentType === "single" && appointmentDate === day.dateString;
                  const isRecurringSelected =
                    appointmentType === "recurring" && day.isSelected;
                  const isSelected = isSingleSelected || isRecurringSelected;

                  return (
                    <button
                      key={day.dateString}
                      type="button"
                      disabled={day.isDisabled}
                      onClick={() => handleDateSelection(day.dateString)}
                      className={`h-8 rounded-md text-sm transition-colors relative ${
                        isSelected
                          ? "bg-green-700 text-white"
                          : day.isDisabled
                          ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                          : day.matchType === "subject-aligned"
                          ? "bg-green-200 text-gray-700 hover:bg-green-300 font-semibold border-2 border-green-400"
                          : day.matchType === "tutor-tutee"
                          ? "bg-yellow-200 text-gray-700 hover:bg-yellow-300 font-semibold border-2 border-yellow-400"
                          : "bg-white text-gray-700 hover:bg-green-50"
                      }`}
                    >
                      {day.day}
                      {day.matchType !== "none" && <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${day.matchType === "subject-aligned" ? "bg-green-400" : "bg-yellow-400"}`}></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {appointmentType === "single" ? (
                  appointmentDate ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                      {parseDateString(appointmentDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      No date selected yet.
                    </span>
                  )
                ) : selectedRecurringDates.length === 0 ? (
                  <span className="text-xs text-gray-500">No dates selected yet.</span>
                ) : (
                  selectedRecurringDates.map((dateString) => (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => handleToggleRecurringDate(dateString)}
                      className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 hover:bg-green-200"
                    >
                      {parseDateString(dateString).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </button>
                  ))
                )}
              </div>

              {appointmentType === "single" && appointmentDate && (
                <button
                  type="button"
                  onClick={() => setAppointmentDate("")}
                  className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Clear
                </button>
              )}

              {appointmentType === "recurring" && selectedRecurringDates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedRecurringDates([])}
                  className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Clear
                </button>
              )}
            </div>

            {appointmentDurationOption === "custom" && !hasValidDuration && (
              <p className="text-xs text-red-600">Enter a valid custom duration.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={!canSend || isSubmitting}
            className="px-4 py-2 rounded-lg bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
