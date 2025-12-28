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
  const isMulti = question.type === "MULTI";
  const isWeighted = question.scoringMode === "WEIGHTED";

  return (
    <div className="card shadow-lg p-5 rounded-4 bg-white border-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h4 className="text-primary mb-0">
          Q{question.questionNo}. {question.text}
        </h4>

        <span className="badge bg-secondary">
          {isMulti ? "Multi-select" : "Single-select"}
        </span>
      </div>

      {/* Meta */}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
        <div className="text-muted">
          Max score: <strong>{question.points}</strong>
        </div>

        {isWeighted && (
          <span className="badge bg-info text-dark">
            Weighted scoring
          </span>
        )}

        {question.required && (
          <span className="badge bg-warning text-dark">
            Required
          </span>
        )}
      </div>

      {/* Options */}
      <div className="d-grid gap-2">
        {question.options.map((opt, idx) => {
          const selected = selectedOptionIds.includes(opt.id);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggleOption(opt.id)}
              className={`btn text-start p-3 border-2 ${
                selected
                  ? "btn-primary border-primary"
                  : "btn-outline-secondary border-light-subtle"
              }`}
            >
              <strong>{String.fromCharCode(65 + idx)}.</strong> {opt.text}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {isMulti && (
        <div className="mt-3 d-flex justify-content-between align-items-center">
          <div className="text-muted" style={{ fontSize: "0.95rem" }}>
            You can select multiple options.
          </div>

          {onClear && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={onClear}
              type="button"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
