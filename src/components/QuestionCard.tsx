import React from "react";
import type { QuestionDto } from "../types";

interface QuestionCardProps {
  question: QuestionDto;
  selectedOptionIds: number[];
  onToggleOption: (optionId: number) => void;
  onClear?: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOptionIds,
  onToggleOption,
  onClear,
}) => {
  return (
    <div className="card shadow-lg p-5 rounded-4 bg-white border-0">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h4 className="text-primary mb-0">{question.text}</h4>
        <span className="badge bg-secondary">
          {question.type === "MULTI" ? "Multi-select" : "Single-select"}
        </span>
      </div>

      <div className="d-flex gap-2 align-items-center mb-4">
        <div className="text-muted">Points: {question.points}</div>
        {question.required && <span className="badge bg-warning text-dark">Required</span>}
      </div>

      <div className="d-grid gap-2">
        {question.options.map((opt, idx) => {
          const selected = selectedOptionIds.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggleOption(opt.id)}
              className={`btn text-start p-3 border-2 ${
                selected ? "btn-primary border-primary" : "btn-outline-secondary border-light-subtle"
              }`}
            >
              <strong>{String.fromCharCode(65 + idx)}.</strong> {opt.text}
            </button>
          );
        })}
      </div>

      {question.type === "MULTI" && (
        <div className="mt-3 d-flex justify-content-between align-items-center">
          <div className="text-muted" style={{ fontSize: "0.95rem" }}>
            You can select multiple options.
          </div>
          {onClear && (
            <button className="btn btn-sm btn-outline-secondary" onClick={onClear} type="button">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
