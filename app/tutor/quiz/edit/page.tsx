"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Calendar, Clock, Users } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { fetchAppointments, updateAppointmentQuiz } from "@/app/actions";

// Define Question type locally to avoid import issues
type Question = {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "fill-in";
  options: string[];
  answer: string | string[];
};

// Dynamic configuration based on environment
let QUIZ_REQUIRED_COUNT = 3;

// Update this to be grabbed from the database to allow dynamic changes
if (process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "false") {
  QUIZ_REQUIRED_COUNT = 20;
}

// Import QuizEditor components inline to avoid import issues
import { X } from "lucide-react";
import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Function to check if a question has missing information
const getQuestionValidation = (q: Question) => {
  const issues: string[] = [];
  
  if (!q.question.trim()) {
    issues.push("Question text is required");
  }
  
  if (q.type === 'multiple-choice') {
    if (q.options.some((opt: string) => !opt.trim())) {
      issues.push("All options must be filled");
    }
    if (!q.answer || typeof q.answer !== 'string' || !q.answer.trim()) {
      issues.push("Must select a correct answer");
    }
  } else if (q.type === 'true-false') {
    if (!q.answer || (q.answer !== 'true' && q.answer !== 'false')) {
      issues.push("Must select True or False");
    }
  } else if (q.type === 'fill-in') {
    if (!Array.isArray(q.answer) || q.answer.every((a: string) => !a.trim())) {
      issues.push("Must provide at least one correct answer");
    }
  }
  
  return issues;
};

