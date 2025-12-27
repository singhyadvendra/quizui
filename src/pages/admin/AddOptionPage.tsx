// src/pages/admin/AddOptionPage.tsx
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addOption } from "../../api/adminApi";
import type { OptionAdminDto } from "../../api/adminApi";

import { isAuthRequired } from "../../api/isAuthRequired";

export default function AddOptionPage() {
  const navigate = useNavigate();
  const params = useParams<{ questionId: string }>();

  const questionIdNum = useMemo(() => Number(params.questionId), [params.questionId]);

  const [optionNo, setOptionNo] = useState<number>(1);
  const [text, setText] = useState<string>("");
  const [correct, setCorrect] = useState<boolean>(false);

  const [created, setCreated] = useState<OptionAdminDto | null>(null);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreated(null);

    if (!Number.isFinite(questionIdNum) || questionIdNum <= 0) {
      setError("Invalid questionId in URL");
      return;
    }

    try {
      const dto = await addOption(questionIdNum, { optionNo, text, correct });
      setCreated(dto);

      setOptionNo((n) => n + 1);
      setText("");
      setCorrect(false);
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
      <h3>Add Option (Question {params.questionId})</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Option No
          <input
            type="number"
            value={optionNo}
            onChange={(e) => setOptionNo(Number(e.target.value))}
            min={1}
            required
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Text
          <input value={text} onChange={(e) => setText(e.target.value)} required style={{ width: "100%" }} />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={correct} onChange={(e) => setCorrect(e.target.checked)} />
          Correct
        </label>

        <button type="submit">Add Option</button>
      </form>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {created && (
        <div style={{ marginTop: 16 }}>
          <p>Created option:</p>
          <pre style={{ background: "#f6f6f6", padding: 12, overflowX: "auto" }}>
            {JSON.stringify(created, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
