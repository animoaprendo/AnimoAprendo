"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { redirect, RedirectType } from "next/navigation";
import { ClipLoader } from "react-spinners";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Send, ArrowLeft, Loader2 } from "lucide-react";

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
      <div className="flex flex-col gap-3 w-full">
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (documentId) {
                redirect("/tutor/subjects", RedirectType.replace);
              } else {
                setActionType("cancel");
                setShowModal(true);
              }
            }}
            className="w-full hover:cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {documentId ? "Back to Subjects" : "Cancel"}
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => {
              setActionType("save");
              setShowModal(true);
            }}
            disabled={saveState === "saving"}
            className="w-full hover:cursor-pointer"
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saveState === "success" ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : saveState === "failed" ? (
              "Save Failed"
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>
          
          <Button
            disabled={!allComplete || submitState === "saving"}
            onClick={() => {
              if (allComplete) {
                setActionType("submit");
                setShowModal(true);
              }
            }}
            className="w-full hover:cursor-pointer"
          >
            {submitState === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : submitState === "success" ? (
              "Success!"
            ) : submitState === "failed" ? (
              "Submit Failed"
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Offer
              </>
            )}
          </Button>
        </div>
        
        {!allComplete && (
          <p className="text-sm text-muted-foreground text-center">
            Complete all required fields to enable submission
          </p>
        )}
      </div>

      {/* Professional Confirmation Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="mx-4 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="shadow-2xl border-0">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">
                    {actionType === "cancel" && "Cancel Changes"}
                    {actionType === "save" && "Save Draft"}
                    {actionType === "submit" && "Submit Offer"}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {actionType === "cancel" && "Are you sure you want to cancel? Any unsaved changes will be lost."}
                    {actionType === "save" && "Save your current progress as a draft. You can continue editing later."}
                    {actionType === "submit" && "Submit your offer for review. Once submitted, it will be available to students."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmAction}
                      className="flex-1"
                      variant={actionType === "cancel" ? "destructive" : "default"}
                    >
                      {actionType === "cancel" && "Discard Changes"}
                      {actionType === "save" && "Save Draft"}
                      {actionType === "submit" && "Submit"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
