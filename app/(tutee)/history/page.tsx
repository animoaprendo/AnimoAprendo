import React from "react";
import { fetchTuteeHistory } from "@/app/actions";
import { auth } from "@clerk/nextjs/server";
import TuteeHistoryClient from "./TuteeHistoryClient";

export default async function History() {
  const { userId } = await auth();
  
  if (!userId) {
    return (
      <div className="w-11/12 mx-auto py-8 text-center">
        <div className="bg-white p-12 rounded-2xl shadow-lg">
          <div className="text-6xl mb-4"></div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">Authentication Required</h3>
          <p className="text-gray-500">Please sign in to view your session history.</p>
        </div>
      </div>
    );
  }

  const historyResult = await fetchTuteeHistory(userId);

  if (!historyResult.success) {
    return (
      <div className="w-11/12 mx-auto py-8 text-center">
        <div className="bg-white p-12 rounded-2xl shadow-lg">
          <div className="text-6xl mb-4"></div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">Error Loading History</h3>
          <p className="text-red-500">{historyResult.error}</p>
        </div>
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
