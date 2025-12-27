// src/api/adminApi.ts
import { apiFetch } from "./http";

export type QuestionType = "SINGLE" | "MULTI";

export type QuizAdminDto = {
  id: number;
  title: string;
  description: string | null;
  active: boolean;
  createdAt: string; // ISO
};

export type QuestionAdminDto = {
  id: number;
  quizId: number;
  questionNo: number;
  type: QuestionType;
  text: string;
  points: string; // BigDecimal often serialized as string
  required: boolean;
  createdAt: string; // ISO
};

export type OptionAdminDto = {
  id: number;
  questionId: number;
  optionNo: number;
  text: string;
  correct: boolean;
  createdAt: string; // ISO
};

export type CreateQuizRequestDto = {
  title: string;
  description?: string;
  active: boolean;
};

export type CreateQuestionRequestDto = {
  questionNo: number;
  type: QuestionType;
  text: string;
  points: string;
  required: boolean;
};

export type CreateOptionRequestDto = {
  optionNo: number;
  text: string;
  correct: boolean;
};

// ---------- API calls (NO JSON.stringify) ----------

export function createQuiz(payload: CreateQuizRequestDto) {
  return apiFetch<QuizAdminDto>("/api/admin/quizzes", {
    method: "POST",
    body: payload,
  });
}

export function addQuestion(quizId: number, payload: CreateQuestionRequestDto) {
  return apiFetch<QuestionAdminDto>(`/api/admin/quizzes/${quizId}/questions`, {
    method: "POST",
    body: payload,
  });
}

export function addOption(questionId: number, payload: CreateOptionRequestDto) {
  return apiFetch<OptionAdminDto>(`/api/admin/questions/${questionId}/options`, {
    method: "POST",
    body: payload,
  });
}
