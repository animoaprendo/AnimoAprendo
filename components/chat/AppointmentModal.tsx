"use client";

import { useMemo, useState } from "react";

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
}: AppointmentModalProps) {
  if (!isOpen) return null;

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

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const min = parseDateString(minDate);
    return new Date(min.getFullYear(), min.getMonth(), 1);
  });

  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    } | null> = [];

    for (let i = 0; i < leadingEmptySlots; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateString = formatDateString(new Date(year, month, day));
      days.push({
        day,
        dateString,
        isDisabled: dateString < minDate,
        isSelected: selectedRecurringDates.includes(dateString),
      });
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [calendarMonth, minDate, selectedRecurringDates]);

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

  const timeOptions = [
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
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
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
                <option value="in-person">In-person</option>
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
                      className={`h-8 rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-green-700 text-white"
                          : day.isDisabled
                          ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                          : "bg-white text-gray-700 hover:bg-green-50"
                      }`}
                    >
                      {day.day}
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
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={!canSend}
            className="px-4 py-2 rounded-lg bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
