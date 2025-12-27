// src/pages/admin/CreateQuizWizardPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addOption, addQuestion, createQuiz } from "../../api/adminApi";
import type {
  CreateOptionRequestDto,
  CreateQuestionRequestDto,
  CreateQuizRequestDto,
  QuestionType,
} from "../../api/adminApi";


import { ApiError } from "../../api/http";

type WizardOption = CreateOptionRequestDto & {
  clientId: string;
};

type WizardQuestion = Omit<CreateQuestionRequestDto, "points"> & {
  clientId: string;
  points: string;
  options: WizardOption[];
};

type SubmitResult = {
  quizId: number;
  createdQuestionIds: { clientQuestionId: string; questionId: number }[];
  createdOptionIds: { clientOptionId: string; optionId: number }[];
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function normalizeDecimal(points: string) {
  const v = points.trim();
  if (!v) return "1.00";
  return v;
}

function validateWizard(quiz: CreateQuizRequestDto, questions: WizardQuestion[]): string[] {
  const errors: string[] = [];
  if (!quiz.title || !quiz.title.trim()) errors.push("Quiz title is required.");
  if (questions.length === 0) errors.push("Add at least 1 question.");

  const seenQNos = new Set<number>();
  for (const q of questions) {
    if (!Number.isFinite(q.questionNo) || q.questionNo <= 0) {
      errors.push(`Question "${q.text || q.clientId}": questionNo must be >= 1.`);
    }
    if (seenQNos.has(q.questionNo)) {
      errors.push(`Duplicate questionNo: ${q.questionNo}. Each questionNo must be unique within a quiz.`);
    }
    seenQNos.add(q.questionNo);

    if (!q.text || !q.text.trim()) errors.push(`QuestionNo ${q.questionNo}: text is required.`);

    const pts = q.points.trim();
    if (!pts) errors.push(`QuestionNo ${q.questionNo}: points is required (e.g., 1.00).`);

    if (q.options.length === 0) errors.push(`QuestionNo ${q.questionNo}: add at least 1 option.`);

    const seenONos = new Set<number>();
    let correctCount = 0;

    for (const o of q.options) {
      if (!Number.isFinite(o.optionNo) || o.optionNo <= 0) {
        errors.push(`QuestionNo ${q.questionNo}: optionNo must be >= 1.`);
      }
      if (seenONos.has(o.optionNo)) {
        errors.push(`QuestionNo ${q.questionNo}: duplicate optionNo ${o.optionNo}.`);
      }
      seenONos.add(o.optionNo);

      if (!o.text || !o.text.trim()) errors.push(`QuestionNo ${q.questionNo}, Option ${o.optionNo}: text is required.`);
      if (o.correct) correctCount++;
    }

    if (q.type === "SINGLE" && correctCount !== 1) {
      errors.push(`QuestionNo ${q.questionNo}: SINGLE must have exactly 1 correct option (currently ${correctCount}).`);
    }
    if (q.type === "MULTI" && correctCount < 1) {
      errors.push(`QuestionNo ${q.questionNo}: MULTI must have at least 1 correct option.`);
    }
  }

  return errors;
}

function isAuthRequired(e: unknown): boolean {
  return e instanceof ApiError && e.message === "AUTH_REQUIRED";
}

function formatApiError(e: ApiError): string {
  // Prefer structured JSON message if available, otherwise fallback to bodyText
  const base = e.message || `HTTP ${e.status}`;
  const violations = e.payload?.violations?.length
    ? `\n` + e.payload.violations.map((v) => `- ${v.field}: ${v.message}`).join("\n")
    : "";

  // bodyText can be large HTML if backend redirected; include only if useful
  const body = e.bodyText && e.bodyText !== base ? `\n\nDetails:\n${e.bodyText.slice(0, 800)}` : "";
  return `API error (${e.status}): ${base}${violations}${body}`;
}

export default function CreateQuizWizardPage() {
  const navigate = useNavigate();

  // Quiz
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  // Questions
  const [questions, setQuestions] = useState<WizardQuestion[]>(() => [
    {
      clientId: uid("q"),
      questionNo: 1,
      type: "SINGLE",
      text: "",
      points: "1.00",
      required: true,
      options: [
        { clientId: uid("o"), optionNo: 1, text: "", correct: false },
        { clientId: uid("o"), optionNo: 2, text: "", correct: false },
      ],
    },
  ]);

  const quizPayload: CreateQuizRequestDto = useMemo(
    () => ({
      title: title.trim(),
      description: description.trim() ? description.trim() : undefined,
      active,
    }),
    [title, description, active]
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [result, setResult] = useState<SubmitResult | null>(null);

  function addNewQuestion() {
    const nextNo = questions.length === 0 ? 1 : Math.max(...questions.map((q) => q.questionNo)) + 1;

    setQuestions((prev) => [
      ...prev,
      {
        clientId: uid("q"),
        questionNo: nextNo,
        type: "SINGLE",
        text: "",
        points: "1.00",
        required: true,
        options: [
          { clientId: uid("o"), optionNo: 1, text: "", correct: false },
          { clientId: uid("o"), optionNo: 2, text: "", correct: false },
        ],
      },
    ]);
  }

  function removeQuestion(clientId: string) {
    setQuestions((prev) => prev.filter((q) => q.clientId !== clientId));
  }

  function updateQuestion(clientId: string, patch: Partial<WizardQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.clientId === clientId ? { ...q, ...patch } : q)));
  }

  function addOptionToQuestion(qClientId: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.clientId !== qClientId) return q;
        const nextNo = q.options.length === 0 ? 1 : Math.max(...q.options.map((o) => o.optionNo)) + 1;
        return {
          ...q,
          options: [...q.options, { clientId: uid("o"), optionNo: nextNo, text: "", correct: false }],
        };
      })
    );
  }

  function removeOption(qClientId: string, oClientId: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.clientId !== qClientId) return q;
        return { ...q, options: q.options.filter((o) => o.clientId !== oClientId) };
      })
    );
  }

  function updateOption(qClientId: string, oClientId: string, patch: Partial<WizardOption>) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.clientId !== qClientId) return q;
        return {
          ...q,
          options: q.options.map((o) => (o.clientId === oClientId ? { ...o, ...patch } : o)),
        };
      })
    );
  }

  function enforceSingleCorrect(qClientId: string, chosenOptClientId: string, correct: boolean) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.clientId !== qClientId) return q;
        if (q.type !== "SINGLE") return q;

        return {
          ...q,
          options: q.options.map((o) => {
            if (o.clientId === chosenOptClientId) return { ...o, correct };
            return correct ? { ...o, correct: false } : o;
          }),
        };
      })
    );
  }

  async function onValidate() {
    const errs = validateWizard(quizPayload, questions);
    setErrors(errs);
    return errs.length === 0;
  }

  async function onSubmitAll() {
    setSubmitError("");
    setResult(null);

    const ok = await onValidate();
    if (!ok) return;

    setSubmitting(true);
    try {
      // 1) Create quiz
      const quiz = await createQuiz(quizPayload);

      const createdQuestionIds: { clientQuestionId: string; questionId: number }[] = [];
      const createdOptionIds: { clientOptionId: string; optionId: number }[] = [];

      // 2) Create each question, then its options
      for (const q of questions) {
        const createdQ = await addQuestion(quiz.id, {
          questionNo: q.questionNo,
          type: q.type as QuestionType,
          text: q.text.trim(),
          points: normalizeDecimal(q.points),
          required: q.required,
        });

        createdQuestionIds.push({ clientQuestionId: q.clientId, questionId: createdQ.id });

        for (const o of q.options) {
          const createdO = await addOption(createdQ.id, {
            optionNo: o.optionNo,
            text: o.text.trim(),
            correct: o.correct,
          });
          createdOptionIds.push({ clientOptionId: o.clientId, optionId: createdO.id });
        }
      }

      setResult({
        quizId: quiz.id,
        createdQuestionIds,
        createdOptionIds,
      });
    } catch (e: unknown) {
      // Unified auth handling
      if (isAuthRequired(e)) {
        // Send user to home where login buttons exist (or you can navigate to /quiz or /admin)
        navigate("/", { replace: true });
        return;
      }

      if (e instanceof ApiError) {
        setSubmitError(formatApiError(e));
      } else if (e instanceof Error) {
        setSubmitError(e.message);
      } else {
        setSubmitError(String(e));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h3>Create Quiz Wizard</h3>

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>Step 1: Quiz</h4>

        <div style={{ display: "grid", gap: 12 }}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} required />
          </label>

          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%" }} />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </div>
      </section>

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h4 style={{ marginTop: 0 }}>Step 2: Questions + Options</h4>
          <button type="button" onClick={addNewQuestion} disabled={submitting}>
            + Add Question
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {questions.map((q, idx) => (
            <div key={q.clientId} style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>Question {idx + 1}</strong>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.clientId)}
                  disabled={submitting || questions.length <= 1}
                >
                  Remove Question
                </button>
              </div>

              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <label style={{ flex: "0 0 140px" }}>
                    Question No
                    <input
                      type="number"
                      value={q.questionNo}
                      onChange={(e) => updateQuestion(q.clientId, { questionNo: Number(e.target.value) })}
                      min={1}
                      style={{ width: "100%" }}
                      disabled={submitting}
                    />
                  </label>

                  <label style={{ flex: "0 0 180px" }}>
                    Type
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.clientId, { type: e.target.value as QuestionType })}
                      style={{ width: "100%" }}
                      disabled={submitting}
                    >
                      <option value="SINGLE">SINGLE</option>
                      <option value="MULTI">MULTI</option>
                    </select>
                  </label>

                  <label style={{ flex: "0 0 140px" }}>
                    Points
                    <input
                      value={q.points}
                      onChange={(e) => updateQuestion(q.clientId, { points: e.target.value })}
                      style={{ width: "100%" }}
                      disabled={submitting}
                    />
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 22 }}>
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.clientId, { required: e.target.checked })}
                      disabled={submitting}
                    />
                    Required
                  </label>
                </div>

                <label>
                  Text
                  <textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(q.clientId, { text: e.target.value })}
                    style={{ width: "100%" }}
                    disabled={submitting}
                  />
                </label>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>Options</strong>
                  <button type="button" onClick={() => addOptionToQuestion(q.clientId)} disabled={submitting}>
                    + Add Option
                  </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {q.options.map((o) => (
                    <div
                      key={o.clientId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "120px 1fr 140px 120px",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <label>
                        Option No
                        <input
                          type="number"
                          value={o.optionNo}
                          onChange={(e) => updateOption(q.clientId, o.clientId, { optionNo: Number(e.target.value) })}
                          min={1}
                          style={{ width: "100%" }}
                          disabled={submitting}
                        />
                      </label>

                      <label>
                        Text
                        <input
                          value={o.text}
                          onChange={(e) => updateOption(q.clientId, o.clientId, { text: e.target.value })}
                          style={{ width: "100%" }}
                          disabled={submitting}
                        />
                      </label>

                      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 18 }}>
                        <input
                          type="checkbox"
                          checked={o.correct}
                          disabled={submitting}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (q.type === "SINGLE") {
                              enforceSingleCorrect(q.clientId, o.clientId, checked);
                            } else {
                              updateOption(q.clientId, o.clientId, { correct: checked });
                            }
                          }}
                        />
                        Correct
                      </label>

                      <button type="button" onClick={() => removeOption(q.clientId, o.clientId)} disabled={submitting}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 12, color: "#555" }}>
                  {q.type === "SINGLE"
                    ? "Rule: SINGLE must have exactly 1 correct option. When you mark an option correct, others will be cleared automatically."
                    : "Rule: MULTI must have at least 1 correct option."}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <button type="button" onClick={onValidate} disabled={submitting}>
          Validate
        </button>

        <button type="button" onClick={onSubmitAll} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit All"}
        </button>
      </div>

      {errors.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f0c", borderRadius: 8 }}>
          <strong>Validation errors:</strong>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fff5f5",
            border: "1px solid #f2b8b5",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          {submitError}
        </pre>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <h4>Success</h4>
          <p>Created Quiz ID: {result.quizId}</p>
          <details>
            <summary>Created IDs</summary>
            <pre style={{ background: "#f6f6f6", padding: 12, overflowX: "auto" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
