import type { WritingCompetencyId, WritingTopic } from "@/types/writing";

export const WRITING_ASSESSMENT_COMPETENCIES: readonly WritingCompetencyId[] = [
  "I",
  "II",
  "III",
  "IV",
  "V",
];

export const WRITING_ASSESSMENT_SCORE_LEVELS = [
  0, 40, 80, 120, 160, 200,
] as const;

export interface WritingAssessmentCriterion {
  competencyId: WritingCompetencyId;
  officialFocus: string;
  maximumScore: 200;
  scoreLevels: typeof WRITING_ASSESSMENT_SCORE_LEVELS;
}

export const WRITING_ASSESSMENT_CRITERIA: readonly WritingAssessmentCriterion[] =
  [
    {
      competencyId: "I",
      officialFocus: "Domínio da escrita formal em língua portuguesa.",
      maximumScore: 200,
      scoreLevels: WRITING_ASSESSMENT_SCORE_LEVELS,
    },
    {
      competencyId: "II",
      officialFocus:
        "Compreensão da proposta e desenvolvimento do tema no formato dissertativo-argumentativo.",
      maximumScore: 200,
      scoreLevels: WRITING_ASSESSMENT_SCORE_LEVELS,
    },
    {
      competencyId: "III",
      officialFocus:
        "Seleção e organização de informações e argumentos em defesa de um ponto de vista.",
      maximumScore: 200,
      scoreLevels: WRITING_ASSESSMENT_SCORE_LEVELS,
    },
    {
      competencyId: "IV",
      officialFocus:
        "Uso de mecanismos linguísticos para articular a argumentação.",
      maximumScore: 200,
      scoreLevels: WRITING_ASSESSMENT_SCORE_LEVELS,
    },
    {
      competencyId: "V",
      officialFocus:
        "Elaboração de proposta de intervenção que respeite os direitos humanos.",
      maximumScore: 200,
      scoreLevels: WRITING_ASSESSMENT_SCORE_LEVELS,
    },
  ];

export interface WritingAssessmentRequest {
  id: string;
  essayId: string;
  topic: WritingTopic;
  essayText: string;
  requestedAt: string;
  rubricVersion: string;
  criteria: readonly WritingAssessmentCriterion[];
}

export interface WritingCompetencyAssessment {
  competencyId: WritingCompetencyId;
  estimatedScore: number;
  justification: string;
  strengths: string[];
  suggestions: string[];
}

export type WritingAssessmentOriginKind =
  | "educational-model-estimate"
  | "educator-review"
  | "student-self-assessment";

export interface WritingAssessmentOrigin {
  kind: WritingAssessmentOriginKind;
  label: string;
  providerName?: string;
  modelName?: string;
}

export interface WritingAssessmentResult {
  id: string;
  requestId: string;
  evaluatedAt: string;
  rubricVersion: string;
  origin: WritingAssessmentOrigin;
  competencyResults: WritingCompetencyAssessment[];
  overallEstimatedScore: number;
  disclaimer: "educational-estimate-not-official";
}

export interface WritingAssessmentProvider {
  evaluate(
    request: WritingAssessmentRequest,
  ): Promise<WritingAssessmentResult>;
}
