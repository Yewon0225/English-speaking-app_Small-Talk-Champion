import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 15) {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI:', err);
  }
}

// Section 7 Fallback Logic
function getDeterministicFeedback(params: {
  phrasalVerb: string;
  targetSentence: string;
  userTranscript: string;
  attemptNumber: number;
}) {
  const { phrasalVerb, targetSentence, userTranscript, attemptNumber } = params;
  const cleanTarget = targetSentence.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
  const cleanUser = userTranscript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
  const cleanVerb = phrasalVerb.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();

  const isExact = cleanUser === cleanTarget;
  const hasVerb = cleanUser.includes(cleanVerb);

  if (isExact || (cleanUser.length > 0 && cleanTarget.includes(cleanUser) && cleanUser.length >= cleanTarget.length * 0.9)) {
    return {
      success: true,
      status: 'success',
      feedbackText: 'Perfect! You are the small talk champion!',
      koreanNote: '잘했어요! 당신은 스몰톡 챔피언입니다!👑',
      attempt: attemptNumber,
    };
  }

  if (hasVerb && cleanUser.length >= cleanTarget.length * 0.7) {
    return {
      success: true,
      status: 'near_success',
      feedbackText: `Good job! You can say, "${targetSentence}"`,
      koreanNote: '굿잡! 문법을 수정하면 더 완벽할거에요😊',
      attempt: attemptNumber,
    };
  }

  if (attemptNumber <= 1) {
    return {
      success: false,
      status: 'recast',
      feedbackText: `Nice try! You can say, "${targetSentence}"`,
      koreanNote: '이렇게 말해 볼까요?',
      attempt: attemptNumber,
    };
  } else {
    // 2nd attempt or higher: elicitation (first-letter hint)
    const verbWords = phrasalVerb.split(' ');
    const hintVerb = verbWords.map(w => w[0] + '_'.repeat(Math.max(1, w.length - 1))).join(' ');
    const firstLetter = phrasalVerb[0];
    return {
      success: false,
      status: 'elicitation',
      feedbackText: `You're almost there! Look at the phrase: "${hintVerb}"`,
      koreanNote: `동사는 ${firstLetter}로 시작해요.`,
      attempt: attemptNumber,
    };
  }
}

