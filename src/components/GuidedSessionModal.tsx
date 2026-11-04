import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  Smile, 
  HandHeart, 
  Flame,
  Layers,
  History,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ACTSStage, ACTS_STAGES, PrayerCard } from '../types/prayer';
import { ActiveSessionItem } from '../services/scheduler';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TimerBar } from './TimerBar';

interface GuidedSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionPlan: Record<ACTSStage, ActiveSessionItem[]>;
  initialMinutes: number;
  autoStartTimer: boolean;
  soundEnabled: boolean;
  onTopicPrayed: (categoryName: string, subjectName: string, cards: PrayerCard[]) => void;
}

const STAGE_THEMES: Record<ACTSStage, {
  color: string;
  badgeBg: string;
  badgeBorder: string;
  accent: string;
  icon: React.ReactNode;
  prompt: string;
  subLabel: string;
}> = {
  Adoration: {
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950/40',
    badgeBorder: 'border-amber-600/30',
    accent: 'bg-amber-500',
    icon: <Flame className="w-4 h-4 text-amber-400" />,
    prompt: 'Praising God for this attribute. All scripture verses for this attribute are shown below.',
    subLabel: 'Attribute'
  },
  Confession: {
    color: 'text-rose-400',
    badgeBg: 'bg-rose-950/40',
    badgeBorder: 'border-rose-600/30',
    accent: 'bg-rose-500',
    icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
    prompt: 'Humbly confessing and receiving forgiveness on this focus area.',
    subLabel: 'Focus'
  },
  Thanksgiving: {
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/40',
    badgeBorder: 'border-emerald-600/30',
    accent: 'bg-emerald-500',
    icon: <Smile className="w-4 h-4 text-emerald-400" />,
    prompt: 'Expressing gratitude for this thanksgiving topic today.',
    subLabel: 'Praise'
  },
  Supplication: {
    color: 'text-sky-400',
    badgeBg: 'bg-sky-950/40',
    badgeBorder: 'border-sky-600/30',
    accent: 'bg-sky-500',
    icon: <HandHeart className="w-4 h-4 text-sky-400" />,
    prompt: 'Interceding through your designated rotation of topics for today.',
    subLabel: 'Topic'
  }
};

