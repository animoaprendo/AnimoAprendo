import React from "react";
import { fetchTuteeAppointments } from "@/app/actions";
import { auth } from "@clerk/nextjs/server";
import TuteeAppointmentsClient from "./TuteeAppointmentsClient";

export default async function AppointmentsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    return (
      <div className="w-11/12 mx-auto py-8 text-center">
        <div className="bg-white p-12 rounded-2xl shadow-lg">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">Authentication Required</h3>
          <p className="text-gray-500">Please sign in to view your appointments.</p>
        </div>
      </div>
    );
  }

  const appointmentsResult = await fetchTuteeAppointments(userId);

  if (!appointmentsResult.success) {
    return (
      <div className="w-11/12 mx-auto py-8 text-center">
        <div className="bg-white p-12 rounded-2xl shadow-lg">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">Error Loading Appointments</h3>
          <p className="text-red-500">{appointmentsResult.error}</p>
        </div>
      </div>
    );
  }

  const events = appointmentsResult.appointments || [];

  return (
    <TuteeAppointmentsClient initialEvents={events} />
  );
}
