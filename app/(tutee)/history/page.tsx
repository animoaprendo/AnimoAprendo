import React from "react";
import { fetchTuteeHistory } from "@/app/actions";
import { auth } from "@clerk/nextjs/server";
import TuteeHistoryClient from "./TuteeHistoryClient";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Lock } from "lucide-react";

export default async function History() {
  const { userId } = await auth();
  
  if (!userId) {
    return (
      <div className="w-11/12 mx-auto py-8 text-center">
        <Card>
          <CardContent className="p-12">
            <Lock className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Authentication Required</h3>
            <p className="text-gray-500">Please sign in to view your session history.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const historyResult = await fetchTuteeHistory(userId);

  if (!historyResult.success) {
    return (
      <div className="w-11/12 mx-auto py-8 text-center">
        <Card>
          <CardContent className="p-12">
            <AlertCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Error Loading History</h3>
            <p className="text-red-500">{historyResult.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const history = historyResult.history || [];
  const statistics = historyResult.statistics || {
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0
  };

  return (
    <TuteeHistoryClient 
      initialHistory={history}
      initialStatistics={statistics}
    />
  );
}
