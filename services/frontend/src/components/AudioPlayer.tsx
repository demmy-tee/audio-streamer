"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  streamUrl: string | null;
  title: string;
  activeTimeMs?: number | null;
}

export function AudioPlayer({ streamUrl, title, activeTimeMs }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Jump to specific timestamp when activeTimeMs changes
  useEffect(() => {
    if (audioRef.current && activeTimeMs !== undefined && activeTimeMs !== null) {
      audioRef.current.currentTime = activeTimeMs / 1000;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [activeTimeMs]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!streamUrl) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 text-center text-slate-500 text-sm">
        Select a sample or upload audio to activate playback.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <audio
        ref={audioRef}
        src={streamUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center justify-between mb-2">
        <div className="truncate pr-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Now Playing</span>
          <h3 className="text-sm font-medium text-slate-900 truncate">{title}</h3>
        </div>
        <div className="flex items-center text-xs font-mono text-slate-500">
          <span>{formatTime(currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
            }
          }}
          className="p-2 rounded-full text-slate-500 hover:text-slate-800 transition"
          aria-label="Restart"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
        />

        <Volume2 className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}
