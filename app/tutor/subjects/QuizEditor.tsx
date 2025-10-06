"use client";

import { X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type Question = {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "fill-in";
  options: string[];
  answer: string | string[];
};

type Props = {
  questions: Question[];
  setQuestions: (val: Question[]) => void;
};

export default function QuizEditor({ questions, setQuestions }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [addedIdx, setAddedIdx] = useState<number | null>(null);
  const lastQuestionRef = useRef<HTMLDivElement | null>(null);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      question: "",
      type: "multiple-choice",
      options: ["", ""],
      answer: "",
    };
    setQuestions([...questions, newQuestion]);
    setAddedIdx(questions.length);
  };

  useEffect(() => {
    if (addedIdx !== null && lastQuestionRef.current) {
      lastQuestionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
      window.scrollBy({ top: 350, left: 0, behavior: "smooth" });
    }
  }, [questions.length, addedIdx]);

  const updateQuestion = (idx: number, update: Partial<Question>) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], ...update };
    setQuestions(updated);
  };

  const addOption = (idx: number) => {
    const updated = [...questions];
    updated[idx].options.push("");
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    if (updated[qIdx].options.length > 2) {
      const removed = updated[qIdx].options[optIdx];
      updated[qIdx].options.splice(optIdx, 1);
      if (updated[qIdx].answer === removed) {
        updated[qIdx].answer = "";
      }
      setQuestions(updated);
    }
  };

  const addFillInAnswer = (idx: number) => {
    const updated = [...questions];
    if (!Array.isArray(updated[idx].answer)) updated[idx].answer = [""];
    (updated[idx].answer as string[]).push("");
    setQuestions(updated);
  };

  const removeFillInAnswer = (qIdx: number, ansIdx: number) => {
    const updated = [...questions];
    if (Array.isArray(updated[qIdx].answer)) {
      (updated[qIdx].answer as string[]).splice(ansIdx, 1);
    }
    setQuestions(updated);
  };

  const confirmDelete = (idx: number) => {
    setDeleteIdx(idx);
    setShowModal(true);
  };

  const handleDelete = () => {
    if (deleteIdx !== null) {
      const updated = [...questions];
      updated.splice(deleteIdx, 1);
      setQuestions(updated);
      setDeleteIdx(null);
      setShowModal(false);
      setAddedIdx(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-semibold">Quiz Editor</h2>

      <motion.div layout className="space-y-4">
        <AnimatePresence>
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              layout="position"
              ref={idx === questions.length - 1 ? lastQuestionRef : null}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="p-4 border rounded space-y-3 bg-white shadow-sm"
            >
              <input
                type="text"
                placeholder={`Question ${idx + 1}`}
                value={q.question}
                onChange={(e) =>
                  updateQuestion(idx, { question: e.target.value })
                }
                className="w-full p-2 border rounded"
              />

              <select
                value={q.type}
                onChange={(e) => {
                  const type = e.target.value as Question["type"];
                  let reset: Partial<Question> = { type, answer: "" };
                  if (type === "multiple-choice") reset.options = ["", ""];
                  if (type === "fill-in") reset.answer = [""];
                  if (type !== "multiple-choice") reset.options = [];
                  updateQuestion(idx, reset);
                }}
                className="w-full p-2 border rounded"
              >
                <option value="multiple-choice">Multiple Choice</option>
                <option value="true-false">True / False</option>
                <option value="fill-in">Fill in the Blank</option>
              </select>

              {q.type === "multiple-choice" && (
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={q.answer === opt}
                        onChange={() => updateQuestion(idx, { answer: opt })}
                        className="h-4 w-4 shrink-0"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].options[optIdx] = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-full p-2 border rounded"
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx, optIdx)}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(idx)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                  >
                    Add Option
                  </button>
                </div>
              )}

              {q.type === "true-false" && (
                <select
                  value={q.answer as string}
                  onChange={(e) =>
                    updateQuestion(idx, { answer: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Answer</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              )}

              {q.type === "fill-in" && (
                <div className="space-y-2">
                  {Array.isArray(q.answer) &&
                    q.answer.map((ans, ansIdx) => (
                      <div key={ansIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Possible Answer ${ansIdx + 1}`}
                          value={ans}
                          onChange={(e) => {
                            const updated = [...questions];
                            if (!Array.isArray(updated[idx].answer))
                              updated[idx].answer = [""];
                            (updated[idx].answer as string[])[ansIdx] =
                              e.target.value;
                            setQuestions(updated);
                          }}
                          className="w-full p-2 border rounded"
                        />
                        {q.answer.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFillInAnswer(idx, ansIdx)}
                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  <button
                    type="button"
                    onClick={() => addFillInAnswer(idx)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                  >
                    Add Possible Answer
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => confirmDelete(idx)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Delete Question
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <motion.button
        layout="position"
        type="button"
        onClick={addQuestion}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Add Question
      </motion.button>

      <AnimatePresence>
        {showModal && deleteIdx !== null && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-96 shadow-lg space-y-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="text-lg font-semibold">Delete Question</h3>
              <p>
                Are you sure you want to delete this question?
                <br />
                <span className="font-medium text-gray-800">
                  “{questions[deleteIdx]?.question || `Question ${deleteIdx + 1}`}”
                </span>
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
