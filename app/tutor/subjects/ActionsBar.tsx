"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { redirect, RedirectType } from "next/navigation";
import { ClipLoader } from "react-spinners";

type Props = {
  allComplete: boolean;
  handleSubmit: () => void;
  handleSave: () => void;
  saveState: "default" | "saving" | "success" | "failed";
  submitState: "default" | "saving" | "success" | "failed";
  documentId: string | undefined;
};

export default function ActionsBar({
  allComplete,
  handleSubmit,
  handleSave,
  saveState,
  submitState,
  documentId,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<
    "cancel" | "save" | "submit" | null
  >(null);

  const confirmAction = () => {
    if (actionType === "cancel") {
      console.log("Cancelled");
      redirect("/tutor/subjects", RedirectType.replace);
    } else if (actionType === "save") {
      handleSave();
    } else if (actionType === "submit") {
      handleSubmit();
    }
    setShowModal(false);
    setActionType(null);
  };

  return (
    <>
      <div className="md:col-span-3 flex flex-wrap gap-4 justify-end items-center w-full">
        <button
          className="px-6 py-2 w-full rounded-lg bg-red-500 text-white select-none hover:cursor-pointer hover:bg-red-600"
          onClick={() => {
            if (documentId) {
              redirect("/tutor/subjects", RedirectType.replace);
            } else {
              setActionType("cancel");
              setShowModal(true);
            }
          }}
        >
          {documentId ? "Return" : "Cancel"}
        </button>
        <button
          className="px-6 py-2 w-full rounded-lg bg-yellow-500 text-white select-none hover:cursor-pointer hover:bg-yellow-600"
          onClick={() => {
            setActionType("save");
            setShowModal(true);
          }}
        >
          {saveState == "default" ? (
            "Save Draft"
          ) : saveState == "saving" ? (
            <div className="flex flex-row items-center justify-center gap-2">
              <ClipLoader size={20} color="#ffffff" /> Saving
            </div>
          ) : saveState == "success" ? (
            "Success"
          ) : (
            "Failed"
          )}
        </button>
        <button
          className={`px-6 py-2 w-full rounded-lg select-none ${
            allComplete
              ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
          disabled={!allComplete}
          onClick={() => {
            if (allComplete) {
              setActionType("submit");
              setShowModal(true);
            }
          }}
        >
          {submitState == "default"
            ? "Submit"
            : submitState == "saving"
              ? "Submitting"
              : submitState == "success"
                ? "Success"
                : "Failed"}
        </button>
      </div>

      {/* Confirmation Modal with Animation */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6 w-96"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-semibold mb-4">
                {actionType === "cancel" && "Are you sure you want to cancel?"}
                {actionType === "save" &&
                  "Do you want to save this as a draft?"}
                {actionType === "submit" && "Are you sure you want to submit?"}
              </h2>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                  onClick={() => setShowModal(false)}
                >
                  No
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  onClick={confirmAction}
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
