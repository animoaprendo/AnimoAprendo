import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

// Question type based on QuizEditor.tsx
type Question = {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "fill-in";
  options: string[];
  answer: string | string[];
};

const normalizeText = (value: string) => value.toLowerCase().trim();

const isFillInCorrect = (
  userAnswer: string,
  expectedAnswer: string | string[]
) => {
  const normalizedUserAnswer = normalizeText(userAnswer || "");
  if (!normalizedUserAnswer) return false;

  const acceptedAnswers = Array.isArray(expectedAnswer)
    ? expectedAnswer
    : [expectedAnswer];

  return acceptedAnswers
    .map((answer) => normalizeText(String(answer)))
    .includes(normalizedUserAnswer);
};

const isQuestionAnswerCorrect = (question: Question | undefined, userAnswer: string) => {
  if (!question) return false;

  if (question.type === "fill-in") {
    return isFillInCorrect(userAnswer, question.answer);
  }

  return String(userAnswer) === String(question.answer);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const messageId = searchParams.get("messageId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("main");
    const appointmentsCollection = db.collection("appointments");

    let query: any = {};

    if (messageId) {
      // Get specific appointment
      query = { messageId };
    } else {
      // Get all appointments for user (as tutor or tutee)
      query = {
        $or: [{ tutorId: userId }, { tuteeId: userId }],
      };
    }

    const appointments = await appointmentsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      appointments: appointments.map((apt) => ({
        ...apt,
        _id: apt._id.toString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Received quiz update:", body);

    // Handle quiz updates (by tutor)
    if (body.quiz !== undefined) {
      const { messageId, quiz, userId } = body as {
        messageId: string;
        quiz: Question[];
        userId: string;
      };

      console.log("Received quiz update:", body);

      if (!messageId || !userId) {
        return NextResponse.json(
          { error: "messageId and userId are required" },
          { status: 400 }
        );
      }

      const client = await clientPromise;
      const db = client.db("main");
      const appointmentsCollection = db.collection("appointments");

      // Update the quiz for the appointment
      const updated = await appointmentsCollection.findOneAndUpdate(
        {
          messageId: messageId,
          tutorId: userId, // Only the tutor can update the quiz
        },
        {
          $set: {
            quiz: quiz || [],
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" }
      );

      if (!updated) {
        return NextResponse.json(
          { error: "Appointment not found or unauthorized" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        appointment: { ...updated, _id: updated._id.toString() },
      });
    }

    // Handle quiz attempts (by tutee)
    if (body.quizAttempt !== undefined) {
      const { messageId, quizAttempt } = body;

      if (!messageId || !quizAttempt) {
        return NextResponse.json(
          { error: "messageId and quizAttempt are required" },
          { status: 400 }
        );
      }

      const client = await clientPromise;
      const db = client.db("main");
      const appointmentsCollection = db.collection("appointments");

      // Fetch appointment and quiz so correctness can be computed server-side.
      const appointment = await appointmentsCollection.findOne({
        messageId,
        tuteeId: quizAttempt.tuteeId,
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Appointment not found or unauthorized" },
          { status: 404 }
        );
      }

      const quiz: Question[] = Array.isArray(appointment.quiz) ? appointment.quiz : [];
      const questionMap = new Map(quiz.map((question) => [question.id, question]));

      const gradedAnswers = (Array.isArray(quizAttempt.answers) ? quizAttempt.answers : []).map(
        (answer: { questionId: string; answer: string }) => {
          const question = questionMap.get(answer.questionId);
          const isCorrect = isQuestionAnswerCorrect(question, answer.answer);

          return {
            questionId: answer.questionId,
            answer: answer.answer,
            isCorrect,
          };
        }
      );

      const correctCount = gradedAnswers.filter((answer: { isCorrect: any; }) => answer.isCorrect).length;
      const score = quiz.length > 0 ? Math.round((correctCount / quiz.length) * 100) : 0;

      const normalizedQuizAttempt = {
        ...quizAttempt,
        score,
        answers: gradedAnswers,
      };

      // Add quiz attempt to the appointment
      const updated = await appointmentsCollection.findOneAndUpdate(
        {
          messageId: messageId,
          tuteeId: quizAttempt.tuteeId, // Only the tutee can add their quiz attempt
        },
        {
          $push: {
            quizAttempts: normalizedQuizAttempt,
          },
          $set: {
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" }
      );

      if (!updated) {
        return NextResponse.json(
          { error: "Appointment not found or unauthorized" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        appointment: { ...updated, _id: updated._id.toString() },
      });
    }

    // Handle tutor corrections for a completed quiz attempt
    if (body.quizAttemptCorrection) {
      const { messageId, tutorId, attempt, answers } = body as {
        messageId: string;
        tutorId: string;
        attempt: 1 | 2;
        answers: { questionId: string; isCorrect: boolean }[];
      };

      if (!messageId || !tutorId || !attempt || !Array.isArray(answers)) {
        return NextResponse.json(
          { error: "messageId, tutorId, attempt, and answers are required" },
          { status: 400 }
        );
      }

      const client = await clientPromise;
      const db = client.db("main");
      const appointmentsCollection = db.collection("appointments");

      const appointment = await appointmentsCollection.findOne({ messageId });
      if (!appointment) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }

      if (appointment.tutorId !== tutorId) {
        return NextResponse.json(
          { error: "Unauthorized: only the tutor can edit correctness" },
          { status: 403 }
        );
      }

      const attemptIndex = Array.isArray(appointment.quizAttempts)
        ? appointment.quizAttempts.findIndex((entry: any) => Number(entry?.attempt) === Number(attempt))
        : -1;

      if (attemptIndex === -1) {
        return NextResponse.json(
          { error: "Quiz attempt not found" },
          { status: 404 }
        );
      }

      const correctnessMap = new Map(
        answers.map((entry) => [String(entry.questionId), Boolean(entry.isCorrect)])
      );

      const existingAttempt = appointment.quizAttempts[attemptIndex];
      const existingAnswers = Array.isArray(existingAttempt?.answers)
        ? existingAttempt.answers
        : [];

      const updatedAnswers = existingAnswers.map((answer: any) => {
        const questionId = String(answer?.questionId || "");
        const mappedIsCorrect = correctnessMap.get(questionId);

        return {
          ...answer,
          isCorrect:
            typeof mappedIsCorrect === "boolean"
              ? mappedIsCorrect
              : Boolean(answer?.isCorrect),
        };
      });

      const totalQuestions = Array.isArray(appointment.quiz) ? appointment.quiz.length : 0;
      const correctCount = updatedAnswers.filter((answer: any) => Boolean(answer?.isCorrect)).length;
      const recomputedScore = totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

      const updatedAttempt = {
        ...existingAttempt,
        answers: updatedAnswers,
        score: recomputedScore,
        correctedByTutor: true,
        correctedAt: new Date().toISOString(),
        correctedBy: tutorId,
      };

      const nextQuizAttempts = [...appointment.quizAttempts];
      nextQuizAttempts[attemptIndex] = updatedAttempt;

      const updated = await appointmentsCollection.findOneAndUpdate(
        { _id: appointment._id },
        {
          $set: {
            quizAttempts: nextQuizAttempts,
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" }
      );

      if (!updated) {
        return NextResponse.json(
          { error: "Failed to save corrections" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        appointment: { ...updated, _id: updated._id.toString() },
      });
    }

    // Handle status updates (by tutor or admin)
    if (body.status !== undefined) {
      const { messageId, status, userId } = body;

      if (!messageId || !status || !userId) {
        return NextResponse.json(
          { error: "messageId, status, and userId are required" },
          { status: 400 }
        );
      }

      const client = await clientPromise;
      const db = client.db("main");
      const appointmentsCollection = db.collection("appointments");

      var updated;
      // Update appointment status
      if (userId === process.env.ADMIN_KEY) {
        updated = await appointmentsCollection.findOneAndUpdate(
          {
            messageId: messageId,
          },
          {
            $set: {
              status: status,
              updatedAt: new Date().toISOString(),
            },
          },
          { returnDocument: "after" }
        );
      } else {
        updated = await appointmentsCollection.findOneAndUpdate(
          {
            messageId: messageId,
            tutorId: userId, // Only the tutor can update the status
          },
          {
            $set: {
              status: status,
              updatedAt: new Date().toISOString(),
            },
          },
          { returnDocument: "after" }
        );
      }

      if (!updated) {
        return NextResponse.json(
          { error: "Appointment not found or unauthorized" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        appointment: { ...updated, _id: updated._id.toString() },
      });
    }

    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}
