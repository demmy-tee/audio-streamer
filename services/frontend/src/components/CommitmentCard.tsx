"use client";

import React from "react";
import { User, Clock, AlertCircle, PlayCircle } from "lucide-react";
import { Commitment } from "../types";

interface CommitmentCardProps {
  commitment: Commitment;
  onJumpToQuote: (startMs: number) => void;
}

export function CommitmentCard({ commitment, onJumpToQuote }: CommitmentCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active Commitment
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled / Retracted
          </span>
        );
      case "PROPOSAL_UNACCEPTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Proposal (Unaccepted)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const formatTimestamp = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:border-slate-300 transition">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h4 className={`text-base font-semibold text-slate-900 ${commitment.status === "CANCELLED" ? "line-through text-slate-500" : ""}`}>
          {commitment.task_description}
        </h4>
        <div className="shrink-0">{getStatusBadge(commitment.status)}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
        {/* Owner */}
        <div className="flex items-center gap-1.5 text-slate-600">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-500">Owner:</span>
          {commitment.is_owner_assigned && commitment.owner_name ? (
            <span className="font-medium text-slate-900">{commitment.owner_name}</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Unassigned</span>
          )}
        </div>

        {/* Deadline */}
        <div className="flex items-center gap-1.5 text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-500">Deadline:</span>
          {commitment.deadline_raw ? (
            <span className="font-medium text-slate-900">{commitment.deadline_raw}</span>
          ) : (
            <span className="text-slate-400">None specified</span>
          )}
        </div>
      </div>

      {/* Missing Date Context Warning */}
      {commitment.missing_date_context && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 mb-4">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Relative date used without calendar anchor (e.g., &quot;next Wednesday&quot;).</span>
        </div>
      )}

      {/* Rationale */}
      <p className="text-xs text-slate-500 italic mb-4 border-l-2 border-slate-200 pl-3">
        {commitment.rationale}
      </p>

      {/* Supporting Citations */}
      {commitment.citations && commitment.citations.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Supporting Evidence
          </span>
          {commitment.citations.map((cit, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded p-2.5 text-xs"
            >
              <div className="italic text-slate-700 break-words min-w-0 flex-1">
                &ldquo;{cit.quote_text}&rdquo;
              </div>
              <button
                onClick={() => onJumpToQuote(cit.start_ms)}
                className="self-start sm:self-center shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 transition font-mono font-medium text-xs whitespace-nowrap"
                title="Jump to audio position"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>
                  {formatTimestamp(cit.start_ms)} - {formatTimestamp(cit.end_ms)}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
