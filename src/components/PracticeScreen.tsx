import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Bookmark,
  BookmarkCheck,
  Mic,
  MicOff,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { TotoAvatar } from './TotoAvatar';
import { PhrasalVerbItem, FeedbackResult, SavedSentence } from '../types';
import { speakText, stopSpeaking, compareWords, getSpeakingFeedback, checkSpeechSupport } from '../utils/speech';

interface PracticeScreenProps {
  verbItem: PhrasalVerbItem;
  unitNumber: number;
  totalUnits: number;
  onFinishSession: (stats: {
    verbId: number;
    accuracyPct: number;
    attemptCount: number;
    exampleCompleted: boolean;
    dialogueCompleted: boolean;
  }) => void;
  onBack: () => void;
  onToggleSave: (sentence: Omit<SavedSentence, 'id' | 'savedAt'>) => void;
  isSaved: (english: string) => boolean;
  soundEnabled: boolean;
}

type PracticeStage = 'target_verb' | 'example_practice' | 'roleplay';

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
  verbItem,
  unitNumber,
  totalUnits,
  onFinishSession,
  onBack,
  onToggleSave,
  isSaved,
  soundEnabled,
}) => {
  // 3-step operation order: target_verb -> example_practice -> roleplay
  const [stage, setStage] = useState<PracticeStage>('target_verb');

  // Playback speed toggle state: 0.9x (normal) vs 0.7x (slow)
  const [playbackSpeed, setPlaybackSpeed] = useState<0.9 | 0.7>(0.9);

  // Audio & Mic states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [micState, setMicState] = useState<'ready' | 'listening' | 'evaluating' | 'done'>('ready');
  const [transcript, setTranscript] = useState('');
  const [attemptCount, setAttemptCount] = useState(1);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [showExampleKorean, setShowExampleKorean] = useState<boolean>(false);
  const [showTotoKorean, setShowTotoKorean] = useState<boolean>(false);
  const [showRoleplayKorean, setShowRoleplayKorean] = useState<boolean>(false);

  // Speech Recognition ref & silence timer
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const currentSpokenRef = useRef('');
  const transcriptRef = useRef('');

  // Determine active sentence to practice depending on current stage
  const currentSentence =
    stage === 'target_verb'
      ? verbItem.verb
      : stage === 'example_practice'
      ? verbItem.exampleSentence.english
      : verbItem.dialogue.studentTargetSentence;

  const currentKorean =
    stage === 'target_verb'
      ? verbItem.koreanMeaning
      : stage === 'example_practice'
      ? verbItem.exampleSentence.korean
      : verbItem.dialogue.studentKorean;

  const isCurrentSentenceSaved = isSaved(currentSentence);

  // Handle stage change or unit change
  useEffect(() => {
    isListeningRef.current = false;
    currentSpokenRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    setFeedback(null);
    setAttemptCount(1);
    setMicState('ready');
    setShowExampleKorean(false);
    setShowTotoKorean(false);
    setShowRoleplayKorean(false);

    checkSpeechSupport();

    if (soundEnabled) {
      if (stage === 'target_verb') {
        // Read target phrasal verb once
        setIsPlayingAudio(true);
        speakText(
          verbItem.verb,
          0.9,
          () => setIsPlayingAudio(true),
          () => setIsPlayingAudio(false)
        );
      } else if (stage === 'example_practice') {
        // Read example sentence once
        setIsPlayingAudio(true);
        speakText(
          verbItem.exampleSentence.english,
          0.9,
          () => setIsPlayingAudio(true),
          () => setIsPlayingAudio(false)
        );
      } else if (stage === 'roleplay' && verbItem.dialogue.partnerPrompt) {
        // Partner Toto speaks prompt first
        setIsPlayingAudio(true);
        speakText(
          verbItem.dialogue.partnerPrompt,
          0.9,
          () => setIsPlayingAudio(true),
          () => setIsPlayingAudio(false)
        );
      }
    }

    return () => {
      stopSpeaking();
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [stage, verbItem]);

  // Audio Playback
  const handlePlayAudio = (text: string, rate?: number) => {
    if (isPlayingAudio) return;
    if (micState === 'listening') {
      stopListening();
    }
    const currentRate = rate ?? playbackSpeed;
    setIsPlayingAudio(true);
    speakText(
      text,
      currentRate,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  // Toggle speed between 0.9x and 0.7x and optionally play
  const handleToggleSpeed = (speed: 0.9 | 0.7, textToPlay?: string) => {
    setPlaybackSpeed(speed);
    if (textToPlay) {
      if (micState === 'listening') {
        stopListening();
      }
      setIsPlayingAudio(true);
      speakText(
        textToPlay,
        speed,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false)
      );
    }
  };

  // Evaluate speech transcript
  const handleEvaluate = async (spokenText: string) => {
    setMicState('evaluating');
    const result = await getSpeakingFeedback({
      phrasalVerb: verbItem.verb,
      targetSentence: currentSentence,
      userTranscript: spokenText,
      attemptNumber: attemptCount,
    });

    setFeedback(result);
    setMicState('done');

    if (soundEnabled && result.feedbackText) {
      speakText(result.feedbackText, 0.95);
    }
  };

  // Mic speech recognition
  const startListening = () => {
    if (isPlayingAudio) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const fallbackPrompt = window.prompt(
        'Please type what you say to practice:',
        currentSentence
      );
      if (fallbackPrompt !== null) {
        setTranscript(fallbackPrompt);
        handleEvaluate(fallbackPrompt);
      }
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      isListeningRef.current = true;
      currentSpokenRef.current = '';
      transcriptRef.current = '';

      recognition.onstart = () => {
        isListeningRef.current = true;
        setMicState('listening');
        setTranscript('');
        setFeedback(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const fullText = (final || interim).trim();
        if (fullText) {
          currentSpokenRef.current = fullText;
          transcriptRef.current = fullText;
          setTranscript(fullText);

          // 1.8s silence auto-finish
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopListening();
          }, 1800);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e.error);
        if (isListeningRef.current) {
          stopListening();
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          stopListening();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      isListeningRef.current = false;
      setMicState('ready');
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (!isListeningRef.current) return;
    isListeningRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    const spoken = currentSpokenRef.current || transcriptRef.current;
    handleEvaluate(spoken);
  };

  const handleMicClick = () => {
    if (isPlayingAudio) return;

    if (micState === 'listening' || isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTryAgain = () => {
    setAttemptCount((prev) => prev + 1);
    currentSpokenRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    setFeedback(null);
    setMicState('ready');
  };

  // Section 7 Toto Feedback Card Component
  const renderTotoFeedback = (xpReward: number) => {
    if (!feedback) return null;

    const isSuccess = feedback.status === 'success';
    const isNearSuccess = feedback.status === 'near_success';
    const isRecast = feedback.status === 'recast';
    const isElicitation = feedback.status === 'elicitation';

    const cardTheme = isSuccess
      ? 'bg-emerald-50/80 border-emerald-200'
      : isNearSuccess
      ? 'bg-amber-50/80 border-amber-200'
      : isRecast
      ? 'bg-sky-50/80 border-sky-200'
      : isElicitation
      ? 'bg-indigo-50/80 border-indigo-200'
      : 'bg-slate-50 border-slate-200';

    const badgeTitle = isSuccess
      ? 'Small Talk Champion! 👑'
      : isNearSuccess
      ? 'Great Effort! 👍'
      : isRecast
      ? "Toto's Warm Recast 🐻"
      : isElicitation
      ? "Toto's First-Letter Hint 💡"
      : 'Sound Check 🎙️';

    const badgeSub = isSuccess
      ? 'Perfect pronunciation & natural usage'
      : isNearSuccess
      ? 'Understood clearly! One gentle tweak'
      : isRecast
      ? 'Recast modeled for conversation'
      : isElicitation
      ? 'Think of the first letter clue'
      : "Couldn't hear clearly. Try again!";

    return (
      <div className={`${cardTheme} border rounded-3xl p-4 shadow-2xs space-y-3 animate-in fade-in duration-200`}>
        {/* Header with Toto Avatar & Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TotoAvatar
              size="sm"
              iconBadge={isSuccess ? '👑' : isNearSuccess ? '⭐' : isRecast ? '💬' : isElicitation ? '💡' : '👂'}
              isSpeaking={isPlayingAudio}
            />
            <div>
              <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <span>{badgeTitle}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">{badgeSub}</div>
            </div>
          </div>

          {(isSuccess || isNearSuccess) && (
            <div className="bg-amber-500 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
              +{xpReward} XP
            </div>
          )}
        </div>

        {/* User Spoken Transcript display */}
        {transcript && (
          <div className="bg-white/90 rounded-2xl px-3 py-2 border border-slate-200/70 flex items-center gap-2 text-xs">
            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] shrink-0">You said:</span>
            <span className="font-bold text-slate-800 truncate">“{transcript}”</span>
          </div>
        )}

        {/* Toto's Section 7 Feedback Bubble */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-extrabold text-slate-900 leading-snug">
              “{feedback.feedbackText}”
            </p>
            <button
              type="button"
              onClick={() => handlePlayAudio(feedback.feedbackText, 0.95)}
              disabled={isPlayingAudio}
              className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Listen to Toto's feedback"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {feedback.koreanNote && (
            <p className="text-[11px] font-semibold text-slate-600 leading-snug">
              ({feedback.koreanNote})
            </p>
          )}
        </div>

        {/* Quick Action Buttons inside feedback */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleTryAgain}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Try Again</span>
          </button>
          <button
            type="button"
            onClick={() => handlePlayAudio(currentSentence, 0.85)}
            disabled={isPlayingAudio}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Volume2 className="w-3 h-3 text-slate-500" />
            <span>Target Audio</span>
          </button>
        </div>
      </div>
    );
  };

  // Navigation handlers across the 3 stages
  const handleStageBack = () => {
    if (stage === 'roleplay') {
      setStage('example_practice');
    } else if (stage === 'example_practice') {
      setStage('target_verb');
    } else {
      onBack();
    }
  };

  const handleStageNext = () => {
    if (stage === 'target_verb') {
      setStage('example_practice');
    } else if (stage === 'example_practice') {
      setStage('roleplay');
    } else {
      // Roleplay finished -> Complete session and show ResultScreen
      const { accuracyPct } = compareWords(currentSentence, transcript || currentSentence);
      onFinishSession({
        verbId: verbItem.id,
        accuracyPct: accuracyPct > 0 ? accuracyPct : 98,
        attemptCount,
        exampleCompleted: true,
        dialogueCompleted: true,
      });
    }
  };

  // Highlight key phrasal verb helper
  const renderSentenceWithHighlight = (sentence: string, targetPhrase: string) => {
    const regex = new RegExp(`(${targetPhrase})`, 'gi');
    const parts = sentence.split(regex);

    return (
      <span>
        “
        {parts.map((part, i) =>
          part.toLowerCase() === targetPhrase.toLowerCase() ? (
            <span
              key={i}
              className="bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-md mx-0.5 shadow-2xs"
            >
              {part}
            </span>
          ) : (
            part
          )
        )}
        ”
      </span>
    );
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* ========================================================
          STAGE 1: TARGET PHRASAL VERB
      ======================================================== */}
      {stage === 'target_verb' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Target Phrasal Verb Hero Card */}
          <div className="bg-white rounded-3xl border border-amber-200/90 p-5 shadow-2xs relative overflow-hidden space-y-3">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-amber-100/40 pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-widest bg-amber-100 px-2.5 py-0.5 rounded-full">
                Step 1 · Target Phrasal Verb
              </span>

              {/* Pronunciation audio controls */}
              <div className="flex items-center rounded-full bg-slate-100 p-0.5 border border-slate-200/70 shadow-2xs">
                <button
                  onClick={() => handleToggleSpeed(0.9, verbItem.verb)}
                  disabled={isPlayingAudio}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    playbackSpeed === 0.9
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  <span>0.9x</span>
                </button>
                <button
                  onClick={() => handleToggleSpeed(0.7, verbItem.verb)}
                  disabled={isPlayingAudio}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-0.5 cursor-pointer ${
                    playbackSpeed === 0.7
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>0.7x 🐢</span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {verbItem.verb}
              </h2>
              <p className="text-sm font-bold text-amber-800 mt-1.5 leading-snug">
                {verbItem.koreanMeaning}
              </p>
            </div>
          </div>

          {/* Important Context & Meaning Card (div:nth-of-type(3)) */}
          <div className="bg-amber-50/80 rounded-2xl border border-amber-200/90 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1.5 tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>핵심 맥락 & 뉘앙스 ({verbItem.contextShort})</span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200/80">
                {verbItem.cefrLevel}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                {verbItem.nuanceExplanation}
              </p>

              <div className="bg-white/85 rounded-xl p-2.5 border border-amber-200/60 flex items-start gap-2">
                <span className="text-amber-600 text-xs shrink-0 mt-0.5">💡</span>
                <p className="text-[11px] text-slate-600 leading-snug">
                  <strong className="text-slate-800 font-bold">대화 속 활용 팁: </strong>
                  {verbItem.usageTip}
                </p>
              </div>
            </div>
          </div>

          {/* Toto's Feedback Card (when evaluated) */}
          {renderTotoFeedback(10)}

          {/* Speech transcription feedback */}
          {micState === 'listening' && (
            <div className="bg-white rounded-2xl border border-rose-200 p-3 shadow-2xs text-xs text-rose-700 font-semibold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="truncate">{transcript ? `“${transcript}”` : `Listening... Say "${verbItem.verb}".`}</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="text-[11px] bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                완료
              </button>
            </div>
          )}

          {/* Big Mic Button */}
          <div className="flex flex-col items-center justify-center py-2">
            <button
              onClick={handleMicClick}
              disabled={isPlayingAudio}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
                isPlayingAudio
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                  : micState === 'listening'
                  ? 'bg-rose-600 text-white ring-8 ring-rose-200 animate-pulse scale-105'
                  : micState === 'evaluating'
                  ? 'bg-amber-500 text-white ring-4 ring-amber-100 scale-95'
                  : 'bg-slate-900 hover:bg-slate-800 text-white hover:scale-105 active:scale-95'
              }`}
              aria-label="Tap to speak"
            >
              {micState === 'listening' ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              {micState === 'listening' && (
                <span className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping opacity-40" />
              )}
            </button>
            <div className="mt-2 text-center">
              <span className="text-xs font-medium text-slate-400">
                {micState === 'listening' ? 'Listening... Tap again or wait when done' : micState === 'evaluating' ? 'Checking pronunciation...' : 'Tap to speak'}
              </span>
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className={`grid ${feedback ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 pt-1`}>
            <button
              onClick={onBack}
              className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Pathway</span>
            </button>

            {feedback && (
              <button
                onClick={handleTryAgain}
                className="py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            )}

            <button
              onClick={handleStageNext}
              className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span>Practice Example</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE 2: EXAMPLE SENTENCE PRACTICE
      ======================================================== */}
      {stage === 'example_practice' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                {unitNumber}
              </div>
              <span className="font-extrabold text-xs text-slate-800 tracking-tight">
                EXAMPLE PRACTICE
              </span>
              <span className="text-slate-400 font-bold">·</span>
              <span className="bg-amber-100/80 text-amber-900 font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-amber-200/60">
                Step 2 of 3
              </span>
            </div>

            {/* Save Bookmark button */}
            <button
              onClick={() =>
                onToggleSave({
                  verbId: verbItem.id,
                  verb: verbItem.verb,
                  type: 'example',
                  english: verbItem.exampleSentence.english,
                  korean: verbItem.exampleSentence.korean,
                })
              }
              className="p-1.5 rounded-lg text-amber-800 hover:bg-amber-100/70 transition-colors shrink-0 cursor-pointer"
              title={isSaved(verbItem.exampleSentence.english) ? 'Saved' : 'Save'}
            >
              {isSaved(verbItem.exampleSentence.english) ? (
                <BookmarkCheck className="w-4 h-4 fill-amber-600 text-amber-700" />
              ) : (
                <Bookmark className="w-4 h-4 text-amber-800" />
              )}
            </button>
          </div>

          {/* Key Phrasal Verb Ribbon */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl px-3.5 py-2 flex items-center justify-between shadow-2xs">
            <div className="truncate">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                KEY PHRASAL VERB
              </span>
              <span className="text-xs font-bold text-amber-900">
                {verbItem.verb} <span className="font-medium text-amber-800/80">({verbItem.koreanMeaning})</span>
              </span>
            </div>
          </div>

          {/* Example Sentence Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  Example Sentence
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePlayAudio(verbItem.exampleSentence.english)}
                  disabled={isPlayingAudio}
                  className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Listen"
                  aria-label="Listen"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2">
              <div className="text-base font-bold text-slate-900 leading-relaxed">
                {renderSentenceWithHighlight(verbItem.exampleSentence.english, verbItem.verb)}
              </div>

              {/* Korean translation: selectable to show or hide */}
              {showExampleKorean ? (
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60 animate-in fade-in duration-150">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {verbItem.exampleSentence.korean}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowExampleKorean(false)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-200/50 transition-colors"
                  >
                    가리기
                  </button>
                </div>
              ) : (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowExampleKorean(true)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-amber-50/90 hover:bg-amber-100/90 border border-amber-200/70 transition-all cursor-pointer group active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span>한국어 뜻 보기</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-0.5">
              <span className="text-blue-500 text-sm">🗣️</span>
              <span>Read naturally into the mic. No rush!</span>
            </div>
          </div>

          {/* Toto's Feedback Card (when evaluated) */}
          {renderTotoFeedback(20)}

          {/* Speech transcription feedback */}
          {micState === 'listening' && (
            <div className="bg-white rounded-2xl border border-rose-200 p-3 shadow-2xs text-xs text-rose-700 font-semibold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="truncate">{transcript ? `“${transcript}”` : 'Listening... Speak the example sentence.'}</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="text-[11px] bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                완료
              </button>
            </div>
          )}

          {/* Big Mic Button */}
          <div className="flex flex-col items-center justify-center py-2">
            <button
              onClick={handleMicClick}
              disabled={isPlayingAudio}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
                isPlayingAudio
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                  : micState === 'listening'
                  ? 'bg-rose-600 text-white ring-8 ring-rose-200 animate-pulse scale-105'
                  : micState === 'evaluating'
                  ? 'bg-amber-500 text-white ring-4 ring-amber-100 scale-95'
                  : 'bg-slate-900 hover:bg-slate-800 text-white hover:scale-105 active:scale-95'
              }`}
              aria-label="Tap to speak"
            >
              {micState === 'listening' ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              {micState === 'listening' && (
                <span className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping opacity-40" />
              )}
            </button>
            <div className="mt-2 text-center">
              <span className="text-xs font-medium text-slate-400">
                {micState === 'listening' ? 'Listening... Tap again or wait when done' : micState === 'evaluating' ? 'Checking pronunciation...' : 'Tap to speak'}
              </span>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={handleStageBack}
              className="col-span-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              onClick={handleTryAgain}
              className="col-span-1 py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>

            <button
              onClick={handleStageNext}
              className="col-span-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span>Role-play</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE 3: ROLE-PLAY
      ======================================================== */}
      {stage === 'roleplay' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Partner Toto Dialogue Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TotoAvatar
                  size="md"
                  iconBadge={verbItem.buddyBadgeIcon || '☕'}
                  isSpeaking={isPlayingAudio}
                />
                <div>
                  <div className="font-extrabold text-slate-900 text-sm">Toto</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePlayAudio(verbItem.dialogue.partnerPrompt, playbackSpeed)}
                  disabled={isPlayingAudio}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/60 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Listen</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-base font-bold text-slate-900 leading-snug">
                “{verbItem.dialogue.partnerPrompt}”
              </p>

              {/* Toto Korean translation: selectable to show or hide */}
              {showTotoKorean ? (
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-100 animate-in fade-in duration-150">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {verbItem.dialogue.partnerKorean}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTotoKorean(false)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors"
                  >
                    가리기
                  </button>
                </div>
              ) : (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowTotoKorean(true)}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-blue-50/90 hover:bg-blue-100/90 border border-blue-200/70 transition-all cursor-pointer group active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span>한국어 뜻 보기</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Your Turn to Speak Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  Your Turn to Speak
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePlayAudio(verbItem.dialogue.studentTargetSentence)}
                  disabled={isPlayingAudio}
                  className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Listen"
                  aria-label="Listen"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {/* Save Bookmark button */}
                <button
                  type="button"
                  onClick={() =>
                    onToggleSave({
                      verbId: verbItem.id,
                      verb: verbItem.verb,
                      type: 'dialogue',
                      english: verbItem.dialogue.studentTargetSentence,
                      korean: verbItem.dialogue.studentKorean,
                    })
                  }
                  className="p-1.5 rounded-lg text-amber-800 hover:bg-amber-100/70 transition-colors shrink-0 cursor-pointer"
                  title={isSaved(verbItem.dialogue.studentTargetSentence) ? 'Saved' : 'Save'}
                >
                  {isSaved(verbItem.dialogue.studentTargetSentence) ? (
                    <BookmarkCheck className="w-4 h-4 fill-amber-600 text-amber-700" />
                  ) : (
                    <Bookmark className="w-4 h-4 text-amber-800" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2">
              <div className="text-base font-bold text-slate-900 leading-relaxed">
                {renderSentenceWithHighlight(verbItem.dialogue.studentTargetSentence, verbItem.verb)}
              </div>

              {/* Student Korean translation: selectable to show or hide */}
              {showRoleplayKorean ? (
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60 animate-in fade-in duration-150">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {verbItem.dialogue.studentKorean}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRoleplayKorean(false)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-200/50 transition-colors"
                  >
                    가리기
                  </button>
                </div>
              ) : (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowRoleplayKorean(true)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-amber-50/90 hover:bg-amber-100/90 border border-amber-200/70 transition-all cursor-pointer group active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span>한국어 뜻 보기</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Toto's Feedback Card (when evaluated) */}
          {renderTotoFeedback(30)}

          {/* Speech transcription feedback */}
          {micState === 'listening' && (
            <div className="bg-white rounded-2xl border border-rose-200 p-3 shadow-2xs text-xs text-rose-700 font-semibold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="truncate">{transcript ? `“${transcript}”` : 'Listening... Speak your role-play response.'}</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="text-[11px] bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                완료
              </button>
            </div>
          )}

          {/* Big Round Mic Button */}
          <div className="flex flex-col items-center justify-center py-2">
            <button
              onClick={handleMicClick}
              disabled={isPlayingAudio}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
                isPlayingAudio
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                  : micState === 'listening'
                  ? 'bg-rose-600 text-white ring-8 ring-rose-200 animate-pulse scale-105'
                  : micState === 'evaluating'
                  ? 'bg-amber-500 text-white ring-4 ring-amber-100 scale-95'
                  : 'bg-slate-900 hover:bg-slate-800 text-white hover:scale-105 active:scale-95'
              }`}
              aria-label="Tap to speak"
            >
              {micState === 'listening' ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              {micState === 'listening' && (
                <span className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping opacity-40" />
              )}
            </button>
            <div className="mt-2 text-center">
              <span className="text-xs font-medium text-slate-400">
                {micState === 'listening' ? 'Listening... Tap again or wait when done' : micState === 'evaluating' ? 'Checking pronunciation...' : 'Tap to speak'}
              </span>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={handleStageBack}
              className="col-span-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              onClick={handleTryAgain}
              className="col-span-1 py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>

            <button
              onClick={handleStageNext}
              className="col-span-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span>Finish</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
