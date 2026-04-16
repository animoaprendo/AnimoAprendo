import type { Db } from "mongodb";

export type QuizQuestionType = "multiple-choice" | "true-false" | "fill-in";

export type QuizQuestion = {
  id: string;
  question: string;
  type: QuizQuestionType;
  options: string[];
  answer: string | string[];
};

export type QuestionBankEntry = {
  tutorId: string;
  subjectOfferingId: string | null;
  subjectName: string | null;
  questionText: string;
  answerKey: string | string[];
  quizType: QuizQuestionType;
  options: string[];
  questionFingerprint: string;
  sourceAppointmentIds: string[];
  usageCount: number;
  isFavorite: boolean;
  isArchived: boolean;
  firstCreatedAt: string;
  lastUsedAt: string;
  updatedAt: string;
};

const normalizeText = (value: string) => value.toLowerCase().trim();

const normalizeSubject = (subjectName: string | null | undefined) => {
  if (!subjectName) return null;
  const normalized = normalizeText(subjectName);
  return normalized.length ? normalized : null;
};

const normalizedOptions = (options: string[]) =>
  (Array.isArray(options) ? options : [])
    .map((option) => normalizeText(String(option || "")))
    .filter(Boolean)
    .sort();

const normalizedAnswer = (answer: string | string[]) => {
  if (Array.isArray(answer)) {
    return answer
      .map((item) => normalizeText(String(item || "")))
      .filter(Boolean)
      .sort()
      .join("||");
  }

  return normalizeText(String(answer || ""));
};

const buildQuestionFingerprint = (question: QuizQuestion) => {
  const typePart = question.type;
  const questionPart = normalizeText(question.question || "");
  const optionsPart = normalizedOptions(question.options || []).join("|");
  const answerPart = normalizedAnswer(question.answer);

  return `${typePart}::${questionPart}::${optionsPart}::${answerPart}`;
};

const isQuestionEligibleForBank = (question: QuizQuestion) => {
  if (!question.question?.trim()) return false;

  if (question.type === "multiple-choice") {
    const options = Array.isArray(question.options) ? question.options : [];
    return options.length >= 2 && options.every((option) => option.trim()) && !!String(question.answer || "").trim();
  }

  if (question.type === "true-false") {
    return question.answer === "true" || question.answer === "false";
  }

  if (question.type === "fill-in") {
    return Array.isArray(question.answer) && question.answer.some((answer) => String(answer || "").trim());
  }

  return false;
};

