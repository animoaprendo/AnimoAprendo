"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Calendar, User, CheckCircle, AlertCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { fetchAppointments, submitQuizAttempt, fetchUsers } from "@/app/actions";

// Define Question and Answer types
type Question = {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "fill-in";
  options: string[];
  answer: string | string[];
};

type QuizAnswer = {
  questionId: string;
  answer: string;
};

type QuizAttempt = {
  attempt: 1 | 2;
  answers: QuizAnswer[];
  score: number;
  completedAt: string;
};

export default function TuteeQuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const appointmentId = searchParams.get('appointmentId');
  const attemptParam = searchParams.get('attempt');
  const currentAttempt = (attemptParam === '1' || attemptParam === '2') ? parseInt(attemptParam) as 1 | 2 : 1;
  
  const [appointment, setAppointment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [isViewingAsTutor, setIsViewingAsTutor] = useState(false);

  // Load appointment and quiz data
  useEffect(() => {
    const loadQuizData = async () => {
      if (!appointmentId || !user) return;

      try {
        setLoading(true);
        const result = await fetchAppointments(user.id, appointmentId);
        
        if (result.success && result.appointments && result.appointments.length > 0) {
          const apt = result.appointments[0];
          setAppointment(apt);
          
          // Check if user has permission to view this quiz (tutee or tutor)
          const userRole = user.publicMetadata?.role;
          const isTutee = apt.tuteeId === user.id;
          const isTutor = apt.tutorId === user.id;
          
          if (!isTutee && !isTutor) {
            setError("You don't have permission to access this quiz.");
            return;
          }
          
          // Set viewing mode based on user role
          setIsViewingAsTutor(isTutor && userRole === 'tutor');

          // Check if quiz exists
          if (!apt.quiz || apt.quiz.length === 0) {
            setError("No quiz available for this appointment yet. Please check back later.");
            return;
          }

          // Check attempt availability
          if (currentAttempt === 2 && apt.status !== 'completed') {
            setError("The second quiz attempt is only available after the tutor marks the appointment as completed.");
            return;
          }

          // Check if this attempt was already completed
          const existingAttempts = apt.quizAttempts || [];
          const attemptAlreadyCompleted = existingAttempts.find((a: QuizAttempt) => a.attempt === currentAttempt);
          
          if (attemptAlreadyCompleted) {
            setQuizCompleted(true);
            setScore(attemptAlreadyCompleted.score);
            // Load their previous answers for review
            const answerMap: { [key: string]: string } = {};
            attemptAlreadyCompleted.answers.forEach((ans: QuizAnswer) => {
              answerMap[ans.questionId] = ans.answer;
            });
            setAnswers(answerMap);
          }

          // Fetch tutor's name if tutorId exists
          if (apt.tutorId) {
            try {
              const tutorResult = await fetchUsers([apt.tutorId.replace('user_', '')]);
              if (tutorResult.success && tutorResult.data.users && tutorResult.data.users.length > 0) {
                const tutorData = tutorResult.data.users[0];
                apt.tutorName = tutorData.displayName || `${tutorData.firstName || ''} ${tutorData.lastName || ''}`.trim() || 'Unknown Tutor';
              } else {
                apt.tutorName = 'Unknown Tutor';
              }
            } catch (err) {
              console.error('Error fetching tutor data:', err);
              apt.tutorName = 'Unknown Tutor';
            }
          }

          setQuestions(apt.quiz);
        } else {
          setError("Appointment not found.");
        }
      } catch (err) {
        setError("Failed to load quiz data.");
        console.error("Error loading quiz:", err);
      } finally {
        setLoading(false);
      }
    };

    loadQuizData();
  }, [appointmentId, user, currentAttempt]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (quizCompleted) return;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const calculateScore = (userAnswers: { [key: string]: string }): number => {
    let correct = 0;
    
    questions.forEach(question => {
      const userAnswer = userAnswers[question.id];
      if (!userAnswer) return;

      if (question.type === 'multiple-choice' || question.type === 'true-false') {
        if (userAnswer === question.answer) {
          correct++;
        }
      } else if (question.type === 'fill-in' && Array.isArray(question.answer)) {
        // Case insensitive comparison for fill-in questions
        const correctAnswers = question.answer.map(ans => ans.toLowerCase().trim());
        if (correctAnswers.includes(userAnswer.toLowerCase().trim())) {
          correct++;
        }
      }
    });

    return Math.round((correct / questions.length) * 100);
  };

  const handleSubmitQuiz = async () => {
    if (quizCompleted || !appointmentId || !user?.id) return;
    
    // Only tutees can submit quizzes
    const userRole = user.publicMetadata?.role;
    if (userRole !== 'tutee') {
      setError("Only tutees can submit quiz answers.");
      return;
    }

    // Validate all questions are answered
    const unansweredQuestions = questions.filter(q => !answers[q.id] || answers[q.id].trim() === "");
    if (unansweredQuestions.length > 0) {
      setError(`Please answer all questions. ${unansweredQuestions.length} question${unansweredQuestions.length === 1 ? '' : 's'} remaining.`);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const quizScore = calculateScore(answers);
      const quizAnswers: QuizAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));

      // Submit quiz attempt using server action
      const result = await submitQuizAttempt({
        messageId: appointmentId,
        quizAttempt: {
          attempt: currentAttempt,
          answers: quizAnswers,
          score: quizScore,
          completedAt: new Date().toISOString(),
          tuteeId: user.id,
          totalQuestions: questions.length,
          tutorId: appointment?.tutorId
        }
      });

      if (result.success) {
        setQuizCompleted(true);
        setScore(quizScore);
      } else {
        setError(result.error || "Failed to submit quiz.");
      }
    } catch (err) {
      setError("An error occurred while submitting the quiz.");
      console.error("Error submitting quiz:", err);
    } finally {
      setSubmitting(false);
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
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Quiz Not Available</h1>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentAttempt === 1 ? "Pre-Session Quiz" : "Post-Session Quiz"}
                </h1>
                <p className="text-sm text-gray-600">
                  {currentAttempt === 1 
                    ? "Take this quiz before your tutoring session" 
                    : "Take this quiz after your tutoring session to measure your progress"
                  }
                </p>
              </div>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              currentAttempt === 1 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              <span>Attempt {currentAttempt} of 2</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Appointment Info */}
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
                <User size={20} className="text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Tutor</p>
                  <p className="font-medium">{appointment.tutorName || 'Loading...'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Status */}
        {quizCompleted && (
          <div className={`rounded-lg p-6 mb-8 ${
            score !== null && score >= 70 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              {score !== null && score >= 70 ? (
                <CheckCircle size={24} className="text-green-600" />
              ) : (
                <AlertCircle size={24} className="text-yellow-600" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">Quiz Completed!</h3>
            </div>
            <p className="text-gray-700 mb-2">
              Your score: <span className="font-bold text-2xl">{score}%</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {currentAttempt === 1 
                ? "Great! You can now continue your tutoring session."
                : score !== null && score >= 70
                  ? "Excellent progress! You've improved significantly from the session."
                  : "You've completed the post-session quiz. Review the material and consider additional practice."
              }
            </p>
            
            {/* Score breakdown for attempt 2 */}
            {currentAttempt === 2 && (
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Quiz Results</h4>
                {(() => {
                  let correct = 0;
                  let incorrect = 0;
                  
                  questions.forEach(question => {
                    const userAnswer = answers[question.id];
                    let isCorrect = false;
                    
                    if (question.type === 'multiple-choice' || question.type === 'true-false') {
                      isCorrect = userAnswer === question.answer;
                    } else if (question.type === 'fill-in' && Array.isArray(question.answer)) {
                      const correctAnswers = question.answer.map(ans => ans.toLowerCase().trim());
                      isCorrect = correctAnswers.includes(userAnswer?.toLowerCase().trim() || "");
                    }
                    
                    if (isCorrect) correct++;
                    else incorrect++;
                  });
                  
                  return (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span>Correct: {correct}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        <span>Incorrect: {incorrect}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
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

        {/* Quiz Questions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Quiz Questions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Answer all {questions.length} questions to complete the quiz.
            </p>
          </div>

          <div className="space-y-8">
            {questions.map((question, idx) => {
              // Calculate if user got this question correct (for attempt 2 display)
              const userAnswer = answers[question.id];
              let isCorrect = false;
              
              if (quizCompleted && currentAttempt === 2) {
                if (question.type === 'multiple-choice' || question.type === 'true-false') {
                  isCorrect = userAnswer === question.answer;
                } else if (question.type === 'fill-in' && Array.isArray(question.answer)) {
                  const correctAnswers = question.answer.map(ans => ans.toLowerCase().trim());
                  isCorrect = correctAnswers.includes(userAnswer?.toLowerCase().trim() || "");
                }
              }

              return (
                <div key={question.id} className={`border rounded-lg p-6 ${
                  quizCompleted ? 'bg-gray-50' : 'bg-white'
                } ${
                  quizCompleted && currentAttempt === 2 
                    ? isCorrect 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-red-300 bg-red-50'
                    : ''
                }`}>
                  <div className="flex items-start space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                      quizCompleted && currentAttempt === 2
                        ? isCorrect
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {quizCompleted && currentAttempt === 2 ? (isCorrect ? '✓' : '✗') : idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {question.question}
                        </h3>
                        {quizCompleted && currentAttempt === 2 && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            isCorrect 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>

                      {question.type === 'multiple-choice' && (
                        <div className="space-y-3">
                          {question.options.map((option, optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                answers[question.id] === option
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              } ${quizCompleted || isViewingAsTutor ? 'cursor-default' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={answers[question.id] === option}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                disabled={quizCompleted || isViewingAsTutor}
                                className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                              />
                              <span className="text-gray-700">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {question.type === 'true-false' && (
                        <div className="space-y-3">
                          {['true', 'false'].map((option) => (
                            <label
                              key={option}
                              className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                answers[question.id] === option
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              } ${quizCompleted || isViewingAsTutor ? 'cursor-default' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={answers[question.id] === option}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                disabled={quizCompleted || isViewingAsTutor}
                                className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                              />
                              <span className="text-gray-700 capitalize">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {question.type === 'fill-in' && (
                        <div>
                          <input
                            type="text"
                            placeholder="Type your answer here..."
                            value={answers[question.id] || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            disabled={quizCompleted || isViewingAsTutor}
                            className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                              quizCompleted || isViewingAsTutor ? 'bg-gray-100 cursor-default' : ''
                            }`}
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            💡 Answers are case insensitive
                          </p>
                        </div>
                      )}

                      {/* Show correct answer for attempt 2 */}
                      {quizCompleted && currentAttempt === 2 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-2">Correct Answer:</p>
                          {question.type === 'multiple-choice' && (
                            <p className="text-sm text-blue-800">
                              {question.answer}
                            </p>
                          )}
                          {question.type === 'true-false' && (
                            <p className="text-sm text-blue-800 capitalize">
                              {question.answer}
                            </p>
                          )}
                          {question.type === 'fill-in' && Array.isArray(question.answer) && (
                            <div className="text-sm text-blue-800">
                              <p>Any of these answers:</p>
                              <ul className="list-disc list-inside mt-1">
                                {question.answer.map((ans, i) => (
                                  <li key={i}>{ans}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Button - Only show for tutees */}
          {!quizCompleted && !isViewingAsTutor && (
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting || questions.some(q => !answers[q.id] || answers[q.id].trim() === "")}
                className="flex items-center space-x-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <span>{submitting ? 'Submitting...' : 'Submit Quiz'}</span>
              </button>
            </div>
          )}
          
          {/* Tutor viewing message */}
          {isViewingAsTutor && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <User className="w-4 h-4 inline mr-2" />
                You are viewing this quiz as the tutor. Student responses are shown above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}