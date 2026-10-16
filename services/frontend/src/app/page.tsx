"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, FileQuestion, Ban, Loader2 } from "lucide-react";
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
  const [activeTimeMs, setActiveTimeMs] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"commitments" | "proposals">("commitments");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Load samples on mount
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
    try {
      const data = await loadSample(sampleId);
      setConversation(data);
    } catch (err) {
      console.error("Could not load sample:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = async (conversationId: string) => {
    setSelectedSampleId(null);
    setIsLoading(true);
    try {
      // Poll worker status until completed or failed
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

      const data = await fetchConversation(conversationId);
      setConversation(data);
      if (data.inconclusive_reason?.toLowerCase().includes("api key")) {
        showToast("Missing API key");
      }
    } catch (err) {
      console.error("Could not fetch conversation:", err);
      showToast("Error processing audio");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJumpToQuote = (startMs: number) => {
    setActiveTimeMs(startMs);
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
      {/* Header */}
      <header className="mb-6 pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Audio Commitments Streamer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic extraction of agreed tasks, deadlines, and timestamped audio citations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </span>
        </div>
      </header>

      {/* Input / Control Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <SampleSelector
            samples={samples}
            selectedSampleId={selectedSampleId}
            onSelectSample={handleSelectSample}
            isLoading={isLoading}
          />
        </div>
        <div>
          <AudioUploader onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>

      {/* Audio Player Bar */}
      <div className="mb-6">
        <AudioPlayer
          streamUrl={conversation ? getAudioStreamUrl(conversation.id) : null}
          title={conversation?.title || "No audio loaded"}
          activeTimeMs={activeTimeMs}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-12 bg-white border border-slate-200 rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
          <span className="text-sm text-slate-600 font-medium">Processing conversation...</span>
        </div>
      )}

      {/* Inconclusive Warning */}
      {!isLoading && conversation?.is_inconclusive && !conversation?.inconclusive_reason?.toLowerCase().includes("api key") && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold text-sm text-amber-950 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
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
