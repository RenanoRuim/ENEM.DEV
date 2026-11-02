import type { EnemAlternativeLetter, EnemQuestion } from "@/types/enem";

export const OFFICIAL_DISCIPLINE_CODES = [
  "matematica",
  "ciencias-natureza",
  "ciencias-humanas",
  "linguagens",
] as const;

const alternativeLetters: EnemAlternativeLetter[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
];
const markdownImagePattern = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

export interface QuestionValidationResult {
  isValid: boolean;
  issues: string[];
  criticalImageUrls: string[];
  canContinueWithoutImages: boolean;
}

export function matchesQuestionDiscipline(
  question: EnemQuestion,
  discipline: string,
): boolean {
  return question.discipline === discipline;
}

export function isUnavailableImageUrl(url: string): boolean {
  return /(?:^|\/)broken-image\.svg(?:[?#].*)?$/i.test(url);
}

export function hasValidQuestionIdentity(
  question: unknown,
): question is EnemQuestion {
  if (!question || typeof question !== "object") {
    return false;
  }
  const candidate = question as Record<string, unknown>;
  return (
    Number.isInteger(candidate.year) &&
    Number(candidate.year) > 0 &&
    Number.isInteger(candidate.index) &&
    Number(candidate.index) > 0 &&
    (candidate.language === null ||
      candidate.language === undefined ||
      typeof candidate.language === "string")
  );
}

function getReadableText(content: string | null): string {
  if (typeof content !== "string" || !content) {
    return "";
  }
  return content
    .replace(markdownImagePattern, "")
    .replace(markdownLinkPattern, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/(\*\*|__|~~|`|\*|_)/g, "")
    .trim();
}

function getMarkdownImageUrls(content: string | null): string[] {
  if (typeof content !== "string" || !content) {
    return [];
  }
  return Array.from(content.matchAll(markdownImagePattern), (match) => match[2]);
}

export function isValidImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateEnemQuestion(
  question: EnemQuestion,
): QuestionValidationResult {
  const issues: string[] = [];
  if (!question || typeof question !== "object") {
    return {
      isValid: false,
      issues: ["registro de questão inválido"],
      criticalImageUrls: [],
      canContinueWithoutImages: false,
    };
  }
  if (!hasValidQuestionIdentity(question)) {
    issues.push("ano ou número da questão inválido");
  }
  const files = Array.isArray(question.files)
    ? question.files.filter(
        (file): file is string => typeof file === "string",
      )
    : [];
  const contextImages = [
    ...getMarkdownImageUrls(question.context),
    ...files,
  ].filter(isValidImageUrl);
  const hasReadablePrompt =
    getReadableText(question.context).length > 0 ||
    getReadableText(question.alternativesIntroduction).length > 0;
  const criticalImageUrls = [...contextImages];

  if (
    !OFFICIAL_DISCIPLINE_CODES.includes(
      question.discipline as (typeof OFFICIAL_DISCIPLINE_CODES)[number],
    )
  ) {
    issues.push("área de conhecimento não identificada");
  }

  if (!hasReadablePrompt && contextImages.length === 0) {
    issues.push("enunciado ausente");
  }

  const alternatives = question.alternatives;
  const hasFiveAlternatives =
    Array.isArray(alternatives) &&
    alternatives.length === alternativeLetters.length &&
    alternatives.every(
      (alternative) =>
        alternative !== null && typeof alternative === "object",
    );
  if (!hasFiveAlternatives) {
    issues.push("a questão não contém cinco alternativas");
  }

  if (hasFiveAlternatives) {
    const letters = alternatives.map((alternative) => alternative.letter);
    const hasAllLetters = alternativeLetters.every((letter) =>
      letters.includes(letter),
    );
    if (!hasAllLetters || new Set(letters).size !== alternativeLetters.length) {
      issues.push("as alternativas não estão identificadas de A a E");
    }

    for (const alternative of alternatives) {
      if (typeof alternative.isCorrect !== "boolean") {
        issues.push(
          `o gabarito da alternativa ${alternative.letter} é inválido`,
        );
      }
      const hasText =
        typeof alternative.text === "string" && Boolean(alternative.text.trim());
      const hasValidImage =
        typeof alternative.file === "string" &&
        isValidImageUrl(alternative.file);
      if (!hasText && !hasValidImage) {
        issues.push(
          `a alternativa ${alternative.letter} não tem conteúdo disponível`,
        );
      } else if (alternative.file && hasValidImage) {
        criticalImageUrls.push(alternative.file);
      }
    }
  }

  if (!alternativeLetters.includes(question.correctAlternative)) {
    issues.push("gabarito inválido");
  }

  if (hasFiveAlternatives) {
    const correctAlternatives = alternatives.filter(
      (alternative) => alternative.isCorrect,
    );
    if (
      correctAlternatives.length !== 1 ||
      correctAlternatives[0]?.letter !== question.correctAlternative
    ) {
      issues.push("gabarito inconsistente com as alternativas");
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    criticalImageUrls: Array.from(new Set(criticalImageUrls)),
    canContinueWithoutImages:
      hasReadablePrompt &&
      Array.isArray(alternatives) &&
      alternatives.length === alternativeLetters.length &&
    alternatives.every(
      (alternative) =>
        typeof alternative.text === "string" &&
        Boolean(alternative.text.trim()),
    ),
  };
}
