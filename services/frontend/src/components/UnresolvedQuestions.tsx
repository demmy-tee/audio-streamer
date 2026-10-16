"use client";

import React from "react";
import { HelpCircle, PlayCircle } from "lucide-react";
import { UnresolvedQuestion } from "../types";

interface UnresolvedQuestionsProps {
  questions: UnresolvedQuestion[];
  onJumpToQuote: (startMs: number) => void;
}

export function UnresolvedQuestions({ questions, onJumpToQuote }: UnresolvedQuestionsProps) {
  const formatTimestamp = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
        No unresolved questions detected.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-slate-300 transition"
        >
          <div className="flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                {q.question_text}
              </h4>
              {q.asked_by && (
                <p className="text-xs text-slate-500 mb-2">
                  Raised by: <span className="font-medium text-slate-700">{q.asked_by}</span>
                </p>
              )}

              {q.supporting_quote && (
                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs">
                  <span className="italic text-slate-600 truncate pr-2">
                    &ldquo;{q.supporting_quote}&rdquo;
                  </span>
                  {q.start_ms !== null && q.start_ms !== undefined && (
                    <button
                      onClick={() => onJumpToQuote(q.start_ms!)}
                      className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white hover:bg-slate-800 transition font-mono font-medium text-xs"
                    >
                      <PlayCircle className="w-3 h-3" />
                      <span>{formatTimestamp(q.start_ms)}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
