import React from "react";
import { fetchTutorHistory } from "@/app/actions";
import { auth } from "@clerk/nextjs/server";
import TutorHistoryClient from "./TutorHistoryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ShieldAlert } from "lucide-react";

const TutorHistory = async () => {
  const { userId } = await auth();
  
  if (!userId) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <CardTitle className="mb-2 text-destructive">Authentication Required</CardTitle>
            <CardDescription>Please sign in to view your tutoring history.</CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  const historyResult = await fetchTutorHistory(userId);

  if (!historyResult.success) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <CardTitle className="mb-2 text-destructive">Error Loading History</CardTitle>
            <CardDescription>{historyResult.error}</CardDescription>
          </CardContent>
        </Card>
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
