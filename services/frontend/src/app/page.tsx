"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  Ban,
  Loader2,
  AlertCircle,
  Clock,
  PlayCircle,
} from "lucide-react";
import { AudioPlayer } from "../components/AudioPlayer";
import { CommitmentCard } from "../components/CommitmentCard";
import { UnresolvedQuestions } from "../components/UnresolvedQuestions";
import { SampleSelector } from "../components/SampleSelector";
import { AudioUploader } from "../components/AudioUploader";
import {
  fetchConversation,
  fetchSamples,
  getAudioStreamUrl,
  loadSample,
  pollConversationStatus,
} from "../lib/api";
import { ConversationDetail, SampleSummary } from "../types";

export default function DashboardPage() {
  const [samples, setSamples] = useState<SampleSummary[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>("sample_01");
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [jumpTarget, setJumpTarget] = useState<{ timeMs: number; nonce: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"commitments" | "proposals">("commitments");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Load samples on initial mount
  useEffect(() => {
    async function init() {
      try {
        const sampleList = await fetchSamples();
        setSamples(sampleList);
        if (sampleList.length > 0) {
          handleSelectSample(sampleList[0].sample_id);
        }
      } catch (err) {
        console.error("Could not fetch samples:", err);
      }
    }
    init();
  }, []);

  const handleSelectSample = async (sampleId: string) => {
    setSelectedSampleId(sampleId);
    setIsLoading(true);
    setProcessingStatus("Loading discussion...");
    try {
      const data = await loadSample(sampleId);
      setConversation(data);
    } catch (err) {
      console.error("Could not load sample:", err);
      showToast("Failed to load sample discussion");
    } finally {
      setIsLoading(false);
      setProcessingStatus(null);
    }
  };

  const handleUploadStart = (fileName: string) => {
    // Immediately hide benchmark selectors and switch to uploaded mode
    setSelectedSampleId(null);
    setIsLoading(true);
    setProcessingStatus("Uploading audio file...");

    const cleanTitle = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    setConversation({
      id: "",
      title: cleanTitle,
      audio_s3_key: "",
      duration_seconds: 0,
      status: "UPLOADED",
      is_inconclusive: false,
      inconclusive_reason: null,
      speakers: [],
      commitments: [],
      unresolved_questions: [],
      transcript: [],
    });
  };

  const handleUploadSuccess = async (conversationId: string, title?: string) => {
    setSelectedSampleId(null);
    setIsLoading(true);
    setProcessingStatus("Transcribing audio and extracting commitments...");

    try {
      // 1. Immediately fetch the conversation record so audio playback is ready
      const initialConv = await fetchConversation(conversationId);
      setConversation(initialConv);

      // 2. Poll worker status until completed or failed
      const maxAttempts = 40;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const poll = await pollConversationStatus(conversationId);

        if (poll.status === "COMPLETED") {
          break;
        } else if (poll.status === "FAILED") {
          if (poll.inconclusive_reason?.toLowerCase().includes("api key")) {
            showToast("Missing API key");
          } else {
            showToast("Processing failed");
          }
          break;
        }
      }

      // 3. Load final extracted commitments and citations
      const finalData = await fetchConversation(conversationId);
      setConversation(finalData);

      if (finalData.inconclusive_reason?.toLowerCase().includes("api key")) {
        showToast("Missing API key");
      }
    } catch (err) {
      console.error("Could not fetch conversation:", err);
      showToast("Error processing audio");
    } finally {
      setIsLoading(false);
      setProcessingStatus(null);
    }
  };

  const handleJumpToQuote = (startMs: number) => {
    setJumpTarget({ timeMs: startMs, nonce: Date.now() });
  };

  const activeAndCancelledCommitments =
    conversation?.commitments.filter(
      (c) => c.status === "ACTIVE" || c.status === "CANCELLED"
    ) || [];

  const unacceptedProposals =
    conversation?.commitments.filter(
      (c) => c.status === "PROPOSAL_UNACCEPTED"
    ) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Navigation */}
      <nav className="mb-6 pb-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
            CS
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 tracking-tight leading-none">
              CommitStream
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Audio to Final Commitments
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
            Interactive Prototype &bull; No Signup Required
          </span>
        </div>
      </nav>

      {/* Hero: Sells what it is, who it's for, and why it matters */}
      <section className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="max-w-3xl">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2 leading-snug">
            Turn recorded team syncs into verified final commitments.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
            Most AI meeting tools generate verbose summaries that blur agreed work with casual brainstorming.
            CommitStream extracts final agreed tasks, confirmed owners, and negotiated deadlines — pairing each commitment with an audio citation you can verify in one click.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs text-slate-700">
            <div className="space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-800" />
                <span>Explicit Task Owners</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Separates confirmed assignees from unassigned tasks without guessing from proximity.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-800" />
                <span>Negotiated Deadlines</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Captures the corrected final date agreed upon, ignoring discarded ideas.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5 text-slate-800" />
                <span>Audio Citations</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Click any quotation to scrub the audio player directly to that spoken sentence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Input / Control Row */}
      <div className="mb-6">
        {selectedSampleId !== null ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SampleSelector
                samples={samples}
                selectedSampleId={selectedSampleId}
                onSelectSample={handleSelectSample}
                isLoading={isLoading}
              />
            </div>
            <div>
              <AudioUploader
                onUploadStart={handleUploadStart}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex-1">
              <AudioUploader
                onUploadStart={handleUploadStart}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 flex items-center justify-end shrink-0">
              <button
                onClick={() => samples.length > 0 && handleSelectSample(samples[0].sample_id)}
                className="text-xs font-semibold px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                ← Try Example Discussions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audio Player Bar */}
      <div className="mb-6">
        <AudioPlayer
          streamUrl={conversation && conversation.id ? getAudioStreamUrl(conversation.id) : null}
          title={conversation?.title || "No audio loaded"}
          initialDuration={conversation?.duration_seconds}
          jumpTarget={jumpTarget}
        />
      </div>

      {/* Loading / Processing State */}
      {isLoading && (
        <div className="flex items-center justify-center p-12 bg-white border border-slate-200 rounded-lg mb-6">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
          <span className="text-sm text-slate-600 font-medium">
            {processingStatus || "Processing conversation..."}
          </span>
        </div>
      )}

      {/* Processing Error Notice */}
      {!isLoading && conversation?.status === "FAILED" && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-5 mb-6 text-xs text-rose-900 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-sm text-rose-950 mb-1">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Processing Failed</span>
          </div>
          <p>{conversation.inconclusive_reason || "Unable to extract commitments from this recording."}</p>
        </div>
      )}

      {/* Inconclusive Dialogue Warning */}
      {!isLoading && conversation?.status === "COMPLETED" && conversation?.is_inconclusive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-sm text-amber-950 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Conversation Inconclusive (Declined to Conclude)</span>
          </div>
          <p>{conversation.inconclusive_reason}</p>
        </div>
      )}

      {/* Main Results Grid */}
      {!isLoading && conversation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Commitments & Proposals */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tab navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("commitments")}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition ${
                    activeTab === "commitments"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Final Commitments ({activeAndCancelledCommitments.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("proposals")}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition ${
                    activeTab === "proposals"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Discarded Proposals ({unacceptedProposals.length})</span>
                </button>
              </div>

              {conversation.speakers.length > 0 && (
                <div className="text-xs text-slate-500">
                  Speakers: <span className="font-medium text-slate-800">{conversation.speakers.join(", ")}</span>
                </div>
              )}
            </div>

            {/* Commitments Tab Content */}
            {activeTab === "commitments" && (
              <div className="space-y-3">
                {activeAndCancelledCommitments.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
                    No active or cancelled commitments found.
                  </div>
                ) : (
                  activeAndCancelledCommitments.map((c) => (
                    <CommitmentCard
                      key={c.id}
                      commitment={c}
                      onJumpToQuote={handleJumpToQuote}
                    />
                  ))
                )}
              </div>
            )}

            {/* Proposals Tab Content */}
            {activeTab === "proposals" && (
              <div className="space-y-3">
                {unacceptedProposals.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
                    No rejected proposals found.
                  </div>
                ) : (
                  unacceptedProposals.map((c) => (
                    <CommitmentCard
                      key={c.id}
                      commitment={c}
                      onJumpToQuote={handleJumpToQuote}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right 1 Col: Unresolved Questions */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 pb-2 border-b border-slate-200">
              <FileQuestion className="w-3.5 h-3.5 text-amber-500" />
              <span>Unresolved Questions ({conversation.unresolved_questions.length})</span>
            </div>

            <UnresolvedQuestions
              questions={conversation.unresolved_questions}
              onJumpToQuote={handleJumpToQuote}
            />
          </div>
        </div>
      )}

      {/* Minimal Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-xl border border-slate-800 transition-all">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
