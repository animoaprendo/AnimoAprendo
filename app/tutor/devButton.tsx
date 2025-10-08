'use client'
import React from "react";
import { AddExperience } from "./rank";

const DevButton = () => {
  return (
    <div className="flex flex-row gap-2">
    <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => AddExperience(100)}
      >
        Add 100 EXP
      </button>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => AddExperience(3000)}
      >
        Add 3000 EXP
      </button>
    </div>
  );
};

export default DevButton;
