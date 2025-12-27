// src/api.ts
import { apiFetch } from "./api/http";
import type {
  QuizSummaryDto,
  QuestionDto,
  StartAttemptResponseDto,
  SubmitAttemptRequestDto,
  AttemptResultDto,
  MeDto,
} from "./types";

export { ApiError } from "./api/http";

export const api = {
  me(): Promise<MeDto> {
    return apiFetch<MeDto>("/api/me");
  },

  listQuizzes(): Promise<QuizSummaryDto[]> {
    return apiFetch<QuizSummaryDto[]>("/api/quizzes");
  },

  getQuestions(quizId: number): Promise<QuestionDto[]> {
    return apiFetch<QuestionDto[]>(`/api/quizzes/${quizId}/questions`);
  },

  startAttempt(quizId: number): Promise<StartAttemptResponseDto> {
    return apiFetch<StartAttemptResponseDto>(`/api/quizzes/${quizId}/attempts/start`, {
      method: "POST",
      body: {}, // harmless; keeps Spring happy if it expects a body
    });
  },

  submitAttempt(attemptId: number, payload: SubmitAttemptRequestDto): Promise<AttemptResultDto> {
    return apiFetch<AttemptResultDto>(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
      body: payload,
    });
  },
};
