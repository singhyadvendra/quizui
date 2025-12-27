import { useState } from "react";
import { Link } from "react-router-dom";
import { createQuiz } from "../../api/adminApi";
import type { QuizAdminDto } from "../../api/adminApi";


export default function CreateQuizPage() {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);

  const [created, setCreated] = useState<QuizAdminDto | null>(null);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreated(null);

    try {
      const dto = await createQuiz({
        title,
        description: description.trim() ? description : undefined,
        active,
      });
      setCreated(dto);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h3>Create Quiz</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>

        <button type="submit">Create</button>
      </form>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {created && (
        <div style={{ marginTop: 16 }}>
          <p>Created quiz:</p>
          <pre style={{ background: "#f6f6f6", padding: 12, overflowX: "auto" }}>
            {JSON.stringify(created, null, 2)}
          </pre>

          <p>
            Next:{" "}
            <Link to={`/admin/quizzes/${created.id}/questions/new`}>
              Add Question
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
