"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, AlertCircle } from "lucide-react";

interface AudioPlayerProps {
  streamUrl: string | null;
  title: string;
  initialDuration?: number | null;
  jumpTarget?: { timeMs: number; nonce: number } | null;
  activeTimeMs?: number | null;
}

export function AudioPlayer({
  streamUrl,
  title,
  initialDuration,
  jumpTarget,
  activeTimeMs,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Sync duration whenever initialDuration changes
  useEffect(() => {
    if (initialDuration && initialDuration > 0) {
      setDuration((prev) => (prev > 0 ? prev : initialDuration));
    }
  }, [initialDuration]);

  // Reload audio and reset times when streamUrl changes
  useEffect(() => {
    setPlaybackError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    if (initialDuration && initialDuration > 0) {
      setDuration(initialDuration);
    } else {
      setDuration(0);
    }
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [streamUrl, initialDuration]);

  const triggerSeekAndPlay = (targetMs: number) => {
    setPlaybackError(null);
    const targetSeconds = Math.max(0, targetMs / 1000);
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.readyState >= 1) {
      audio.currentTime = targetSeconds;
      setCurrentTime(targetSeconds);
      audio.play().catch((err) => {
        console.warn("Audio play blocked by browser:", err);
      });
      setIsPlaying(true);
    } else {
      pendingSeekRef.current = targetSeconds;
      setCurrentTime(targetSeconds);
      audio.load();
    }
  };

  // Jump to specific timestamp when jumpTarget changes
  useEffect(() => {
    if (jumpTarget && jumpTarget.timeMs !== null && jumpTarget.timeMs !== undefined) {
      triggerSeekAndPlay(jumpTarget.timeMs);
    }
  }, [jumpTarget]);

  // Fallback for direct activeTimeMs updates
  useEffect(() => {
    if (activeTimeMs !== undefined && activeTimeMs !== null && !jumpTarget) {
      triggerSeekAndPlay(activeTimeMs);
    }
  }, [activeTimeMs, jumpTarget]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError(null);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err: any) {
        console.error("Audio playback error:", err);
        setPlaybackError("Playback prevented by browser. Click again to play.");
        setIsPlaying(false);
      }
    }
  };

  const syncDuration = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const d = audio.duration;
    if (d && !isNaN(d) && isFinite(d) && d > 0) {
      setDuration(d);
    } else if (initialDuration && initialDuration > 0) {
      setDuration(initialDuration);
    }

    if (pendingSeekRef.current !== null) {
      const seekSec = pendingSeekRef.current;
      pendingSeekRef.current = null;
      audio.currentTime = seekSec;
      setCurrentTime(seekSec);
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
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
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
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
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
        onCanPlay={syncDuration}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsPlaying(false);
          setPlaybackError("Audio stream loading error.");
        }}
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
              setCurrentTime(0);
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

      {playbackError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-2.5 py-1.5 mt-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{playbackError}</span>
        </div>
      )}
    </div>
  );
}
