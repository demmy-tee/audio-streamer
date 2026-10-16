"use client";

import React, { useRef, useState } from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { uploadAudio } from "../lib/api";

interface AudioUploaderProps {
  onUploadSuccess: (conversationId: string) => void;
}

export function AudioUploader({ onUploadSuccess }: AudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const result = await uploadAudio(file);
      onUploadSuccess(result.conversation_id);
    } catch (err: any) {
      setError(err.message || "Failed to upload audio.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Upload New Recording</h3>
          <p className="text-xs text-slate-500">Supports WAV, MP3, M4A up to 25MB.</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/wav,audio/mp3,audio/mpeg,audio/m4a,audio/ogg"
          onChange={handleFileChange}
          className="hidden"
          id="audio-upload-input"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>Choose File</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-2.5 py-1.5 mt-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
