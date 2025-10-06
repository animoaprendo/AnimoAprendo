"use client";

import { useState, use, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { getOffer, saveSubjectDraft, submitSubject } from "@/app/tutor/actions";
import { CreatePopup } from "@/app/tutor/alert";
import CompletionChecklist from "../../CompletionChecklist";
import ActionsBar from "../../ActionsBar";
import OfferDetails from "../../OfferDetails";
import { DotLoader } from "react-spinners";
import { CircleCheckBig } from "@/components/animate-ui/icons/circle-check-big";
import { CircleX } from "@/components/animate-ui/icons/circle-x";
import { useRouter } from "next/navigation";

let DESCRIPTION_LENGTH = 1;
let QUIZ_COMPLETED = 1;

if (process.env.NEXT_PUBLIC_DEVELOPMENT_MODE == "false") {
  DESCRIPTION_LENGTH = 80;
  QUIZ_COMPLETED = 30;
}

export default function TutorViewSubject({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useUser();
  const userId = user?.id;
  const [documentId, setDocumentId] = useState(slug);
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

  useEffect(() => {
    async function fetchData() {
      const result = await getOffer(userId, slug);
      const data = result.data;
      setSubject(data?.subject || "");
      setDescription(data?.description || "");
      setAvailability(data?.availability || []);
      setBanner(data?.banner || "");
    }
    if (userId) fetchData();
  }, [userId]);

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
        const router = useRouter();
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-8 p-2 xl:p-6 space-y-10 w-full lg:max-w-[100rem]">
      <div className="relative">
        <div className="flex flex-col relative z-10 gap-6 shadow-xl h-fit p-4 lg:sticky top-6 self-start bg-black/4 rounded-2xl w-full overflow-hidden">
          <AnimatePresence>
            {submitState !== "default" && (
              <motion.div
                className="absolute w-full h-full top-0 left-0 bg-black/15 flex flex-col items-center justify-center gap-4 pb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                {submitState === "saving" && (
                  <>
                    <DotLoader color="#0d542b" size={50} />
                    <motion.h1
                      className="text-green-950 font-bold text-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6 }}
                    >
                      {saveState === "saving" ? "Saving" : "Submitting"}
                    </motion.h1>
                  </>
                )}
                {submitState === "success" && (
                  <>
                    <CircleCheckBig animateOnView color="#0d542b" size={50} />
                    <motion.h1
                      className="text-green-950 font-bold text-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6 }}
                    >
                      Success
                    </motion.h1>
                  </>
                )}
                {submitState === "failed" && (
                  <>
                    <CircleX animateOnView color="#ff0613" size={50} />
                    <motion.h1
                      className="text-red-600 font-bold text-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6 }}
                    >
                      Failed
                    </motion.h1>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div
            className={`flex flex-col gap-6 ${submitState !== "default" ? "blur-xs opacity-50" : ""}`}
          >
            <CompletionChecklist
              titleComplete={titleComplete}
              description={descriptionLength}
              descriptionComplete={descriptionComplete}
              availabilityComplete={availabilityComplete}
              bannerComplete={bannerComplete}
              DESCRIPTION_LENGTH={DESCRIPTION_LENGTH}
              QUIZ_COMPLETED={QUIZ_COMPLETED}
            />
            <ActionsBar
              allComplete={allComplete}
              handleSubmit={handleSubmit}
              handleSave={handleSave}
              saveState={saveState}
              submitState={submitState}
              documentId={documentId}
            />
          </div>
        </div>
      </div>

      <motion.div
        layout
        transition={{ layout: { type: "spring", stiffness: 250, damping: 30 } }}
        className="lg:col-span-3 p-4 bg-black/3 shadow rounded-2xl"
      >
        <h1 className="text-xl font-bold mb-4 select-none">Offer Details</h1>

        {/* Tab Content with smooth spring animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key="offer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 250, damping: 25 }}
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
      </motion.div>
    </div>
  );
}
