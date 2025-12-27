// src/pages/admin/AddQuestionPage.tsx
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addQuestion } from "../../api/adminApi";
import type { QuestionAdminDto, QuestionType } from "../../api/adminApi";

import { isAuthRequired } from "../../api/isAuthRequired";

export default function AddQuestionPage() {
  const navigate = useNavigate();
  const params = useParams<{ quizId: string }>();
  const quizIdNum = useMemo(() => Number(params.quizId), [params.quizId]);

  const [questionNo, setQuestionNo] = useState<number>(1);
  const [type, setType] = useState<QuestionType>("SINGLE");
  const [text, setText] = useState<string>("");
  const [points, setPoints] = useState<string>("1.00");
  const [required, setRequired] = useState<boolean>(true);

  const [created, setCreated] = useState<QuestionAdminDto | null>(null);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreated(null);

    if (!Number.isFinite(quizIdNum) || quizIdNum <= 0) {
      setError("Invalid quizId in URL");
      return;
    }

    try {
      const dto = await addQuestion(quizIdNum, { questionNo, type, text, points, required });
      setCreated(dto);
    } catch (err) {
      if (isAuthRequired(err)) {
        navigate("/", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h3>Add Question (Quiz {params.quizId})</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Question No
          <input
            type="number"
            value={questionNo}
            onChange={(e) => setQuestionNo(Number(e.target.value))}
            min={1}
            required
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as QuestionType)} style={{ width: "100%" }}>
            <option value="SINGLE">SINGLE</option>
            <option value="MULTI">MULTI</option>
          </select>
        </label>

        <label>
          Text
          <textarea value={text} onChange={(e) => setText(e.target.value)} required style={{ width: "100%" }} />
        </label>

        <label>
          Points
          <input value={points} onChange={(e) => setPoints(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Required
        </label>

        <button type="submit">Add Question</button>
      </form>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {created && (
        <div style={{ marginTop: 16 }}>
          <p>Created question:</p>
          <pre style={{ background: "#f6f6f6", padding: 12, overflowX: "auto" }}>
            {JSON.stringify(created, null, 2)}
          </pre>

          <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to={`/admin/questions/${created.id}/options/new`}>Add Option</Link>
            <Link to={`/admin/quizzes/${created.quizId}/questions/new`}>Add Another Question</Link>
          </p>
        </div>
      )}
    </div>
  );
}