app.post('/api/feedback', async (req, res) => {
  try {
    const { phrasalVerb, targetSentence, userTranscript, attemptNumber = 1 } = req.body;

    if (!targetSentence) {
      return res.status(400).json({ error: 'targetSentence is required' });
    }

    if (!userTranscript || userTranscript.trim().length === 0) {
      return res.json({
        success: false,
        status: 'empty',
        feedbackText: "I couldn't hear you clearly. Let's try again!",
        koreanNote: '목소리가 잘 들리지 않았어요. 다시 한번 말씀해 보세요!',
        attempt: attemptNumber,
      });
    }

    // Fallback computed first
    const fallback = getDeterministicFeedback({
      phrasalVerb: phrasalVerb || '',
      targetSentence,
      userTranscript,
      attemptNumber,
    });

    if (!ai) {
      return res.json(fallback);
    }

    // Call Gemini with strict Section 7 rules
    const systemPrompt = `You are 'Toto', a warm, generous, friendly supporter bear (왕관 곰돌이) helping a Korean student practice everyday English phrasal verbs.
Follow these STRICT rules from Section 7:
1. Praise first, ONE thing to fix, TWO sentences or fewer.
2. Format: English feedback sentence followed by Korean translation in parentheses. Example: "Nice try! You can say, \"...\" (이렇게 말해 볼까요?)"
3. Absolutely NO "wrong", NO number scores or percentages, NO descriptions of tongue/lip/mouth positions.
4. Judge by "Did the partner understand?", not native-like pronunciation. Check if the key phrasal verb is spoken correctly.
5. Feedback style depends on attempt:
   - If success: "Perfect! You are the small talk champion! (잘했어요! 당신은 스몰톡 챔피언입니다!👑)"
   - If success but small word missing: "Good job! You can say, \"...\" (굿잡! 문법을 수정하면 더 완벽할거에요😊)"
   - If 1st failure: Recast ("Nice try! You can say, \"[target sentence]\" (이렇게 말해 볼까요?)")
   - If 2nd failure: Elicitation with first-letter hint ("You're almost there! [hint with blanks] (동사는 [첫글자]로 시작해요.)")
6. Keep response in JSON format matching this schema:
   {"success": boolean, "status": "success"|"near_success"|"recast"|"elicitation", "feedbackText": "...", "koreanNote": "..."}`;

    const userPrompt = `Target Phrasal Verb: "${phrasalVerb}"
Target Sentence: "${targetSentence}"
Student's Spoken Transcription: "${userTranscript}"
Attempt Number: ${attemptNumber}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] }
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: 0 as any, // minimal thinking for instant speech feedback
          }
        }
      });

      const responseText = response.text?.trim();
      if (responseText) {
        const parsed = JSON.parse(responseText);
        return res.json({
          success: typeof parsed.success === 'boolean' ? parsed.success : fallback.success,
          status: parsed.status || fallback.status,
          feedbackText: parsed.feedbackText || fallback.feedbackText,
          koreanNote: parsed.koreanNote || fallback.koreanNote,
          attempt: attemptNumber,
        });
      }
    } catch (genErr) {
      console.warn('Gemini feedback generation fallback used:', genErr);
    }

    return res.json(fallback);
  } catch (err: any) {
    console.error('Feedback API error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Roleplay Dynamic Chat Fallback Generator
function getDeterministicRoleplayChat(phrasalVerb: string, userTurnCount: number) {
  const normVerb = phrasalVerb.toLowerCase().trim();

  const presets: Record<string, Array<{ reply: string; korean: string }>> = {
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
      {
        reply: "That sounds fantastic! We are going to have the best time together. Anything else you'd like to do?",
        korean: "진짜 신나겠다! 우리 같이 재미있게 보내자. 그 외에 또 해보고 싶은 건 있어?",
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
      {
        reply: "Great choice! Having good coffee with a good friend makes the whole day brighter.",
        korean: "탁월한 선택이야! 좋은 친구랑 맛있는 커피를 마시면 하루 전체가 밝아지는 것 같아.",
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
      {
        reply: "Sounds super relaxing! Having comfortable quiet time like this is so important.",
        korean: "정말 힐링된다! 이렇게 편안하고 여유로운 시간을 갖는 게 참 중요한 것 같아.",
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
      {
        reply: "I hear you! Good food always turns any day into a great day.",
        korean: "완전 맞아! 맛있는 음식이 있으면 어떤 날이든 최고의 날이 되지.",
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
      {
        reply: "I love that mindset! Prioritizing your own peace and happiness is true wisdom.",
        korean: "정말 멋진 마인드야! 스스로의 평화와 행복을 우선시하는 게 진짜 지혜지.",
      },
    ],
  };

  const list = presets[normVerb] || presets['figure out'];
  const idx = Math.min(Math.max(0, userTurnCount - 1), list.length - 1);
  return list[idx];
}

// Multi-turn Roleplay Follow-up Chat endpoint
app.post('/api/roleplay/chat', async (req, res) => {
  try {
    const { phrasalVerb, conversation = [] } = req.body;
    const userTurnCount = conversation.filter((m: any) => m.sender === 'user').length;
    const fallback = getDeterministicRoleplayChat(phrasalVerb || '', userTurnCount);

    if (!ai) {
      return res.json(fallback);
    }

    const systemPrompt = `You are 'Toto', a warm, friendly, companion bear (왕관 곰돌이) having an everyday English role-play conversation with a Korean friend.
Rules:
1. Respond naturally to what the friend just said in 1 or 2 friendly, conversational sentences (B1 level English).
2. Ask an engaging follow-up question or make a friendly comment to keep the conversation flowing smoothly.
3. The learner does NOT need to use the target verb in free conversation; just chat like genuine close friends.
4. Provide a natural Korean translation for Toto's line.
5. Return JSON format:
   {"reply": "English sentence(s)", "korean": "자연스러운 한국어 번역"}`;

    const formattedConversation = conversation
      .map((m: any) => `${m.sender === 'toto' ? 'Toto' : 'Friend'}: ${m.text}`)
      .join('\n');

    const userPrompt = `Target topic / verb: "${phrasalVerb}"
Conversation history so far:
${formattedConversation}

Generate Toto's next friendly, conversational reply and follow-up question.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: 0 as any,
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.reply && parsed.korean) {
          return res.json({
            reply: parsed.reply,
            korean: parsed.korean,
          });
        }
      }
    } catch (genErr) {
      console.warn('Gemini roleplay chat fallback used:', genErr);
    }

    return res.json(fallback);
  } catch (err: any) {
    console.error('Roleplay chat API error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Comprehensive End-of-Roleplay Feedback endpoint
app.post('/api/roleplay/feedback', async (req, res) => {
  try {
    const { phrasalVerb = '', targetSentence = '', conversation = [] } = req.body;

    const userMessages = conversation.filter((m: any) => m.sender === 'user');
    const firstUserMsg = userMessages[0]?.text || '';
    const freeUserMsgs = userMessages.slice(1).map((m: any) => m.text);
    const turnsCompleted = userMessages.length;

    // Check target sentence accuracy
    const cleanTarget = targetSentence.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
    const cleanFirst = firstUserMsg.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
    const cleanVerb = phrasalVerb.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();

    const targetNailed = cleanFirst.includes(cleanVerb) || cleanFirst === cleanTarget;

    const fallback = {
      targetFeedback: targetNailed
        ? `Excellent! You used "${phrasalVerb}" accurately in the conversation: "${targetSentence}"`
        : `Nice try! Remember to use the key phrase: "${targetSentence}"`,
      targetFeedbackKorean: targetNailed
        ? `완벽해요! 상황에 맞춰 핵심 구동사 '${phrasalVerb}'을(를) 아주 자연스럽게 사용했습니다 👑`
        : `잘 시도했어요! 핵심 문장 "${targetSentence}"의 뉘앙스를 기억해 보세요 😊`,
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

    if (!ai) {
      return res.json(fallback);
    }

    const systemPrompt = `You are 'Toto', the warm supporter bear. Review the learner's Step 3 role-play practice following Section 7 rules:
1. Praise first! Highlight their natural interaction and courage to converse like a real friend.
2. Evaluate their initial target sentence with the phrasal verb "${phrasalVerb}".
3. Evaluate their free conversation turns (comfort, fluency, engaging flow).
4. No number scores, no harsh criticisms. Keep it warm, motivating, and generative.
5. Return JSON:
   {
     "targetFeedback": "...",
     "targetFeedbackKorean": "...",
     "conversationPraise": "...",
     "conversationPraiseKorean": "...",
     "overallPraise": "...",
     "overallPraiseKorean": "...",
     "turnsCompleted": number
   }`;

    const formattedConversation = conversation
      .map((m: any) => `${m.sender === 'toto' ? 'Toto' : 'Learner'}: ${m.text}`)
      .join('\n');

    const userPrompt = `Key Phrasal Verb: "${phrasalVerb}"
Initial Target Sentence: "${targetSentence}"
Roleplay Conversation Transcript:
${formattedConversation}

Generate warm, comprehensive Section 7 role-play feedback.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: 0 as any,
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        return res.json({
          targetFeedback: parsed.targetFeedback || fallback.targetFeedback,
          targetFeedbackKorean: parsed.targetFeedbackKorean || fallback.targetFeedbackKorean,
          conversationPraise: parsed.conversationPraise || fallback.conversationPraise,
          conversationPraiseKorean: parsed.conversationPraiseKorean || fallback.conversationPraiseKorean,
          overallPraise: parsed.overallPraise || fallback.overallPraise,
          overallPraiseKorean: parsed.overallPraiseKorean || fallback.overallPraiseKorean,
          turnsCompleted,
        });
      }
    } catch (genErr) {
      console.warn('Gemini roleplay feedback fallback used:', genErr);
    }

    return res.json(fallback);
  } catch (err: any) {
    console.error('Roleplay feedback API error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Small Talk Champion server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
