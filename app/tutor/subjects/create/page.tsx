"use client";

import { useState } from "react";
import OfferDetails from "../OfferDetails";
import CompletionChecklist from "../CompletionChecklist";
import ActionsBar from "../ActionsBar";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { saveSubjectDraft, submitSubject } from "@/app/tutor/actions";
import { CreatePopup } from "@/app/tutor/alert";
import { DotLoader } from "react-spinners";
import { CircleCheckBig } from "@/components/animate-ui/icons/circle-check-big";
import { CircleX } from "@/components/animate-ui/icons/circle-x";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

let DESCRIPTION_LENGTH = 1;
let QUIZ_COMPLETED = 1;

// Update this to be grabbed from the database to allow dynamic changes
if (process.env.NEXT_PUBLIC_DEVELOPMENT_MODE == "false") {
  DESCRIPTION_LENGTH = 80;
  QUIZ_COMPLETED = 30;
}

export default function OfferAndQuizPage() {
  const router = useRouter();
  const [documentId, setDocumentId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [availability, setAvailability] = useState<any[]>([]);
  const [banner, setBanner] = useState<string>("");
  const [saveState, setSaveState] = useState<
    "default" | "saving" | "success" | "failed"
  >("default");
  const [submitState, setSubmitState] = useState<
    "default" | "saving" | "success" | "failed"
  >("default");

  const { user } = useUser();
  const userId = user?.id;

  // completion states
  const titleComplete = !!subject.trim();
  const descriptionComplete = descriptionLength >= DESCRIPTION_LENGTH;
  const availabilityComplete = availability.length > 0;
  const bannerComplete = !!banner;

  const allComplete =
    titleComplete &&
    descriptionComplete &&
    availabilityComplete &&
    bannerComplete;

  function handleSubmit() {
    setSubmitState("saving");
    CreatePopup("Submitting", "info");

    submitSubject({
      userId,
      documentId,
      sendData: { subject, description, availability, banner },
    }).then((data) => {
      if (data.success) {
        setSubmitState("success");
        CreatePopup("Submitted", "success");
        
        router.replace("/tutor/subjects");
      } else {
        setSubmitState("failed");
        CreatePopup("Unable to submit, try again.", "error");
      }

      setTimeout(() => {
        setSubmitState("default");
      }, 1500);
    });
  }

  function handleSave() {
    if (!subject) {
      CreatePopup("Select a subject before saving", "error");
      return;
    }
    setSubmitState("saving");
    setSaveState("saving");
    CreatePopup("Saving Progress", "info");
    saveSubjectDraft({
      userId,
      documentId,
      sendData: { subject, description, availability, banner },
    }).then((data) => {
      if (data.success) {
        setSubmitState("success");
        CreatePopup("Saved successfully", "success");
        if (!documentId) {
          setDocumentId(data.data.insertedId);
        }
      } else {
        setSubmitState("failed");
        CreatePopup("Unable to save, try again.", "error");
      }

      setTimeout(() => {
        setSaveState("default");
        setSubmitState("default");
      }, 1500);
    });
  }

  return (
    <div className="container mx-auto py-6 px-4 lg:max-w-[100rem]">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="sticky top-20 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <AnimatePresence>
              {submitState !== "default" && (
                <motion.div
                  className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-lg z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {submitState === "saving" && (
                    <div className="text-center flex flex-col items-center">
                      <DotLoader color="hsl(var(--primary))" size={40} />
                      <motion.h2
                        className="text-xl font-semibold mt-4 text-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6 }}
                      >
                        {saveState === "saving" ? "Saving Draft..." : "Creating Offer..."}
                      </motion.h2>
                      <p className="text-muted-foreground mt-2">
                        Please wait while we process your request
                      </p>
                    </div>
                  )}
                  {submitState === "success" && (
                    <div className="text-center flex flex-col items-center">
                      <CircleCheckBig animateOnView color="hsl(var(--primary))" size={50} />
                      <motion.h2
                        className="text-xl font-semibold mt-4 text-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6 }}
                      >
                        Success!
                      </motion.h2>
                      <p className="text-muted-foreground mt-2">
                        Your subject has been created successfully
                      </p>
                    </div>
                  )}
                  {submitState === "failed" && (
                    <div className="text-center flex flex-col items-center">
                      <CircleX animateOnView color="hsl(var(--destructive))" size={50} />
                      <motion.h2
                        className="text-xl font-semibold mt-4 text-destructive"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6 }}
                      >
                        Failed
                      </motion.h2>
                      <p className="text-muted-foreground mt-2">
                        Something went wrong. Please try again.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            <CardContent className={`p-6 ${submitState !== "default" ? "opacity-50" : ""}`}>
              <CompletionChecklist
                titleComplete={titleComplete}
                description={descriptionLength}
                descriptionComplete={descriptionComplete}
                availabilityComplete={availabilityComplete}
                bannerComplete={bannerComplete}
                DESCRIPTION_LENGTH={DESCRIPTION_LENGTH}
                QUIZ_COMPLETED={QUIZ_COMPLETED}
              />
              <div className="mt-6">
                <ActionsBar
                  allComplete={allComplete}
                  handleSubmit={handleSubmit}
                  handleSave={handleSave}
                  saveState={saveState}
                  submitState={submitState}
                  documentId={documentId}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">Create Subject Offering</CardTitle>
              <CardDescription className="text-base">
                Set up your new tutoring subject with detailed information, availability, and requirements. Complete all sections to publish your offering.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <AnimatePresence mode="wait">
                <motion.div
                  key="offer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <OfferDetails
                    subject={subject}
                    setSubject={setSubject}
                    description={description}
                    setDescription={setDescription}
                    descriptionLength={descriptionLength}
                    setDescriptionLength={setDescriptionLength}
                    availability={availability}
                    setAvailability={setAvailability}
                    banner={banner}
                    setBanner={setBanner}
                  />
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
