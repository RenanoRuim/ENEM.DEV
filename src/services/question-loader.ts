import { fetchQuestions } from "@/services/enem-api";
import { getQuestionIdentity } from "@/utils/question-identity";
import {
  hasValidQuestionIdentity,
  matchesQuestionDiscipline,
  validateEnemQuestion,
} from "@/utils/question-validation";
import type { EnemQuestion } from "@/types/enem";
import type { QuestionProgress } from "@/types/question-progress";

const API_PAGE_SIZE = 50;
const QUESTIONS_PER_BATCH = 10;

async function loadAllQuestions(
  year: number,
  language?: string | null,
): Promise<EnemQuestion[]> {
  const questions: EnemQuestion[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchQuestions(year, {
      limit: API_PAGE_SIZE,
      offset,
      ...(language ? { language } : {}),
    });

    for (const question of page.questions) {
      if (!hasValidQuestionIdentity(question)) {
        continue;
      }
      const id = getQuestionIdentity(question, language ?? undefined);
      if (!seen.has(id)) {
        seen.add(id);
        questions.push(question);
      }
    }

    const nextOffset = page.metadata.offset + page.metadata.limit;
    if (nextOffset <= offset) {
      break;
    }

    offset = nextOffset;
    hasMore = page.metadata.hasMore && offset < page.metadata.total;
  }

  return questions;
}

export async function loadUnseenQuestions(
  year: number,
  discipline: string,
  language: string | undefined,
  progress: QuestionProgress[],
  temporarilyUnavailableIds: ReadonlySet<string> = new Set(),
): Promise<{
  questions: EnemQuestion[];
  totalMatching: number;
  scannedEntireSet: boolean;
  unavailableCount: number;
}> {
  const requestedLanguage =
    discipline === "linguagens" ? language : undefined;
  const statusByQuestionId = new Map(
    progress.map((item) => [item.questionId, item.status]),
  );
  const questions: EnemQuestion[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let hasMore = true;
  let totalMatching = 0;
  let unavailableCount = 0;

  while (hasMore && questions.length < QUESTIONS_PER_BATCH) {
    const page = await fetchQuestions(year, {
      limit: API_PAGE_SIZE,
      offset,
      ...(requestedLanguage ? { language: requestedLanguage } : {}),
    });

    for (const question of page.questions) {
      if (!question || typeof question !== "object") {
        continue;
      }
      if (!hasValidQuestionIdentity(question)) {
        if (matchesQuestionDiscipline(question, discipline)) {
          totalMatching += 1;
          unavailableCount += 1;
        }
        continue;
      }
      const id = getQuestionIdentity(question, requestedLanguage);
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);

      if (
        !matchesQuestionDiscipline(question, discipline) ||
        (requestedLanguage && question.language !== requestedLanguage)
      ) {
        continue;
      }

      totalMatching += 1;
      if (temporarilyUnavailableIds.has(id)) {
        unavailableCount += 1;
        continue;
      }
      if (!validateEnemQuestion(question).isValid) {
        unavailableCount += 1;
        continue;
      }
      const status = statusByQuestionId.get(id) ?? "unseen";
      if (status === "unseen") {
        questions.push(question);
        if (questions.length === QUESTIONS_PER_BATCH) {
          break;
        }
      }
    }

    const nextOffset = page.metadata.offset + page.metadata.limit;
    if (nextOffset <= offset) {
      hasMore = false;
    } else {
      offset = nextOffset;
      hasMore = page.metadata.hasMore && offset < page.metadata.total;
    }
  }

  return {
    questions,
    totalMatching,
    scannedEntireSet: !hasMore,
    unavailableCount,
  };
}

export async function loadQuestionsForReview(
  progress: QuestionProgress[],
): Promise<{
  questions: EnemQuestion[];
  unavailableQuestions: QuestionProgress[];
}> {
  const pending = progress.filter((item) => item.status === "needs_review");
  const groups = new Map<string, QuestionProgress[]>();

  for (const item of pending) {
    const groupKey = `${item.year}:${item.language ?? ""}`;
    const group = groups.get(groupKey) ?? [];
    group.push(item);
    groups.set(groupKey, group);
  }

  const questionsById = new Map<string, EnemQuestion>();
  for (const items of groups.values()) {
    const [first] = items;
    const questions = await loadAllQuestions(first.year, first.language);
    const requestedIds = new Set(items.map((item) => item.questionId));

    for (const question of questions) {
      const id = getQuestionIdentity(question, first.language ?? undefined);
      if (requestedIds.has(id) && !validateEnemQuestion(question).isValid) {
        continue;
      } else if (requestedIds.has(id)) {
        questionsById.set(id, {
          ...question,
          language: question.language ?? first.language,
        });
      }
    }
  }

  const questions = pending.flatMap((item) => {
    const question = questionsById.get(item.questionId);
    if (!question) {
      return [];
    }
    return [question];
  });

  return {
    questions,
    unavailableQuestions: pending.filter(
      (item) => !questionsById.has(item.questionId),
    ),
  };
}

export async function loadQuestionsByIdentifiers(
  identifiers: string[],
): Promise<{ questions: EnemQuestion[]; unavailableIds: string[] }> {
  const uniqueIds = Array.from(new Set(identifiers));
  const parsed = uniqueIds.flatMap((questionId) => {
    const match = /^(\d{4}):(\d+)(?::(.+))?$/u.exec(questionId);
    if (!match) {
      return [];
    }
    const year = Number(match[1]);
    const questionNumber = Number(match[2]);
    if (
      !Number.isInteger(year) ||
      year <= 0 ||
      !Number.isInteger(questionNumber) ||
      questionNumber <= 0
    ) {
      return [];
    }
    return [{
      questionId,
      year,
      questionNumber,
      language: match[3] ?? null,
    }];
  });
  const found = new Map<string, EnemQuestion>();
  const groups = new Map<string, typeof parsed>();

  for (const identifier of parsed) {
    const groupId = `${identifier.year}:${identifier.language ?? ""}`;
    const group = groups.get(groupId) ?? [];
    group.push(identifier);
    groups.set(groupId, group);
  }

  for (const group of groups.values()) {
    const [first] = group;
    const requestedIds = new Set(group.map((item) => item.questionId));
    let offset = 0;
    let hasMore = true;

    while (hasMore && group.some((item) => !found.has(item.questionId))) {
      const page = await fetchQuestions(first.year, {
        limit: API_PAGE_SIZE,
        offset,
        ...(first.language ? { language: first.language } : {}),
      });
      for (const question of page.questions) {
        if (!hasValidQuestionIdentity(question)) {
          continue;
        }
        const id = getQuestionIdentity(question, first.language ?? undefined);
        if (
          requestedIds.has(id) &&
          validateEnemQuestion(question).isValid
        ) {
          found.set(id, {
            ...question,
            language: question.language ?? first.language,
          });
        }
      }

      const nextOffset = page.metadata.offset + page.metadata.limit;
      if (nextOffset <= offset) {
        break;
      }
      offset = nextOffset;
      hasMore =
        page.metadata.hasMore &&
        offset <= Math.max(...group.map((item) => item.questionNumber));
    }
  }

  return {
    questions: uniqueIds.flatMap((id) => {
      const question = found.get(id);
      return question ? [question] : [];
    }),
    unavailableIds: uniqueIds.filter((id) => !found.has(id)),
  };
}
