import React from "react";
import { getAllOfferings } from "@/app/actions";
import SearchClient from "./SearchClient";

// Force dynamic rendering since we fetch fresh data
export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  const offeringsResponse = await getAllOfferings();

  if (!offeringsResponse.success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6 w-11/12 mx-auto">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-700">Error Loading Subjects</h2>
        <p className="text-red-500">{offeringsResponse.error}</p>
      </div>
    );
  }

  const offerings = offeringsResponse.data || [];


  return (
    <SearchClient initialOfferings={offerings} />
  );
}