export const GuidedSessionModal: React.FC<GuidedSessionModalProps> = ({
  isOpen,
  onClose,
  sessionPlan,
  initialMinutes,
  autoStartTimer,
  soundEnabled,
  onTopicPrayed
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [currentTopicIndex, setCurrentTopicIndex] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [activePlan, setActivePlan] = useState<Record<ACTSStage, ActiveSessionItem[]>>(sessionPlan);

  // Lock background body scroll to eliminate outer page scrollbars
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Requirement: Every new prayer session restarts at Adoration with a fixed, stable plan for that run
  useEffect(() => {
    if (isOpen) {
      setActivePlan(sessionPlan);
      setCurrentStageIndex(0);
      setCurrentTopicIndex(0);
      setCompleted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStage: ACTSStage = ACTS_STAGES[currentStageIndex];
  const stageTopics = activePlan[currentStage] || [];
  const activeItem = stageTopics[currentTopicIndex];
  const theme = STAGE_THEMES[currentStage];

  const handleNext = () => {
    if (activeItem) {
      onTopicPrayed(activeItem.categoryName, activeItem.subject.name, activeItem.cards);
    }

    if (currentTopicIndex + 1 < stageTopics.length) {
      setCurrentTopicIndex(currentTopicIndex + 1);
    } else {
      // Advance to next ACTS stage
      if (currentStageIndex + 1 < ACTS_STAGES.length) {
        setCurrentStageIndex(currentStageIndex + 1);
        setCurrentTopicIndex(0);
      } else {
        setCompleted(true);
      }
    }
  };

  const handlePrevious = () => {
    if (currentTopicIndex > 0) {
      setCurrentTopicIndex(currentTopicIndex - 1);
    } else if (currentStageIndex > 0) {
      const prevStage = ACTS_STAGES[currentStageIndex - 1];
      const prevTopics = activePlan[prevStage] || [];
      setCurrentStageIndex(currentStageIndex - 1);
      setCurrentTopicIndex(Math.max(0, prevTopics.length - 1));
    }
  };

  const groupSessionCards = (cards: PrayerCard[], allSubjectCards: PrayerCard[]) => {
    const groups: Record<string, { rootTitle?: string; cards: PrayerCard[] }> = {};
    const groupOrder: string[] = [];

    cards.forEach((card, idx) => {
      const key = card.stackGroup || card.threadId || `card-${card.createdDate}-${idx}`;
      if (!groups[key]) {
        groups[key] = { cards: [] };
        groupOrder.push(key);

        const threadAll = (allSubjectCards || []).filter(c => (c.stackGroup || c.threadId) === key);
        if (threadAll.length > 1) {
          const sorted = [...threadAll].sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());
          groups[key].rootTitle = sorted[0].text;
        }
      }
      groups[key].cards.push(card);
    });

    return groupOrder.map(key => ({
      groupId: key,
      rootTitle: groups[key].rootTitle,
      cards: groups[key].cards
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100 select-none overflow-hidden h-screen w-screen animate-fadeIn">
      {/* Top Bar with Floating Timer & Close - Fixed Height, Never Scrolls */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md">
        {/* Stage Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {ACTS_STAGES.map((stg, idx) => {
            const isCurrent = idx === currentStageIndex;
            const isPast = idx < currentStageIndex;
            const stgTheme = STAGE_THEMES[stg];
            const topicCount = (activePlan[stg] || []).length;

            return (
              <div
                key={stg}
                onClick={() => {
                  setCurrentStageIndex(idx);
                  setCurrentTopicIndex(0);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                  isCurrent
                    ? `${stgTheme.badgeBg} ${stgTheme.color} border ${stgTheme.badgeBorder} ring-1 ring-white/10 font-semibold`
                    : isPast
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-neutral-600 hover:text-neutral-400'
                }`}
              >
                {isPast ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : null}
                <span>{stg}</span>
                {stg === 'Supplication' && (
                  <span className="font-mono text-[10px] opacity-75">
                    ({topicCount})
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Non-intrusive Floating Timer Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <TimerBar
            initialMinutes={initialMinutes}
            autoStart={autoStartTimer}
            soundEnabled={soundEnabled}
          />

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Exit Session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area - Anchored flex-1 with NO outer scrollbar */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-between px-4 sm:px-6 py-2.5 max-w-3xl mx-auto w-full overflow-hidden">
        {completed ? (
          <div className="text-center space-y-4 animate-fadeIn my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Sparkles className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-300">Amen!</h2>
              <p className="text-neutral-400 max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
                You have completed your ACTS prayer journey today. All topics prayed have been saved and will rotate to the next scheduled topics in your next session.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs sm:text-sm font-medium transition-all"
            >
              Return to Overview
            </button>
          </div>
        ) : stageTopics.length === 0 ? (
          <div className="text-center space-y-3 my-auto">
            <div className="p-3 bg-neutral-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-neutral-500">
              {theme.icon}
            </div>
            <h3 className="text-lg font-semibold text-neutral-300">No topics scheduled for {currentStage}</h3>
            <p className="text-neutral-500 text-xs max-w-sm mx-auto">
              You can advance to the next step or add cards from the main dashboard.
            </p>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium inline-flex items-center gap-1.5"
            >
              Next Stage <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="w-full flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            {/* Stage Guidance Header - Always Anchored & Fully Visible at the Top */}
            <div className="shrink-0 text-center space-y-1 mb-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-neutral-900 border border-neutral-800">
                {theme.icon}
                <span className={theme.color}>{currentStage}</span>
                {currentStage === 'Supplication' && (
                  <span className="text-neutral-500 font-mono">
                    {currentTopicIndex + 1} of {stageTopics.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400 max-w-lg mx-auto italic truncate">
                {theme.prompt}
              </p>
            </div>

            {/* Prayer Topic Container - Scaled ~20% More Compact */}
            <div className="flex-1 min-h-0 w-full flex flex-col bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden relative backdrop-blur-sm p-4 sm:p-5">
              <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accent}`} />

              {/* Subject & Sub-Label Header - Compact Header Bar */}
              <div className="shrink-0 flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    {theme.subLabel}:
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-100">
                    {activeItem.subject.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeItem.cards.length > 0 ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                      {activeItem.cards.length} {currentStage === 'Adoration' 
                        ? (activeItem.cards.length === 1 ? 'verse' : 'verses')
                        : (activeItem.cards.length === 1 ? 'card' : 'cards')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700/60">
                      Focus Topic
                    </span>
                  )}
                  {activeItem.priority === 'high' && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                      <ArrowUp className="w-2.5 h-2.5" /> High
                    </span>
                  )}
                  {activeItem.priority === 'low' && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1">
                      <ArrowDown className="w-2.5 h-2.5" /> Low
                    </span>
                  )}
                </div>
              </div>

              {/* THE SINGLE SCROLLBAR FOR THE ENTIRE PAGE: Smoothly Scrolls Verses if they exceed view */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 space-y-2.5">
                {activeItem.cards.length === 0 ? (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 space-y-3.5 my-auto">
                    <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl text-neutral-400 shadow-sm">
                      {theme.icon}
                    </div>
                    <div className="space-y-1.5 max-w-md">
                      <h4 className="text-base sm:text-lg font-semibold text-neutral-100 font-serif">
                        {currentStage === 'Thanksgiving' ? `Give thanks for ${activeItem.subject.name}` : `Pray for ${activeItem.subject.name}`}
                      </h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {currentStage === 'Thanksgiving'
                          ? `Take a dedicated moment to express gratitude and praise God for ${activeItem.subject.name}.`
                          : `Spend time bringing your personal requests and prayers for ${activeItem.subject.name} before the Lord.`}
                      </p>
                    </div>
                  </div>
                ) : (
                  groupSessionCards(activeItem.cards, activeItem.subject?.cards || []).map((group) => {
                    if (group.rootTitle && group.cards.length > 0) {
                      return (
                        <div
                          key={group.groupId}
                          className="p-3.5 sm:p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 shadow-sm space-y-2.5 transition-colors hover:border-neutral-700/80"
                        >
                          {/* Root Topic/Person Header on Top */}
                          <div className="pb-2 border-b border-neutral-800/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-sky-400">
                                {group.rootTitle}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                {group.cards.length} {group.cards.length === 1 ? 'active update' : 'active updates'}
                              </span>
                            </div>
                          </div>

                          {/* Active Updates under this Topic/Person - Never crossed out */}
                          <div className="space-y-2">
                            {group.cards.map((card, cIdx) => (
                              <div
                                key={card.createdDate + cIdx}
                                className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/70 space-y-1"
                              >
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  Update #{cIdx + 1} • {new Date(card.createdDate).toLocaleDateString()}
                                </div>
                                <div className="text-sm sm:text-base font-serif text-neutral-100 leading-relaxed font-medium">
                                  <MarkdownRenderer content={card.text} isMarkdown={card.isMarkdown} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // Standalone card(s)
                    return group.cards.map((card, cIdx) => (
                      <div
                        key={card.createdDate + cIdx}
                        className="p-3.5 sm:p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 shadow-sm space-y-2 transition-colors hover:border-neutral-700/80"
                      >
                        <div className="text-sm sm:text-base font-serif text-neutral-100 leading-relaxed">
                          <MarkdownRenderer
                            content={card.text}
                            isMarkdown={card.isMarkdown}
                          />
                        </div>
                      </div>
                    ));
                  })
                )}
              </div>
            </div>

            {/* Bottom Controls - Cleanly Anchored at Bottom, Never Pushed Off Screen */}
            <div className="shrink-0 flex items-center justify-between w-full pt-3 mt-1">
              <button
                onClick={handlePrevious}
                disabled={currentStageIndex === 0 && currentTopicIndex === 0}
                className="px-3.5 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-medium flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <button
                onClick={handleNext}
                className={`px-5 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-all active:scale-95 ${
                  currentStageIndex === ACTS_STAGES.length - 1 && currentTopicIndex === stageTopics.length - 1
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold'
                    : 'bg-neutral-100 hover:bg-white text-neutral-950'
                }`}
              >
                <span>Prayed & Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