export async function upsertTutorQuestionBankEntries(params: {
  db: Db;
  tutorId: string;
  subjectOfferingId?: string | null;
  subjectName?: string | null;
  appointmentMessageId?: string;
  quiz: QuizQuestion[];
}) {
  const { db, tutorId, subjectOfferingId, subjectName, appointmentMessageId, quiz } = params;

  const now = new Date().toISOString();
  const subjectNameNormalized = normalizeSubject(subjectName);
  const normalizedOfferingId = subjectOfferingId || null;
  const collection = db.collection<QuestionBankEntry>("quizQuestionBank");

  const eligibleQuestions = (Array.isArray(quiz) ? quiz : []).filter(isQuestionEligibleForBank);
  if (eligibleQuestions.length === 0) {
    return { upsertedCount: 0, modifiedCount: 0 };
  }

  const uniqueByFingerprint = new Map<string, QuizQuestion>();
  for (const question of eligibleQuestions) {
    const fingerprint = buildQuestionFingerprint(question);
    if (!uniqueByFingerprint.has(fingerprint)) {
      uniqueByFingerprint.set(fingerprint, question);
    }
  }

  const operations = Array.from(uniqueByFingerprint.entries()).map(([fingerprint, question]) => {
    const sourceAppointmentIds = appointmentMessageId ? [appointmentMessageId] : [];

    return {
      updateOne: {
        filter: {
          tutorId,
          subjectOfferingId: normalizedOfferingId,
          subjectName: subjectNameNormalized,
          questionFingerprint: fingerprint,
        },
        update: {
          $set: {
            questionText: question.question,
            answerKey: question.answer,
            quizType: question.type,
            options: Array.isArray(question.options) ? question.options : [],
            updatedAt: now,
            lastUsedAt: now,
          },
          $inc: {
            usageCount: 1,
          },
          ...(sourceAppointmentIds.length
            ? {
                $addToSet: {
                  sourceAppointmentIds: { $each: sourceAppointmentIds },
                },
              }
            : {}),
          $setOnInsert: {
            tutorId,
            subjectOfferingId: normalizedOfferingId,
            subjectName: subjectNameNormalized,
            questionFingerprint: fingerprint,
            sourceAppointmentIds,
            isFavorite: false,
            isArchived: false,
            firstCreatedAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await collection.bulkWrite(operations, { ordered: false });
  return {
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
  };
}

export async function getTutorQuestionBank(params: {
  db: Db;
  tutorId: string;
  subjectOfferingId?: string | null;
  subjectName?: string | null;
  limit?: number;
  includeArchived?: boolean;
}) {
  const { db, tutorId, subjectOfferingId, subjectName, limit = 50, includeArchived = false } = params;
  const collection = db.collection<QuestionBankEntry>("quizQuestionBank");

  const subjectNameNormalized = normalizeSubject(subjectName);
  const query: Record<string, unknown> = {
    tutorId,
  };

  if (!includeArchived) {
    query.isArchived = { $ne: true };
  }

  if (subjectOfferingId) {
    query.subjectOfferingId = subjectOfferingId;
  } else if (subjectNameNormalized) {
    query.subjectName = subjectNameNormalized;
  }

  const rows = await collection
    .find(query)
    .sort({ isFavorite: -1, lastUsedAt: -1, updatedAt: -1 })
    .limit(limit)
    .toArray();

  return rows.map((row: any) => ({
    ...row,
    _id: row?._id?.toString?.() || row?._id,
  }));
}

const toIso = (value: unknown, fallback: string) => {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

export async function mergeDuplicateQuestionBankEntries(params: {
  db: Db;
  tutorId: string;
  subjectOfferingId?: string | null;
  subjectName?: string | null;
}) {
  const { db, tutorId, subjectOfferingId, subjectName } = params;
  const collection = db.collection<QuestionBankEntry>("quizQuestionBank");
  const subjectNameNormalized = normalizeSubject(subjectName);

  const query: Record<string, unknown> = { tutorId };
  if (subjectOfferingId) {
    query.subjectOfferingId = subjectOfferingId;
  } else if (subjectNameNormalized) {
    query.subjectName = subjectNameNormalized;
  }

  const rows = await collection.find(query).toArray();
  if (rows.length <= 1) {
    return { groupsMerged: 0, duplicatesRemoved: 0 };
  }

  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const key = [
      row.tutorId || "",
      row.subjectOfferingId || "",
      row.subjectName || "",
      row.questionFingerprint || "",
    ].join("::");

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  let groupsMerged = 0;
  let duplicatesRemoved = 0;
  const now = new Date().toISOString();

  for (const groupRows of groups.values()) {
    if (groupRows.length <= 1) continue;

    const sortedRows = [...groupRows].sort((a, b) => {
      const aScore = (a.isArchived ? 0 : 4) + (a.isFavorite ? 2 : 0) + Math.min(Number(a.usageCount || 0), 1000) / 1000;
      const bScore = (b.isArchived ? 0 : 4) + (b.isFavorite ? 2 : 0) + Math.min(Number(b.usageCount || 0), 1000) / 1000;
      if (aScore !== bScore) return bScore - aScore;
      return new Date(String(b.updatedAt || 0)).getTime() - new Date(String(a.updatedAt || 0)).getTime();
    });

    const canonical = sortedRows[0];
    const duplicates = sortedRows.slice(1);

    const mergedUsageCount = sortedRows.reduce((sum, row) => sum + Number(row.usageCount || 0), 0);
    const mergedSourceAppointmentIds = Array.from(
      new Set(
        sortedRows.flatMap((row) =>
          Array.isArray(row.sourceAppointmentIds)
            ? row.sourceAppointmentIds.map((id: unknown) => String(id))
            : []
        )
      )
    );

    const mergedFirstCreatedAt = sortedRows
      .map((row) => toIso(row.firstCreatedAt, now))
      .sort()[0] || now;
    const mergedLastUsedAt = sortedRows
      .map((row) => toIso(row.lastUsedAt, now))
      .sort()
      .at(-1) || now;

    const mergedIsFavorite = sortedRows.some((row) => row.isFavorite === true);
    const mergedIsArchived = sortedRows.every((row) => row.isArchived === true);

    await collection.updateOne(
      { _id: canonical._id as any },
      {
        $set: {
          usageCount: mergedUsageCount,
          sourceAppointmentIds: mergedSourceAppointmentIds,
          firstCreatedAt: mergedFirstCreatedAt,
          lastUsedAt: mergedLastUsedAt,
          updatedAt: now,
          isFavorite: mergedIsFavorite,
          isArchived: mergedIsArchived,
        },
      }
    );

    if (duplicates.length > 0) {
      await collection.deleteMany({
        _id: {
          $in: duplicates.map((row) => row._id),
        },
      } as any);
    }

    groupsMerged += 1;
    duplicatesRemoved += duplicates.length;
  }

  return { groupsMerged, duplicatesRemoved };
}
