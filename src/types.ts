// src/types.ts

export type QuestionType = "SINGLE" | "MULTI";

export interface QuizSummaryDto {
  id: number;
  title: string;
  description: string | null;
  active: boolean;
  createdAt: string; // ISO
  
}

export interface OptionDto {
  id: number;
  optionNo: number;
  text: string;
  score: number;
}

export interface QuestionDto {
  id: number;
  questionNo: number;
  type: QuestionType;
  text: string;

  /**
   * Scoring mode for this question.
   * - BINARY   → legacy correct/incorrect
   * - WEIGHTED → best / second-best / partial credit
   */
  scoringMode: "BINARY" | "WEIGHTED";

  /**
   * For BINARY questions:
   *   - points = max points (e.g. "1")
   *
   * For WEIGHTED questions:
   *   - points represents the MAX possible score
   *     (backend should send max option score as string)
   *
   * Kept as string to match API payload.
   */
  points: string;

  required: boolean;
  options: OptionDto[];
}


export interface StartAttemptResponseDto {
  attemptId: number;
  quizId: number;
  startedAt: string; // ISO
}

export interface SubmitAttemptRequestDto {
  submittedAt?: string; // ISO
  answers: Record<number, number[]>; // questionId -> optionIds
}

export interface AttemptResultDto {
  attemptId: number;
  quizId: number;
  status: string;

  /**
   * Backend sends as string.
   */
  score: string;
  totalPoints: string;

  startedAt: string;   // ISO
  submittedAt: string; // ISO
}

export interface AttemptReviewDto {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  status: string;

  score: string;
  totalPoints: string;

  startedAt: string;
  submittedAt: string;

  items: AttemptReviewItemDto[];
}

export interface AttemptReviewItemDto {
  questionId: number;
  questionNo: number;
  type: QuestionType;
  text: string;

  /**
   * Score achieved for this question.
   * Backend sends as string.
   */
  achievedScore: string;

  /**
   * Maximum possible score for this question.
   * Backend sends as string.
   */
  maxScore: string;

  required: boolean;
  options: OptionDto[];
  selectedOptionIds: number[];
  correctOptionIds: number[];
  isCorrect: boolean;
}


export interface ApiViolationDto {
  field: string;
  message: string;
}

export interface ApiErrorDto {
  timestamp: string; // ISO
  status: number;
  error: string;
  message: string;
  path: string;
  violations?: ApiViolationDto[];
}

export interface IdentityDto {
  provider: string;
  providerSubject: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean | null;
  pictureUrl: string | null;
  lastLoginAt: string | null; // ISO
}

export interface MeDto {
  userId: number;
  fullName: string | null;
  email: string | null;
  identities: IdentityDto[];
}

/**
 * ---------- Small helpers for "number-as-string" fields ----------
 * Use these in UI when you need numeric comparison or calculations.
 */

export function toInt(value: string | number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function toFloat(value: string | number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}
