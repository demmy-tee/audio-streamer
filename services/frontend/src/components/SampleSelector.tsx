"use client";

import React from "react";
import { Sparkles, FileAudio } from "lucide-react";
import { SampleSummary } from "../types";

interface SampleSelectorProps {
  samples: SampleSummary[];
  selectedSampleId: string | null;
  onSelectSample: (sampleId: string) => void;
  isLoading: boolean;
}

export function SampleSelector({
  samples,
  selectedSampleId,
  onSelectSample,
  isLoading,
}: SampleSelectorProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileAudio className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900">Preloaded Benchmarks</h3>
        </div>
        <span className="text-xs text-slate-500">1-Click Evaluation</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {samples.map((s) => {
          const isSelected = selectedSampleId === s.sample_id;
          return (
            <button
              key={s.sample_id}
              onClick={() => onSelectSample(s.sample_id)}
              disabled={isLoading}
              className={`text-left p-3 rounded-md border text-xs transition ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <div className="font-semibold mb-1 truncate">{s.title}</div>
              <p className={`line-clamp-2 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                {s.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
