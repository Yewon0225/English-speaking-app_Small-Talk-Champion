import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LearnScreen } from './components/LearnScreen';
import { PracticeScreen } from './components/PracticeScreen';
import { ResultScreen } from './components/ResultScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { PHRASAL_VERBS } from './data/phrasalVerbs';
import { PhrasalVerbItem, TabType, SavedSentence, UserProgress } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('learn');
  const [activeVerbId, setActiveVerbId] = useState<number>(1);
  const [isResultView, setIsResultView] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // User progress state (loaded from / stored in localStorage)
  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem('stc_progress');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      activeVerbId: 1,
      completedVerbIds: [],
      verbStars: {},
      xp: 150,
      streakDays: 3,
      pronunciationScores: {},
    };
  });

  // Saved sentences for Review tab (starts empty for new sessions)
  const [savedSentences, setSavedSentences] = useState<SavedSentence[]>(() => {
    try {
      const saved = localStorage.getItem('stc_saved_sentences');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: SavedSentence) => !s.id?.startsWith('seed-'));
        }
      }
    } catch (_) {}
    return [];
  });

  // Last completed session stats for Result screen
  const [lastSessionStats, setLastSessionStats] = useState<{
    accuracyPct: number;
    xpEarned: number;
  }>({
    accuracyPct: 98,
    xpEarned: 50,
  });

  // Persist progress and saved sentences
  useEffect(() => {
    try {
      localStorage.setItem('stc_progress', JSON.stringify(progress));
    } catch (_) {}
  }, [progress]);

  useEffect(() => {
    try {
      localStorage.setItem('stc_saved_sentences', JSON.stringify(savedSentences));
    } catch (_) {}
  }, [savedSentences]);

  const activeVerb = PHRASAL_VERBS.find((v) => v.id === activeVerbId) || PHRASAL_VERBS[0];

  // Save / Bookmark toggle
  const handleToggleSave = (sentence: Omit<SavedSentence, 'id' | 'savedAt'>) => {
    setSavedSentences((prev) => {
      const exists = prev.some((s) => s.english === sentence.english);
      if (exists) {
        return prev.filter((s) => s.english !== sentence.english);
      } else {
        const newSentence: SavedSentence = {
          ...sentence,
          id: `saved-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          savedAt: Date.now(),
        };
        return [newSentence, ...prev];
      }
    });
  };

  const isSaved = (english: string) => {
    return savedSentences.some((s) => s.english === english);
  };

  const handleRemoveSaved = (english: string) => {
    setSavedSentences((prev) => prev.filter((s) => s.english !== english));
  };

  // Start practice for a verb
  const handleSelectVerb = (verb: PhrasalVerbItem) => {
    setActiveVerbId(verb.id);
    setIsResultView(false);
    setCurrentTab('practice');
  };

  // Complete a session -> show Result screen
  const handleFinishSession = (stats: {
    verbId: number;
    accuracyPct: number;
    attemptCount: number;
    exampleCompleted: boolean;
    dialogueCompleted: boolean;
  }) => {
    const xpReward = 50;
    setLastSessionStats({
      accuracyPct: Math.max(90, stats.accuracyPct),
      xpEarned: xpReward,
    });

    setProgress((prev) => {
      const completed = Array.from(new Set([...prev.completedVerbIds, stats.verbId]));
      const nextActiveId = stats.verbId < PHRASAL_VERBS.length ? stats.verbId + 1 : stats.verbId;

      return {
        ...prev,
        completedVerbIds: completed,
        activeVerbId: nextActiveId,
        xp: prev.xp + xpReward,
        verbStars: {
          ...prev.verbStars,
          [stats.verbId]: 3, // ⭐⭐⭐ Reward completion
        },
        pronunciationScores: {
          ...prev.pronunciationScores,
          [stats.verbId]: stats.accuracyPct,
        },
      };
    });

    setIsResultView(true);
  };

  // Next unit from Result screen
  const handleNextUnit = () => {
    const nextId = activeVerbId < PHRASAL_VERBS.length ? activeVerbId + 1 : 1;
    setActiveVerbId(nextId);
    setIsResultView(false);
    setCurrentTab('practice');
  };

  const handleRestart = () => {
    setIsResultView(false);
    setCurrentTab('practice');
  };

  const handleHome = () => {
    setIsResultView(false);
    setCurrentTab('learn');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 flex justify-center">
      {/* Smartphone Responsive Viewport Container (as specified in PRD Section 3 & 4) */}
      <div className="w-full max-w-md min-h-screen bg-[#FDFBF7] flex flex-col relative shadow-xl shadow-amber-900/5">
        {/* Top Navigation Bar */}
        <Header
          currentTab={currentTab}
          screenTitle={isResultView ? 'Session Result' : undefined}
          showBack={isResultView || (currentTab === 'practice' && !isResultView)}
          onBack={() => {
            if (isResultView) {
              setIsResultView(false);
              setCurrentTab('learn');
            } else if (currentTab === 'practice') {
              setCurrentTab('learn');
            }
          }}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
        />

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-3">
          {isResultView ? (
            <ResultScreen
              verbItem={activeVerb}
              accuracyPct={lastSessionStats.accuracyPct}
              xpEarned={lastSessionStats.xpEarned}
              onHome={handleHome}
              onRestart={handleRestart}
              onNextUnit={handleNextUnit}
              onToggleSave={handleToggleSave}
              isSaved={isSaved}
              soundEnabled={soundEnabled}
            />
          ) : currentTab === 'learn' ? (
            <LearnScreen
              phrasalVerbs={PHRASAL_VERBS}
              progress={progress}
              onSelectVerb={handleSelectVerb}
              onStartPractice={() => {
                setIsResultView(false);
                setCurrentTab('practice');
              }}
              onGoToReview={() => setCurrentTab('review')}
              soundEnabled={soundEnabled}
            />
          ) : currentTab === 'practice' ? (
            <PracticeScreen
              verbItem={activeVerb}
              unitNumber={activeVerb.id}
              totalUnits={PHRASAL_VERBS.length}
              onFinishSession={handleFinishSession}
              onBack={() => setCurrentTab('learn')}
              onToggleSave={handleToggleSave}
              isSaved={isSaved}
              soundEnabled={soundEnabled}
            />
          ) : currentTab === 'review' ? (
            <ReviewScreen
              savedSentences={savedSentences}
              phrasalVerbs={PHRASAL_VERBS}
              onRemoveSaved={handleRemoveSaved}
              onPracticeVerb={(verbId) => {
                setActiveVerbId(verbId);
                setIsResultView(false);
                setCurrentTab('practice');
              }}
              soundEnabled={soundEnabled}
            />
          ) : (
            <ProgressScreen
              progress={progress}
              phrasalVerbs={PHRASAL_VERBS}
              onStartVerb={handleSelectVerb}
            />
          )}
        </main>

        {/* Bottom Navigation Tab Bar (Hidden during result view if preferred, or always available) */}
        {!isResultView && (
          <BottomNav
            activeTab={currentTab}
            onChangeTab={(tab) => {
              setIsResultView(false);
              setCurrentTab(tab);
            }}
            savedCount={savedSentences.length}
          />
        )}
      </div>
    </div>
  );
}