// QuizEditor Component
function QuizEditor({ questions, setQuestions }: { questions: Question[]; setQuestions: (val: Question[]) => void }) {
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quiz Questions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create questions for your appointment quiz. Students will take this before the meeting.
          </p>
          <p className="text-sm font-medium text-green-600 mt-1">
            Minimum required: {QUIZ_REQUIRED_COUNT} questions
          </p>
        </div>
        <div className="text-right">
          {(() => {
            const completeQuestions = questions.filter(q => getQuestionValidation(q).length === 0).length;
            const hasRequiredCount = completeQuestions >= QUIZ_REQUIRED_COUNT;
            const allComplete = completeQuestions === questions.length && hasRequiredCount;
            
            return (
              <>
                <div className={`text-sm px-3 py-1 rounded-full ${
                  hasRequiredCount && allComplete
                    ? 'text-green-700 bg-green-100' 
                    : 'text-orange-700 bg-orange-100'
                }`}>
                  {completeQuestions} / {QUIZ_REQUIRED_COUNT} complete questions
                </div>
                {questions.length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    {questions.length} total ({questions.length - completeQuestions} incomplete)
                  </div>
                )}
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      hasRequiredCount ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min((completeQuestions / QUIZ_REQUIRED_COUNT) * 100, 100)}%` }}
                  />
                </div>
                {completeQuestions < QUIZ_REQUIRED_COUNT && (
                  <p className="text-xs text-orange-600 mt-1">
                    {QUIZ_REQUIRED_COUNT - completeQuestions} more complete questions needed
                  </p>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <motion.div layout className="space-y-6">
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
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {(() => {
                    const validation = getQuestionValidation(q);
                    const isComplete = validation.length === 0;
                    return (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isComplete 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {isComplete ? '✓' : idx + 1}
                      </div>
                    );
                  })()}
                  <span className="text-sm font-medium text-gray-700">Question {idx + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => confirmDelete(idx)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {(() => {
                const validation = getQuestionValidation(q);
                if (validation.length > 0) {
                  return (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start space-x-2">
                        <div className="text-orange-500 mt-0.5">⚠️</div>
                        <div>
                          <p className="text-sm font-medium text-orange-800">Missing Information:</p>
                          <ul className="text-sm text-orange-700 mt-1 space-y-1">
                            {validation.map((issue, issueIdx) => (
                              <li key={issueIdx} className="flex items-center space-x-1">
                                <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Text
                  </label>
                  <textarea
                    placeholder="Enter your question here..."
                    value={q.question}
                    onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Type
                  </label>
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True / False</option>
                    <option value="fill-in">Fill in the Blank</option>
                  </select>
                </div>

                {q.type === "multiple-choice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Answer Options (select the correct one)
                    </label>
                    <div className="space-y-3">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.answer === opt}
                            onChange={() => updateQuestion(idx, { answer: opt })}
                            className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
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
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(idx, optIdx)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(idx)}
                        className="px-4 py-2 text-sm bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                )}

                {q.type === "true-false" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correct Answer
                    </label>
                    <select
                      value={q.answer as string}
                      onChange={(e) => updateQuestion(idx, { answer: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select the correct answer</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                )}

                {q.type === "fill-in" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Possible Correct Answers
                    </label>
                    <p className="text-xs text-gray-500 mb-3 italic">
                      💡 Note: Answers are case insensitive (e.g., "Apple" and "apple" are both correct)
                    </p>
                    <div className="space-y-3">
                      {Array.isArray(q.answer) &&
                        q.answer.map((ans, ansIdx) => (
                          <div key={ansIdx} className="flex items-center gap-3">
                            <input
                              type="text"
                              placeholder={`Possible answer ${ansIdx + 1}`}
                              value={ans}
                              onChange={(e) => {
                                const updated = [...questions];
                                if (!Array.isArray(updated[idx].answer)) updated[idx].answer = [""];
                                (updated[idx].answer as string[])[ansIdx] = e.target.value;
                                setQuestions(updated);
                              }}
                              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            {q.answer.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeFillInAnswer(idx, ansIdx)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      <button
                        type="button"
                        onClick={() => addFillInAnswer(idx)}
                        className="px-4 py-2 text-sm bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        + Add Possible Answer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <motion.div layout="position" className="text-center">
        <button
          type="button"
          onClick={addQuestion}
          className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + Add Question
        </button>
        {(() => {
          const completeQuestions = questions.filter(q => getQuestionValidation(q).length === 0).length;
          
          if (questions.length === 0) {
            return (
              <p className="text-sm text-gray-500 mt-3">
                Start by adding your first question ({QUIZ_REQUIRED_COUNT} complete questions required)
              </p>
            );
          } else if (completeQuestions < QUIZ_REQUIRED_COUNT) {
            return (
              <p className="text-sm text-orange-600 mt-3">
                Add {QUIZ_REQUIRED_COUNT - completeQuestions} more complete question{QUIZ_REQUIRED_COUNT - completeQuestions === 1 ? '' : 's'} to meet the minimum requirement
              </p>
            );
          } else {
            return (
              <p className="text-sm text-green-600 mt-3">
                ✓ Quiz meets the minimum requirement of {QUIZ_REQUIRED_COUNT} complete questions
              </p>
            );
          }
        })()}
      </motion.div>

      <AnimatePresence>
        {showModal && deleteIdx !== null && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Question</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-6">
                <p className="text-sm text-gray-700 font-medium">
                  "{questions[deleteIdx]?.question || `Question ${deleteIdx + 1}`}"
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Question
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QuizEditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const appointmentId = searchParams.get('appointmentId');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // Load appointment data and existing quiz
  useEffect(() => {
    const loadAppointmentData = async () => {
      if (!appointmentId || !user) return;

      try {
        setLoading(true);
        // Use appointmentId as messageId since that's what the API expects
        const result = await fetchAppointments(user.id, appointmentId);
        
        if (result.success && result.appointments && result.appointments.length > 0) {
          const apt = result.appointments[0];
          setAppointment(apt);
          
          // Load existing quiz questions if any
          if (apt.quiz && apt.quiz.length > 0) {
            setQuestions(apt.quiz);
          }
        } else {
          setError("Appointment not found or you don't have permission to edit it.");
        }
      } catch (err) {
        setError("Failed to load appointment data.");
        console.error("Error loading appointment:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAppointmentData();
  }, [appointmentId, user]);

  const handleSaveQuiz = async () => {
    if (!appointmentId || !user || questions.length === 0) {
      setError(`Please add at least ${QUIZ_REQUIRED_COUNT} complete questions before saving.`);
      return;
    }

    // Count only complete questions for the requirement
    const completeQuestions = questions.filter(q => getQuestionValidation(q).length === 0);
    const incompleteQuestions = questions.filter(q => getQuestionValidation(q).length > 0);

    // Check minimum complete question requirement
    if (completeQuestions.length < QUIZ_REQUIRED_COUNT) {
      const totalNeeded = QUIZ_REQUIRED_COUNT - completeQuestions.length;
      setError(`You need at least ${QUIZ_REQUIRED_COUNT} complete questions to save the quiz. You currently have ${completeQuestions.length} complete question${completeQuestions.length === 1 ? '' : 's'}. Add ${totalNeeded} more complete question${totalNeeded === 1 ? '' : 's'}.`);
      return;
    }

    // Ensure all questions are complete (no incomplete questions allowed)
    if (incompleteQuestions.length > 0) {
      setError(`Please complete all questions before saving. ${incompleteQuestions.length} question${incompleteQuestions.length === 1 ? '' : 's'} still need${incompleteQuestions.length === 1 ? 's' : ''} attention.`);
      return;
    }

    try {
      setSaving(true);
      setError("");
      
      const result = await updateAppointmentQuiz({
        messageId: appointmentId,
        quiz: questions
      });

      if (result.success) {
        // Redirect back to chat or appointments with success message
        router.push('/tutor/chat?quizSaved=true');
      } else {
        setError(result.error || "Failed to save quiz.");
      }
    } catch (err) {
      setError("An error occurred while saving the quiz.");
      console.error("Error saving quiz:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Unable to Load Quiz Editor</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quiz Editor</h1>
                <p className="text-sm text-gray-600">Create quiz for your upcoming appointment</p>
              </div>
            </div>
            <button
              onClick={handleSaveQuiz}
              disabled={saving || questions.filter(q => getQuestionValidation(q).length === 0).length < QUIZ_REQUIRED_COUNT || questions.some(q => getQuestionValidation(q).length > 0)}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Quiz'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Appointment Info Card */}
        {appointment && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar size={20} className="text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{new Date(appointment.datetimeISO).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock size={20} className="text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">{new Date(appointment.datetimeISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users size={20} className="text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Mode</p>
                  <p className="font-medium capitalize">{appointment.mode}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Editor */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <QuizEditor questions={questions} setQuestions={setQuestions} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Save Actions */}
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm">
            {questions.length > 0 ? (
              <div>
                {(() => {
                  const completeCount = questions.filter(q => getQuestionValidation(q).length === 0).length;
                  return (
                    <>
                      <p className={`${completeCount >= QUIZ_REQUIRED_COUNT ? 'text-green-600' : 'text-gray-500'}`}>
                        {completeCount} complete question{completeCount === 1 ? '' : 's'} out of {questions.length} total
                      </p>
                      {completeCount < QUIZ_REQUIRED_COUNT && (
                        <p className="text-orange-600">
                          {QUIZ_REQUIRED_COUNT - completeCount} more complete questions needed
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-gray-500">No questions added yet ({QUIZ_REQUIRED_COUNT} complete questions required)</p>
            )}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleGoBack}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveQuiz}
              disabled={saving || questions.filter(q => getQuestionValidation(q).length === 0).length < QUIZ_REQUIRED_COUNT || questions.some(q => getQuestionValidation(q).length > 0)}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              title={
                (() => {
                  const completeCount = questions.filter(q => getQuestionValidation(q).length === 0).length;
                  if (completeCount < QUIZ_REQUIRED_COUNT) {
                    return `Need ${QUIZ_REQUIRED_COUNT - completeCount} more complete questions`;
                  } else if (questions.some(q => getQuestionValidation(q).length > 0)) {
                    return 'Some questions are incomplete';
                  }
                  return '';
                })()
              }
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Quiz'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}