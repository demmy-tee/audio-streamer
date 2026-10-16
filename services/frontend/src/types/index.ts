export type CommitmentStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "PROPOSAL_UNACCEPTED"
  | "INCONCLUSIVE";

export type ConversationStatus =
  | "UPLOADED"
  | "TRANSCRIBING"
  | "EXTRACTING"
  | "COMPLETED"
  | "FAILED";

export interface EvidenceCitation {
  quote_text: string;
  start_ms: number;
  end_ms: number;
  speaker_name?: string | null;
}

export interface Commitment {
  id: string;
  task_description: string;
  owner_name?: string | null;
  is_owner_assigned: boolean;
  deadline_raw?: string | null;
  missing_date_context: boolean;
  status: CommitmentStatus;
  rationale: string;
  citations: EvidenceCitation[];
}

export interface UnresolvedQuestion {
  question_text: string;
  asked_by?: string | null;
  supporting_quote?: string | null;
  start_ms?: number | null;
  end_ms?: number | null;
}

export interface TranscriptSegment {
  sequence_order: number;
  speaker_name?: string | null;
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  audio_s3_key: string;
  duration_seconds: number;
  status: ConversationStatus;
  is_inconclusive: boolean;
  inconclusive_reason?: string | null;
  speakers: string[];
  commitments: Commitment[];
  unresolved_questions: UnresolvedQuestion[];
  transcript: TranscriptSegment[];
}

export interface SampleSummary {
  sample_id: string;
  title: string;
  description: string;
}
