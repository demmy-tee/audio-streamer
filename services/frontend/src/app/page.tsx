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
  const [currentScreen, setCurrentScreen] = useState<"landing" | "workspace">("landing");
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("screen") === "workspace") {
        setCurrentScreen("workspace");
      }
    }
  }, []);

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

  if (currentScreen === "landing") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden">
        {/* Layered Background CSS Effects & Keyframe Animations */}
        <div className="absolute inset-0 bg-grid-slate pointer-events-none [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_60%,transparent_100%)] h-[700px] z-0" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-slate-200/70 via-slate-100/30 to-transparent blur-3xl pointer-events-none z-0 animate-float-slow" />
        <div className="absolute top-28 left-16 w-80 h-80 bg-slate-300/30 rounded-full blur-3xl pointer-events-none z-0 animate-float-delayed" />
        <div className="absolute top-36 right-16 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none z-0 animate-float-slow" />

        {/* Dynamic Animated Sound Waveform Bars */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 flex items-end justify-center gap-1.5 pointer-events-none opacity-40 z-0 h-16">
          {[24, 38, 18, 46, 30, 54, 26, 42, 18, 34, 50, 22, 38, 62, 30, 46, 22, 54, 34, 18, 46, 30, 58, 26, 42, 18, 38, 50, 26, 34].map((height, idx) => (
            <div
              key={idx}
              className="w-1.5 bg-slate-400 rounded-full animate-wave-bar"
              style={{
                height: `${height}px`,
                animationDelay: `${(idx % 10) * 0.15}s`,
                animationDuration: `${1.4 + (idx % 4) * 0.2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
          {/* Top Navigation */}
          <nav className="mb-12 pb-4 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
                CS
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  CommitStream
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <a href="#why-it-matters" className="text-slate-600 hover:text-slate-900 font-medium hidden sm:inline-block transition">
                Why It Matters
              </a>
              <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 font-medium hidden sm:inline-block transition">
                How It Works
              </a>
              <button
                onClick={() => setCurrentScreen("workspace")}
                className="px-4 py-2 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 transition shadow-sm flex items-center gap-1.5"
              >
                <span>Launch Workspace</span>
                <span>→</span>
              </button>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="mb-20 text-center max-w-3xl mx-auto pt-6 sm:pt-12">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-700 border border-slate-200/80 shadow-sm mb-5">
              Zero-Hallucination Audio Commitments Engine
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              Turn recorded team syncs into verified final commitments.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-10 max-w-2xl mx-auto">
              Traditional AI meeting notes create verbose transcripts that blur casual brainstorming with actual agreements. CommitStream extracts confirmed owners, agreed deadlines, and retracted scope — with click-to-play audio proof on every quotation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setCurrentScreen("workspace")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition shadow-md hover:shadow-lg"
              >
                <span>Launch Live Workspace</span>
                <span>→</span>
              </button>
              <a
                href="#why-it-matters"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-md bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 transition shadow-sm"
              >
                <span>See the Problem</span>
              </a>
            </div>
          </section>

          {/* Value Pillars & Problem Explanation */}
          <section id="why-it-matters" className="mb-20 scroll-mt-8">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Why traditional meeting summaries fail engineering teams
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto">
                Conversations are fluid. Ideas are proposed, deadlines are adjusted, and tasks get retracted. Most LLMs hallucinate agreements based on conversational proximity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel rounded-xl p-6 shadow-sm space-y-2 hover:border-slate-300 transition">
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs mb-3 shadow-sm">
                  01
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">Explicit Task Ownership</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Separates confirmed assignees from unassigned suggestions. If the team agrees a task is critical but doesn&apos;t name an owner, CommitStream records it as unassigned rather than guessing who spoke last.
                </p>
              </div>

              <div className="glass-panel rounded-xl p-6 shadow-sm space-y-2 hover:border-slate-300 transition">
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs mb-3 shadow-sm">
                  02
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">Negotiated Deadlines & Retraction</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When someone proposes Tuesday but the group settles on Wednesday at 3 PM, CommitStream records only the final negotiated agreement. Retracted tasks are marked as cancelled so nobody builds dead features.
                </p>
              </div>

              <div className="glass-panel rounded-xl p-6 shadow-sm space-y-2 hover:border-slate-300 transition">
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs mb-3 shadow-sm">
                  03
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">Click-to-Verify Audio Proof</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  No more arguing about what was agreed upon. Every extracted commitment is anchored to a timestamped citation. Click any quote to jump the audio player directly to that exact second.
                </p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="mb-20 scroll-mt-8 glass-panel rounded-xl p-6 sm:p-10 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">How It Works in 3 Steps</h2>
              <p className="text-xs text-slate-500 mt-0.5">Built for fast evaluation with zero setup.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs sm:text-sm">
              <div className="border-l-2 border-slate-900 pl-3.5 space-y-1">
                <div className="font-semibold text-slate-900">1. Select or Upload</div>
                <p className="text-slate-500 leading-relaxed text-xs">
                  Click any of our preloaded team discussions in the workspace to test instantly, or upload any recorded audio file (.wav, .mp3, .m4a).
                </p>
              </div>
              <div className="border-l-2 border-slate-900 pl-3.5 space-y-1">
                <div className="font-semibold text-slate-900">2. Deterministic Extraction</div>
                <p className="text-slate-500 leading-relaxed text-xs">
                  Our pipeline extracts final commitments, isolates unaccepted proposals, and flags unresolved questions without hallucination.
                </p>
              </div>
              <div className="border-l-2 border-slate-900 pl-3.5 space-y-1">
                <div className="font-semibold text-slate-900">3. Click to Listen</div>
                <p className="text-slate-500 leading-relaxed text-xs">
                  Click any timestamp badge on a commitment card to scrub the audio player directly to the exact spoken quotation.
                </p>
              </div>
            </div>
          </section>

          {/* Bottom Call to Action Banner */}
          <section className="text-center bg-slate-900 text-white rounded-xl p-8 sm:p-12 shadow-md">
            <h2 className="text-xl sm:text-2xl font-bold mb-3">Experience CommitStream in Action</h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-6">
              Test preloaded multi-speaker discussions or drop in your own audio file to inspect extracted commitments and instant audio scrubbing.
            </p>
            <button
              onClick={() => setCurrentScreen("workspace")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition shadow"
            >
              <span>Open Interactive Workspace</span>
              <span>→</span>
            </button>
          </section>
        </div>
      </div>
    );
  }

  // ============================================================================
  // WORKSPACE SCREEN: Interactive Product Screen
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Workspace Top Navigation */}
        <header className="mb-6 pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen("landing")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition shadow-sm"
              title="Return to Landing Page"
            >
              <span>← Back to Overview</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] tracking-wider">
                CS
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-none">
                  CommitStream Workspace
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-md shadow-sm font-medium">
              Live Product View
            </span>
          </div>
        </header>

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
    </div>
  );
}
