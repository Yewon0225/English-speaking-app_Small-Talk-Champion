import { FeedbackResult } from '../types';

// SpeechSynthesis TTS helper
export function speakText(
  text: string,
  rate: number = 0.9,
  onStart?: () => void,
  onEnd?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any active speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate; // 0.9x for normal, 0.7x for slow
    utterance.pitch = 1.0;

    // Try finding an en-US voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(
      (v) => v.lang.startsWith('en-US') && !v.name.includes('Bad')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (enVoice) {
      utterance.voice = enVoice;
    }

    if (onStart) utterance.onstart = onStart;
    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('TTS error:', err);
    if (onEnd) onEnd();
    return false;
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Clean text for word-by-word comparison (ignoring punctuation & capitalization)
export function normalizeSentence(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Compare word by word for visual feedback & highlighting
export function compareWords(target: string, spoken: string): {
  targetWords: { word: string; matched: boolean }[];
  accuracyPct: number;
} {
  const normTarget = normalizeSentence(target);
  const normSpoken = normalizeSentence(spoken);

  const tWords = normTarget.split(' ').filter(Boolean);
  const sWords = new Set(normSpoken.split(' ').filter(Boolean));

  let matchCount = 0;
  const targetWords = tWords.map((word) => {
    const matched = sWords.has(word);
    if (matched) matchCount++;
    return { word, matched };
  });

  const accuracyPct = tWords.length > 0 ? Math.round((matchCount / tWords.length) * 100) : 0;
  return { targetWords, accuracyPct };
}

// Check speech recognition browser support
export function checkSpeechSupport(): {
  supported: boolean;
  message?: string;
} {
  if (typeof window === 'undefined') {
    return { supported: false, message: 'SSR environment' };
  }

  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  if (!isSupported) {
    const userAgent = navigator.userAgent || '';
    const isInApp = /KAKAOTALK|Instagram|NAVER|Line/i.test(userAgent);
    if (isInApp) {
      return {
        supported: false,
        message: 'In-app browser detected. Please tap "..." and select "Open in Chrome" or Safari for speech recognition.',
      };
    }
    return {
      supported: false,
      message: 'Speech recognition is not available in this browser. Please open it in Google Chrome for the full speaking experience.',
    };
  }

  return { supported: true };
}

// Fallback Section 7 evaluator if server API is down
export function evaluateLocalFeedback(params: {
  phrasalVerb: string;
  targetSentence: string;
  userTranscript: string;
  attemptNumber: number;
}): FeedbackResult {
  const { phrasalVerb, targetSentence, userTranscript, attemptNumber } = params;

  if (!userTranscript || userTranscript.trim().length === 0) {
    return {
      success: false,
      status: 'empty',
      feedbackText: "I couldn't hear you clearly. Let's try again!",
      koreanNote: '목소리가 잘 들리지 않았어요. 다시 한번 말씀해 보세요!',
      attempt: attemptNumber,
    };
  }

  const cleanTarget = normalizeSentence(targetSentence);
  const cleanSpoken = normalizeSentence(userTranscript);
  const cleanVerb = normalizeSentence(phrasalVerb);

  // Check matching words accuracy
  const { accuracyPct } = compareWords(targetSentence, userTranscript);

  // Common inflections of the phrasal verb (e.g. run -> ran, end -> ended, call -> called, figure -> figured)
  const verbWords = cleanVerb.split(' ').filter(Boolean);
  const rootVerb = verbWords[0] || '';
  const particle = verbWords.slice(1).join(' ');

  const pastRoot =
    rootVerb === 'run' ? 'ran' :
    rootVerb === 'end' ? 'ended' :
    rootVerb === 'call' ? 'called' :
    rootVerb === 'figure' ? 'figured' :
    rootVerb;
  const ingRoot =
    rootVerb === 'run' ? 'running' :
    rootVerb === 'end' ? 'ending' :
    rootVerb === 'call' ? 'calling' :
    rootVerb === 'figure' ? 'figuring' :
    rootVerb;

  const verbVariants = [
    cleanVerb,
    particle ? `${pastRoot} ${particle}` : pastRoot,
    particle ? `${ingRoot} ${particle}` : ingRoot,
  ];

  const hasVerb = verbVariants.some((v) => cleanSpoken.includes(v));
  const isExact = cleanSpoken === cleanTarget;

  // 1. Success: Exact or high word accuracy (>= 75%) and includes key verb
  if (isExact || (accuracyPct >= 75 && (hasVerb || cleanTarget.includes(cleanSpoken)))) {
    return {
      success: true,
      status: 'success',
      feedbackText: 'Perfect! You are the small talk champion!',
      koreanNote: '잘했어요! 당신은 스몰톡 챔피언입니다!👑',
      attempt: attemptNumber,
    };
  }

  // 2. Near success: Key verb is spoken or good effort (>= 45% words match)
  if (hasVerb || accuracyPct >= 45) {
    return {
      success: true,
      status: 'near_success',
      feedbackText: `Good job! You can say, "${targetSentence}"`,
      koreanNote: '굿잡! 문법을 수정하면 더 완벽할거에요😊',
      attempt: attemptNumber,
    };
  }

  // 3. First attempt failure -> Recast (Section 7)
  if (attemptNumber <= 1) {
    return {
      success: false,
      status: 'recast',
      feedbackText: `Nice try! You can say, "${targetSentence}"`,
      koreanNote: '이렇게 말해 볼까요?',
      attempt: attemptNumber,
    };
  }

  // 4. Second attempt or more failure -> Elicitation with first-letter hint (Section 7)
  const hintVerb = verbWords.map((w) => w[0] + '_'.repeat(Math.max(1, w.length - 1))).join(' ');
  const firstLetter = phrasalVerb[0] ? phrasalVerb[0].toLowerCase() : '';
  return {
    success: false,
    status: 'elicitation',
    feedbackText: `You're almost there! Look at the phrase: "${hintVerb}"`,
    koreanNote: `동사는 ${firstLetter}로 시작해요.`,
    attempt: attemptNumber,
  };
}

// Request AI Feedback via server endpoint with seamless client fallback
export async function getSpeakingFeedback(params: {
  phrasalVerb: string;
  targetSentence: string;
  userTranscript: string;
  attemptNumber: number;
}): Promise<FeedbackResult> {
  // If user transcript is empty, return immediate friendly feedback without waiting on network
  if (!params.userTranscript || params.userTranscript.trim().length === 0) {
    return evaluateLocalFeedback(params);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.feedbackText) {
        return {
          success: Boolean(data.success),
          status: data.status || 'success',
          feedbackText: data.feedbackText,
          koreanNote: data.koreanNote || '',
          attempt: data.attempt || params.attemptNumber,
        };
      }
    }
  } catch (e) {
    console.warn('Using client-side Section 7 feedback rules fallback:', e);
  }

  return evaluateLocalFeedback(params);
}
