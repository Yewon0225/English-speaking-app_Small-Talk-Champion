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
