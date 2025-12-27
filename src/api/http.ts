// src/api/http.ts
import type { ApiErrorDto } from "../types";

export class ApiError extends Error {
  status: number;
  bodyText: string;
  payload?: ApiErrorDto;

  constructor(message: string, status: number, bodyText = "", payload?: ApiErrorDto) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.bodyText = bodyText;
    this.payload = payload;
  }
}

type ApiFetchOptions = Omit<RequestInit, "headers" | "body"> & {
  headers?: Record<string, string>;
  body?: unknown;
};

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function looksLikeLoginRedirect(res: Response, contentType: string, requestPath: string) {
  // fetch follows redirects; you might end up on /login with 200 + HTML
  const redirectedToLogin =
    res.redirected && (res.url.includes("/login") || res.url.includes("/oauth2/authorization"));

  // For API endpoints, HTML almost always means "login page"
  const htmlForApi = requestPath.startsWith("/api/") && contentType.includes("text/html");

  return redirectedToLogin || htmlForApi;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  const init: RequestInit = {
    ...options,
    credentials: "include",
    headers,
  };

  if (options.body !== undefined) {
    const b = options.body;
    if (b instanceof FormData) {
      init.body = b;
    } else if (typeof b === "string") {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      init.body = b;
    } else {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      init.body = JSON.stringify(b);
    }
  }

  const res = await fetch(`${BASE}${path}`, init);

  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // NEW: handle "successful" HTML login responses for API calls
  if (looksLikeLoginRedirect(res, ct, path)) {
    throw new ApiError("AUTH_REQUIRED", 401, "Login required (HTML redirect)");
  }

  if (res.status === 401) {
  throw new ApiError("AUTH_REQUIRED", 401, "Unauthorized");
  }
if (res.status === 403) {
  throw new ApiError("FORBIDDEN", 403, "Forbidden");
  }


  if (!res.ok) {
    const text = await safeReadText(res);
    if (ct.includes("application/json")) {
      try {
        const payload = JSON.parse(text) as ApiErrorDto;
        throw new ApiError(payload.message || `HTTP ${res.status}`, res.status, text, payload);
      } catch {
        // ignore
      }
    }
    throw new ApiError(text || `HTTP ${res.status}`, res.status, text);
  }

  if (res.status === 204) return undefined as T;

  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }

  // Non-JSON success (rare). Still supported.
  const text = await safeReadText(res);
  return text as unknown as T;
}
