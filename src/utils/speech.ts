import { FeedbackResult, RoleplayMessage, RoleplaySummaryFeedback } from '../types';

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

// Fallback roleplay chat responses if network / server unavailable
const ROLEPLAY_CHAT_PRESETS: Record<string, Array<{ reply: string; korean: string }>> = {
  'figure out': [
    {
      reply: "Great! While you check the route, do you prefer taking the subway or walking if the weather is nice?",
      korean: "좋아! 대안을 찾는 동안, 날씨가 좋으면 지하철을 타는 편이 좋아 아니면 걸어가는 게 좋아?",
    },
    {
      reply: "Sounds like a solid plan! Should we also grab some snacks or iced tea along the way?",
      korean: "좋은 생각이야! 가는 길에 간식이나 아이스티도 좀 사 먹을까?",
    },
    {
      reply: "I love that idea! What is the favorite part of the city you're most excited to explore?",
      korean: "정말 좋다! 이번 여행에서 가장 둘러보고 싶은 곳은 어디야?",
    },
  ],
  'run out of': [
    {
      reply: "Thanks for grabbing some ice! While you're at the store, should I pick out some pastries for us too?",
      korean: "얼음 사다 줘서 고마워! 네가 상점에 간 사이에, 같이 먹을 빵도 몇 개 골라둘까?",
    },
    {
      reply: "Yum, that sounds delicious! Do you usually drink coffee every morning, or only when you're busy?",
      korean: "맛있겠다! 너는 보통 매일 아침 커피를 마셔, 아니면 바쁠 때만 마셔?",
    },
    {
      reply: "I totally agree! What's your absolute favorite drink when relaxing at a cafe?",
      korean: "완전 공감해! 카페에서 쉴 때 네가 가장 좋아하는 최애 음료는 뭐야?",
    },
  ],
  'call off': [
    {
      reply: "Good call! Staying inside is so much cozier. Should we watch a movie or order some comfort food instead?",
      korean: "좋은 판단이야! 비 올 땐 집에 있는 게 훨씬 아늑하지. 대신 영화를 보거나 맛있는 배달 음식을 시켜 먹을까?",
    },
    {
      reply: "That sounds perfect for a rainy afternoon! What genre of movies or shows do you usually enjoy?",
      korean: "비 오는 오후에 딱이네! 평소에 어떤 장르의 영화나 드라마를 좋아해?",
    },
    {
      reply: "Nice choice! Rainy days are truly the best excuse to unwind. How do you usually spend your free weekends?",
      korean: "좋은 선택이야! 비 오는 날은 푹 쉬기에 최고의 핑계지. 보통 자유로운 주말은 어떻게 보내?",
    },
  ],
  'end up': [
    {
      reply: "Burgers always hit the spot! Did you get fries and a drink with that too?",
      korean: "버거는 언제 먹어도 실패가 없지! 감자튀김이랑 음료도 같이 시켰어?",
    },
    {
      reply: "Haha, you really know how to enjoy good food! What is your go-to comfort food when you're super hungry?",
      korean: "하하, 맛있는 거 먹을 줄 아네! 배가 엄청 고플 때 찾는 너만의 소울푸드는 뭐야?",
    },
    {
      reply: "That makes me hungry just listening! Do you like cooking at home or eating out more often?",
      korean: "듣기만 해도 배고파진다! 너는 집에서 요리해 먹는 게 좋아, 아니면 외식하는 게 더 좋아?",
    },
  ],
  'turn down': [
    {
      reply: "That must have been a tough call, but taking care of your schedule comes first! How do you usually unwind after a busy week?",
      korean: "거절하기 쉽지 않았을 텐데, 네 스케줄을 챙기는 게 가장 중요하지! 바쁜 한 주를 보내고 나면 보통 어떻게 피로를 풀어?",
    },
    {
      reply: "That sounds like a relaxing way to recharge! Are you working on any personal hobbies or projects lately?",
      korean: "피로 풀기에 정말 좋은 방법이다! 요즘 재미있게 하고 있는 취미나 개인적인 프로젝트가 있어?",
    },
    {
      reply: "That's fantastic! Having time for yourself makes every week feel more balanced. What makes you happiest these days?",
      korean: "정말 멋지다! 나만의 시간을 가지는 게 삶의 균형을 잡아주지. 요즘 너를 가장 행복하게 해주는 건 뭐야?",
    },
  ],
};

