// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";

import { api } from "./api";
import { ApiError } from "./api/http";
import type { AttemptResultDto, AttemptReviewDto, MeDto, QuestionDto, QuizSummaryDto } from "./types";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminHome from "./pages/admin/AdminHome";
import CreateQuizPage from "./pages/admin/CreateQuizPage";
import AddQuestionPage from "./pages/admin/AddQuestionPage";
import AddOptionPage from "./pages/admin/AddOptionPage";
import CreateQuizWizardPage from "./pages/admin/CreateQuizWizardPage";

import QuestionCard from "./components/QuestionCard";
import ProgressBar from "./components/ProgressBar";

type Stage = "AUTH" | "QUIZ_PICK" | "IN_PROGRESS" | "RESULT";

function Home() {
  const [me, setMe] = useState<MeDto | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setChecking(true);
      try {
        const meResp = await api.me();
        if (!cancelled && meResp && typeof (meResp as any).userId === "number") {
          setMe(meResp);
        } else if (!cancelled) {
          setMe(null);
        }
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const doLogout = async () => {
    try {
      await fetch("/logout", { method: "POST", credentials: "include" });
    } finally {
      setMe(null);
      window.location.assign("/");
    }
  };

  const isLoggedIn = !!me;

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h2>Quiz DICOM</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        {checking ? (
          <span>Checking session...</span>
        ) : isLoggedIn ? (
          <>
            <span style={{ opacity: 0.8 }}>
              Logged in as: {me?.fullName ?? me?.email ?? "User"}
            </span>

            <button type="button" onClick={doLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <a href="/oauth2/authorization/google">Login with Google</a>
            <a href="/oauth2/authorization/linkedin">Login with LinkedIn</a>
            <a href="/oauth2/authorization/github">Login with GitHub</a>
          </>
        )}
      </div>

      <hr style={{ margin: "16px 0" }} />

      <p>
        Start quiz: <Link to="/quiz">Go to Quiz</Link>
      </p>

      <p>
        Admin: <Link to="/admin">Admin Dashboard</Link>
      </p>

      <p style={{ fontSize: 13, color: "#555" }}>
        Note: If you are not logged in, quiz/admin routes may redirect you to login.
      </p>
    </div>
  );
}


function isAuthRequired(e: unknown) {
  return e instanceof ApiError && e.message === "AUTH_REQUIRED";
}

function QuizPlayer() {
  const [stage, setStage] = useState<Stage>("AUTH");
  const [me, setMe] = useState<MeDto | null>(null);

  const [quizzes, setQuizzes] = useState<QuizSummaryDto[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);

  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [step, setStep] = useState(0);

  // answers: questionId -> optionIds[]
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [attemptId, setAttemptId] = useState<number | null>(null);

  const [review, setReview] = useState<AttemptReviewDto | null>(null);


  const [result, setResult] = useState<AttemptResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[step];

  const currentSelectedOptionIds = useMemo(() => {
    if (!currentQuestion) return [];
    return answers[currentQuestion.id] ?? [];
  }, [answers, currentQuestion]);

  const resetQuizState = () => {
    setSelectedQuizId(null);
    setQuestions([]);
    setStep(0);
    setAnswers({});
    setAttemptId(null);
    setResult(null);
    setError(null);
    setSubmitting(false);
    setLoadingStart(false);
  };

  const goAuth = (msg?: string) => {
    resetQuizState();
    setMe(null);
    setQuizzes([]);
    setStage("AUTH");
    if (msg) setError(msg);
  };

  // On load: check login
  useEffect(() => {
    (async () => {
      setLoadingMe(true);
      setError(null);
      try {
        const meResp = await api.me();
        // Defensive: meResp must look like an object with userId
        if (!meResp || typeof meResp !== "object" || typeof (meResp as any).userId !== "number") {
          // This covers the case where a login HTML page slipped through
          goAuth("Login required.");
          return;
        }
        setMe(meResp);
        setStage("QUIZ_PICK");
      } catch (e) {
        if (isAuthRequired(e)) {
          setStage("AUTH");
        } else {
          // Keep AUTH but show error
          setStage("AUTH");
          setError(e instanceof Error ? e.message : "Failed to check session");
        }
      } finally {
        setLoadingMe(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load quizzes when logged in
  useEffect(() => {
    if (stage !== "QUIZ_PICK") return;

    (async () => {
      setLoadingQuizzes(true);
      setError(null);
      try {
        const q = await api.listQuizzes();
        // Defensive: ensure array
        if (!Array.isArray(q)) {
          goAuth("Login required.");
          return;
        }
        setQuizzes(q);
      } catch (e) {
        if (isAuthRequired(e)) {
          goAuth("Login required.");
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load quizzes");
      } finally {
        setLoadingQuizzes(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const login = (provider: "google" | "linkedin" | "github") => {
    window.location.href = `/oauth2/authorization/${provider}`;
  };

  const pickQuiz = async (quizId: number) => {
    setError(null);
    setLoadingStart(true);

    try {
      setSelectedQuizId(quizId);

      const qs = await api.getQuestions(quizId);
      if (!Array.isArray(qs) || qs.length === 0) {
        throw new Error("No questions found for this quiz.");
      }

      const init: Record<number, number[]> = {};
      qs.forEach((q) => (init[q.id] = []));
      setAnswers(init);

      setQuestions(qs);
      setStep(0);

      const attempt = await api.startAttempt(quizId);
      if (!attempt || typeof attempt.attemptId !== "number") {
        throw new Error("Failed to start attempt.");
      }
      setAttemptId(attempt.attemptId);

      setStage("IN_PROGRESS");
    } catch (e) {
      if (isAuthRequired(e)) {
        goAuth("Login required.");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to start quiz");
      resetQuizState();
      setStage("QUIZ_PICK");
    } finally {
      setLoadingStart(false);
    }
  };

  const toggleOption = (optionId: number) => {
    if (!currentQuestion) return;

    setAnswers((prev) => {
      const qid = currentQuestion.id;
      const existing = prev[qid] ?? [];

      if (currentQuestion.type === "SINGLE") {
        return { ...prev, [qid]: [optionId] };
      }

      const next = existing.includes(optionId)
        ? existing.filter((x) => x !== optionId)
        : [...existing, optionId];

      return { ...prev, [qid]: next };
    });
  };

  const clearCurrentSelection = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: [] }));
  };

  const canGoNext = () => {
    if (!currentQuestion) return false;

    const selected = answers[currentQuestion.id] ?? [];

    if (currentQuestion.required && selected.length === 0) return false;

    if (currentQuestion.type === "SINGLE" && currentQuestion.required && selected.length !== 1) {
      return false;
    }

    return true;
  };

  const next = async () => {
    setError(null);
    if (!currentQuestion) return;

    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }

    if (!attemptId) {
      setError("Attempt not started. Please reload.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        submittedAt: new Date().toISOString(),
        answers,
      };

      const res = await api.submitAttempt(attemptId, payload);
      setResult(res);
      const reviewData = await api.getAttemptReview(attemptId);
      setReview(reviewData);
      setStage("RESULT");
    } catch (e) {
      if (isAuthRequired(e)) {
        goAuth("Login required.");
        return;
      }
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- UI RENDER ----------------

  if (loadingMe) {
    return (
      <div className="container py-5" style={{ maxWidth: 720 }}>
        <div className="card p-5">
          <h4 className="mb-2">Loading…</h4>
          <div className="text-muted">Checking session…</div>
        </div>
      </div>
    );
  }

  if (stage === "AUTH") {
    return (
      <div className="container py-5" style={{ maxWidth: 720 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Quiz App</h2>
          <Link className="btn btn-outline-dark" to="/admin">
            Admin
          </Link>
        </div>

        <p className="text-muted">Login to continue.</p>

        <div className="d-grid gap-2" style={{ maxWidth: 420 }}>
          <button className="btn btn-outline-dark py-3" onClick={() => login("google")}>
            Continue with Google
          </button>
          <button className="btn btn-outline-primary py-3" onClick={() => login("linkedin")}>
            Continue with LinkedIn
          </button>
          <button className="btn btn-outline-dark py-3" onClick={() => login("github")}>
  Continue with GitHub
          </button>

        </div>

        {error && <div className="alert alert-danger mt-4">{error}</div>}
      </div>
    );
  }

  if (stage === "QUIZ_PICK") {
    return (
      <div className="container py-5" style={{ maxWidth: 900 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">Choose a Quiz</h2>
            <div className="text-muted">Logged in as: {me?.fullName ?? me?.email ?? "User"}</div>
            <div className="mt-2">
              <Link to="/admin">Go to Admin</Link>
            </div>
          </div>

          <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={async () => {
            try {
              await fetch("/logout", { method: "POST", credentials: "include" });
            } finally {
              // reset client state and force re-check of session
              window.location.assign("/quiz");
            }
          }}
        >
          Logout
        </button>

        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loadingQuizzes ? (
          <div className="card p-5">
            <div className="text-muted">Loading quizzes…</div>
          </div>
        ) : Array.isArray(quizzes) ? (
          <div className="row g-3">
            {quizzes.map((q) => (
              <div key={q.id} className="col-12 col-md-6">
                <div className="card p-4 h-100">
                  <h5 className="mb-2">{q.title}</h5>
                  <div className="text-muted mb-3" style={{ minHeight: 48 }}>
                    {q.description ?? "No description"}
                  </div>

                  <button
                    className="btn btn-success"
                    onClick={() => pickQuiz(q.id)}
                    disabled={loadingStart}
                  >
                    {loadingStart && selectedQuizId === q.id ? "Starting…" : "Start"}
                  </button>
                </div>
              </div>
            ))}

            {quizzes.length === 0 && (
              <div className="col-12">
                <div className="alert alert-warning mb-0">No active quizzes found.</div>
              </div>
            )}
          </div>
        ) : (
          <div className="alert alert-danger">
            Unexpected response while loading quizzes. Please login again.
          </div>
        )}
      </div>
    );
  }

  if (stage === "RESULT" && result && review) {
  return (
    <div className="container py-5" style={{ maxWidth: 900 }}>
      <div className="card p-5 mb-4">
        <h2 className="mb-2">Exam Summary</h2>

        <div className="fs-4 mb-2">
          Score: <strong>{review.score}</strong> / {review.totalPoints}
        </div>

        <div className="text-muted">
          Submitted at: {new Date(review.submittedAt).toLocaleString()}
        </div>
      </div>

      {review.items.map((q) => {
        const isPerfect = q.achievedScore === q.maxScore;
        const isZero = q.achievedScore === "0";

        return (
          <div key={q.questionId} className="card p-4 mb-3">
            <div className="d-flex justify-content-between align-items-start">
              <h5>
                Q{q.questionNo}. {q.text}
              </h5>

              <span
                className={`badge ${
                  isPerfect
                    ? "bg-success"
                    : isZero
                    ? "bg-danger"
                    : "bg-warning text-dark"
                }`}
              >
                {isPerfect
                  ? "Best Answer"
                  : isZero
                  ? "Incorrect"
                  : "Partially Correct"}
              </span>
            </div>

            <div className="text-muted mb-2">
              Score: <strong>{q.achievedScore}</strong> / {q.maxScore}
            </div>

            <ul className="list-group">
              {q.options.map((opt) => {
                const isSelected = q.selectedOptionIds.includes(opt.id);

                return (
                  <li
                    key={opt.id}
                    className={`list-group-item d-flex justify-content-between align-items-center ${
                      isSelected ? "list-group-item-primary" : ""
                    }`}
                  >
                    <span>
                      {opt.text}
                      {isSelected && <strong> (selected)</strong>}
                    </span>

                    {typeof opt.score === "number" && (
                      <span
                        className={`badge ${
                          opt.score === q.maxScore
                            ? "bg-success"
                            : opt.score > 0
                            ? "bg-warning text-dark"
                            : "bg-secondary"
                        }`}
                      >
                        {opt.score} mark{opt.score === 1 ? "" : "s"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}


      <button
        className="btn btn-primary mt-4"
        onClick={() => {
          resetQuizState();
          setStage("QUIZ_PICK");
        }}
      >
        Back to Quizzes
      </button>
    </div>
  );
}


  // IN_PROGRESS
  const total = questions.length;
  const currentNo = step + 1;

  return (
    <div className="container py-5" style={{ maxWidth: 720 }}>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3 text-muted">
        Quiz {selectedQuizId} • Question {currentNo} of {total}
      </div>

      <ProgressBar current={currentNo} total={total} />

      {currentQuestion ? (
        <QuestionCard
          question={currentQuestion}
          selectedOptionIds={currentSelectedOptionIds}
          onToggleOption={toggleOption}
          onClear={currentQuestion.type === "MULTI" ? clearCurrentSelection : undefined}
        />
      ) : (
        <div className="alert alert-warning">No question to display.</div>
      )}

      <button
        className="btn btn-success w-100 mt-4 py-3 fw-bold"
        disabled={!canGoNext() || submitting}
        onClick={next}
      >
        {submitting ? "Submitting…" : step === questions.length - 1 ? "Finish Test" : "Next Question"}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/quiz" element={<QuizPlayer />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        <Route path="wizard" element={<CreateQuizWizardPage />} />
        <Route path="quizzes/new" element={<CreateQuizPage />} />
        <Route path="quizzes/:quizId/questions/new" element={<AddQuestionPage />} />
        <Route path="questions/:questionId/options/new" element={<AddOptionPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
