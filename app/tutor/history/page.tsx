import React from "react";
import { fetchTutorHistory } from "@/app/actions";
import { auth } from "@clerk/nextjs/server";
import TutorHistoryClient from "./TutorHistoryClient";

const TutorHistory = async () => {
  const { userId } = await auth();
  
  if (!userId) {
    return (
      <div className="w-10/12 m-auto mt-4 text-center">
        <p className="text-red-600">Authentication required</p>
      </div>
    );
  }

  const historyResult = await fetchTutorHistory(userId);

  if (!historyResult.success) {
    return (
      <div className="w-10/12 m-auto mt-4 text-center">
        <p className="text-red-600">Error loading history: {historyResult.error}</p>
      </div>
    );
  }

  const historyData = historyResult.history || [];
  const statistics = historyResult.statistics || {
    total: 0,
    completed: 0,
    pending: 0,
    averageRating: 0
  };

  return (
    <TutorHistoryClient 
      initialHistoryData={historyData}
      initialStatistics={statistics}
    />
  );
};

export default TutorHistory;
