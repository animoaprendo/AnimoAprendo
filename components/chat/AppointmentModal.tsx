"use client";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentDate: string;
  setAppointmentDate: (date: string) => void;
  appointmentTime: string;
  setAppointmentTime: (time: string) => void;
  appointmentMode: "online" | "in-person";
  setAppointmentMode: (mode: "online" | "in-person") => void;
  appointmentType: "single" | "recurring";
  setAppointmentType: (type: "single" | "recurring") => void;
  appointmentEndDate: string;
  setAppointmentEndDate: (date: string) => void;
  onSend: () => void;
}

export default function AppointmentModal({
  isOpen,
  onClose,
  appointmentDate,
  setAppointmentDate,
  appointmentTime,
  setAppointmentTime,
  appointmentMode,
  setAppointmentMode,
  appointmentType,
  setAppointmentType,
  appointmentEndDate,
  setAppointmentEndDate,
  onSend
}: AppointmentModalProps) {
  if (!isOpen) return null;

  // Calculate minimum date (at least tomorrow to ensure 24-hour lead time)
  const getMinDate = () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate minimum end date (day after start date)
  const getMinEndDate = () => {
    if (!appointmentDate) return getMinDate();
    const startDate = new Date(appointmentDate);
    const nextDay = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    return nextDay.toISOString().split('T')[0];
  };

  const timeOptions = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">
          Schedule Appointment
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                min={getMinDate()}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Time
              </label>
              <select
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
          
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
              <label className="block text-sm text-gray-600 mb-1">Session Type</label>
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

          {appointmentType === "recurring" && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={appointmentEndDate}
                onChange={(e) => setAppointmentEndDate(e.target.value)}
                min={getMinEndDate()}
                className="w-full border rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sessions will occur daily at the same time until this date
              </p>
            </div>
          )}
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
            className="px-4 py-2 rounded-lg bg-green-700 text-white"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}