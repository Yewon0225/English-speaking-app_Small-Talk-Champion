export interface PhrasalVerbItem {
  id: number;
  verb: string;
  koreanMeaning: string;
  contextTag: string;
  contextShort: string;
  buddyTitle: string;
  buddyBadgeIcon?: string;
  cefrLevel: string;
  status: 'active' | 'next' | 'queue' | 'locked';
  
  // Important Context & Nuance Explanation
  nuanceExplanation: string;
  usageTip: string;
  
  // Step 1: Example sentence practice
  exampleSentence: {
    english: string;
    korean: string;
    targetPhrase: string;
  };

  // Step 2: Practice dialogue (Role-play)
  dialogue: {
    partnerPrompt: string;
    partnerKorean: string;
    studentTargetSentence: string;
    studentKorean: string;
    targetPhrase: string;
  };

  // First-letter elicitation hint
  elicitationHint: string;
}

export interface FeedbackResult {
  success: boolean;
  status: 'success' | 'near_success' | 'recast' | 'elicitation' | 'empty';
  feedbackText: string;
  koreanNote: string;
  attempt: number;
}

export type TabType = 'learn' | 'practice' | 'review' | 'progress';

export interface SavedSentence {
  id: string;
  verbId: number;
  verb: string;
  type: 'dialogue' | 'example';
  english: string;
  korean: string;
  savedAt: number;
}

export interface UserProgress {
  activeVerbId: number;
  completedVerbIds: number[];
  verbStars: Record<number, number>; // verbId -> 1 to 3 stars
  xp: number;
  streakDays: number;
  pronunciationScores: Record<number, number>;
}
