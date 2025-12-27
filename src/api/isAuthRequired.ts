// src/api/isAuthRequired.ts
import { ApiError } from "./http";

export function isAuthRequired(e: unknown) {
  return e instanceof ApiError && e.message === "AUTH_REQUIRED";
}