export async function fetchRoleplayChat(params: {
  phrasalVerb: string;
  conversation: RoleplayMessage[];
}): Promise<{ reply: string; korean: string }> {
  const normVerb = params.phrasalVerb.toLowerCase().trim();
  const userTurnCount = params.conversation.filter((m) => m.sender === 'user').length;
  const list = ROLEPLAY_CHAT_PRESETS[normVerb] || ROLEPLAY_CHAT_PRESETS['figure out'];
  const fallback = list[Math.min(Math.max(0, userTurnCount - 1), list.length - 1)];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('/api/roleplay/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        return {
          reply: data.reply,
          korean: data.korean || fallback.korean,
        };
      }
    }
  } catch (e) {
    console.warn('Roleplay chat network fallback:', e);
  }

  return fallback;
}

export async function fetchRoleplayFeedback(params: {
  phrasalVerb: string;
  targetSentence: string;
  conversation: RoleplayMessage[];
}): Promise<RoleplaySummaryFeedback> {
  const userMessages = params.conversation.filter((m) => m.sender === 'user');
  const firstUserMsg = userMessages[0]?.text || '';
  const turnsCompleted = userMessages.length;

  const cleanTarget = normalizeSentence(params.targetSentence);
  const cleanFirst = normalizeSentence(firstUserMsg);
  const cleanVerb = normalizeSentence(params.phrasalVerb);

  const targetNailed = cleanFirst.includes(cleanVerb) || cleanFirst === cleanTarget;

  const fallback: RoleplaySummaryFeedback = {
    targetFeedback: targetNailed
      ? `Excellent! You used "${params.phrasalVerb}" accurately in the conversation: "${params.targetSentence}"`
      : `Nice try! Remember to use the key phrase: "${params.targetSentence}"`,
    targetFeedbackKorean: targetNailed
      ? `완벽해요! 상황에 맞춰 핵심 구동사 '${params.phrasalVerb}'을(를) 아주 자연스럽게 사용했습니다 👑`
      : `잘 시도했어요! 핵심 문장 "${params.targetSentence}"의 뉘앙스를 기억해 보세요 😊`,
    conversationPraise:
      turnsCompleted > 1
        ? `You kept the conversation going naturally like a true friend across ${turnsCompleted} turns!`
        : `You took the first step in speaking with Toto!`,
    conversationPraiseKorean:
      turnsCompleted > 1
        ? `토토와 총 ${turnsCompleted}번의 턴 동안 친구처럼 자연스럽고 자신감 넘치게 스몰톡을 이어갔어요!`
        : `토토와 함께 자신 있게 첫 마디를 떼었어요!`,
    overallPraise: `You're officially a Small Talk Champion! Keep having fun speaking English!`,
    overallPraiseKorean: `당신은 진정한 스몰톡 챔피언입니다! 앞으로도 자신 있게 영어로 대화해 보세요 👑`,
    turnsCompleted,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/roleplay/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.targetFeedback) {
        return {
          targetFeedback: data.targetFeedback,
          targetFeedbackKorean: data.targetFeedbackKorean || fallback.targetFeedbackKorean,
          conversationPraise: data.conversationPraise || fallback.conversationPraise,
          conversationPraiseKorean: data.conversationPraiseKorean || fallback.conversationPraiseKorean,
          overallPraise: data.overallPraise || fallback.overallPraise,
          overallPraiseKorean: data.overallPraiseKorean || fallback.overallPraiseKorean,
          turnsCompleted,
        };
      }
    }
  } catch (e) {
    console.warn('Roleplay feedback network fallback:', e);
  }

  return fallback;
}
