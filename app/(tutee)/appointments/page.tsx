import React from "react";
import { fetchTuteeAppointments } from "@/app/actions";
import { auth } from "@clerk/nextjs/server";
import TuteeAppointmentsClient from "./TuteeAppointmentsClient";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, AlertCircle } from "lucide-react";

export default async function AppointmentsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    return (
      <div className="w-11/12 mx-auto py-8 text-center">
        <Card>
          <CardContent className="p-12">
            <Lock className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Authentication Required</h3>
            <p className="text-gray-500">Please sign in to view your appointments.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appointmentsResult = await fetchTuteeAppointments(userId);

  if (!appointmentsResult.success) {
    return (
      <div className="w-11/12 mx-auto py-8 text-center">
        <Card>
          <CardContent className="p-12">
            <AlertCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Error Loading Appointments</h3>
            <p className="text-red-500">{appointmentsResult.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const events = appointmentsResult.appointments || [];

  return (
    <TuteeAppointmentsClient initialEvents={events} />
  );
}
