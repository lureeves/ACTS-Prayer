import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  Smile, 
  HandHeart, 
  Flame,
  ArrowUp,
  ArrowDown,
  Plus,
  Archive
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
  onEditCardText?: (categoryName: string, subjectName: string, card: PrayerCard, newText: string) => void;
  onAddCardUpdate?: (subjectName: string, parentCard: PrayerCard, newText: string) => PrayerCard | null;
  onArchiveCard?: (subjectName: string, card: PrayerCard) => void;
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

/**
 * Clean inline editable text component.
 * Renders naturally; clicking immediately shows cursor in an auto-fitting textarea.
 * Saves automatically on blur or Enter.
 */
interface InlineEditableTextProps {
  value: string;
  onSave: (newVal: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  isMarkdown?: boolean;
}

const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onSave,
  className = '',
  inputClassName = '',
  placeholder = 'Type text...',
  isMarkdown = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(28, textareaRef.current.scrollHeight)}px`;
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text.trim() && text !== value) {
      onSave(text.trim());
    } else {
      setText(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textareaRef.current?.blur();
    } else if (e.key === 'Escape') {
      setText(value);
      setIsEditing(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.max(28, e.target.scrollHeight)}px`;
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className={`w-full bg-transparent border-b border-amber-500/70 focus:border-amber-400 focus:outline-none resize-none p-0 m-0 ${className} ${inputClassName}`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      title="Click to edit"
      className={`cursor-text transition-colors hover:text-white rounded ${className}`}
    >
      <MarkdownRenderer content={text} isMarkdown={isMarkdown} />
    </div>
  );
};

export const GuidedSessionModal: React.FC<GuidedSessionModalProps> = ({
  isOpen,
  onClose,
  sessionPlan,
  initialMinutes,
  autoStartTimer,
  soundEnabled,
  onTopicPrayed,
  onEditCardText,
  onAddCardUpdate,
  onArchiveCard
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [currentTopicIndex, setCurrentTopicIndex] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [activePlan, setActivePlan] = useState<Record<ACTSStage, ActiveSessionItem[]>>(sessionPlan);
  const [addingSubPrayerId, setAddingSubPrayerId] = useState<string | null>(null);
  const [newSubPrayerText, setNewSubPrayerText] = useState<string>('');
  const prevIsOpenRef = useRef<boolean>(false);

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

  // Only initialize on initial modal open transition. Adding/editing sub-prayers will NOT reset stage/topic!
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setActivePlan(sessionPlan);
      setCurrentStageIndex(0);
      setCurrentTopicIndex(0);
      setCompleted(false);
      setAddingSubPrayerId(null);
      setNewSubPrayerText('');
    }
    prevIsOpenRef.current = isOpen;
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
    const groups: Record<string, { rootTitle?: string; rootCard?: PrayerCard; cards: PrayerCard[] }> = {};
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
          groups[key].rootCard = sorted[0];
        } else {
          groups[key].rootCard = card;
        }
      }
      groups[key].cards.push(card);
    });

    return groupOrder.map(key => ({
      groupId: key,
      rootTitle: groups[key].rootTitle,
      rootCard: groups[key].rootCard,
      cards: groups[key].cards
    }));
  };

  // Handle inline text editing for any card or root title
  const handleCardTextEdited = (card: PrayerCard, newText: string) => {
    if (!activeItem || !onEditCardText) return;
    onEditCardText(activeItem.categoryName, activeItem.subject.name, card, newText);

    // Update in local activePlan immediately
    const updatedCards = activeItem.cards.map(c => {
      if (c.createdDate === card.createdDate) {
        return { ...c, text: newText };
      }
      return c;
    });

    const updatedSubjectCards = activeItem.subject.cards.map(c => {
      if (c.createdDate === card.createdDate) {
        return { ...c, text: newText };
      }
      return c;
    });

    const updatedItem: ActiveSessionItem = {
      ...activeItem,
      cards: updatedCards,
      subject: {
        ...activeItem.subject,
        cards: updatedSubjectCards
      }
    };

    const updatedStageTopics = [...stageTopics];
    updatedStageTopics[currentTopicIndex] = updatedItem;

    setActivePlan({
      ...activePlan,
      [currentStage]: updatedStageTopics
    });
  };

  // Handle adding a sub-prayer for a person / card
  const handleConfirmAddSubPrayer = (parentCard: PrayerCard) => {
    if (!newSubPrayerText.trim() || !activeItem || !onAddCardUpdate) return;
    const addedCard = onAddCardUpdate(activeItem.subject.name, parentCard, newSubPrayerText.trim());
    if (!addedCard) return;

    // Immediately reflect the new sub-prayer in local activePlan
    const isParentGrouped = Boolean(parentCard.stackGroup);
    let updatedActiveCards: PrayerCard[];

    if (!isParentGrouped) {
      // Parent was standalone, now it becomes root container and addedCard is the first active update
      updatedActiveCards = activeItem.cards.map(c => {
        if (c.createdDate === parentCard.createdDate) {
          return addedCard;
        }
        return c;
      });
    } else {
      updatedActiveCards = [...activeItem.cards, addedCard];
    }

    const updatedSubjectCards = [
      ...activeItem.subject.cards.map(c => {
        if (c.createdDate === parentCard.createdDate) {
          return {
            ...c,
            stackGroup: addedCard.stackGroup,
            threadId: addedCard.threadId,
            archived: true
          };
        }
        return c;
      }),
      addedCard
    ];

    const updatedItem: ActiveSessionItem = {
      ...activeItem,
      cards: updatedActiveCards,
      subject: {
        ...activeItem.subject,
        cards: updatedSubjectCards
      }
    };

    const updatedStageTopics = [...stageTopics];
    updatedStageTopics[currentTopicIndex] = updatedItem;

    setActivePlan({
      ...activePlan,
      [currentStage]: updatedStageTopics
    });

    setAddingSubPrayerId(null);
    setNewSubPrayerText('');
  };

  // Handle archiving prayer card or sub-prayer
  const handleArchive = (card: PrayerCard) => {
    if (!activeItem || !onArchiveCard) return;
    onArchiveCard(activeItem.subject.name, card);

    const key = card.stackGroup || card.threadId;
    const isRoot = Boolean(
      groupSessionCards(activeItem.cards, activeItem.subject?.cards || []).find(
        g => g.rootCard?.createdDate === card.createdDate && g.rootTitle
      )
    );

    let updatedActiveCards: PrayerCard[];
    let updatedSubjectCards: PrayerCard[];

    if (isRoot && key) {
      // Root card archived -> remove all cards in this thread from the active session
      updatedActiveCards = activeItem.cards.filter(c => (c.stackGroup || c.threadId) !== key && c.createdDate !== card.createdDate);
      updatedSubjectCards = activeItem.subject.cards.filter(c => (c.stackGroup || c.threadId) !== key && c.createdDate !== card.createdDate);
    } else {
      // Single sub-prayer or standalone card archived
      updatedActiveCards = activeItem.cards.filter(c => c.createdDate !== card.createdDate);
      updatedSubjectCards = activeItem.subject.cards.filter(c => c.createdDate !== card.createdDate);
    }

    const updatedItem: ActiveSessionItem = {
      ...activeItem,
      cards: updatedActiveCards,
      subject: {
        ...activeItem.subject,
        cards: updatedSubjectCards
      }
    };

    const updatedStageTopics = [...stageTopics];
    updatedStageTopics[currentTopicIndex] = updatedItem;

    setActivePlan({
      ...activePlan,
      [currentStage]: updatedStageTopics
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100 select-none overflow-hidden h-screen w-screen animate-fadeIn">
      {/* Top Bar - Centered Clock Over Top & Stage Pills (Never Cut Off in Half Screen) */}
      <div className="shrink-0 border-b border-neutral-900 bg-neutral-950/90 backdrop-blur-md px-4 sm:px-6 pt-2.5 pb-2">
        {/* Row 1: The Centered Clock Over Top */}
        <div className="relative flex items-center justify-center w-full min-h-[34px]">
          {/* Centered Hoverable Clock */}
          <TimerBar
            initialMinutes={initialMinutes}
            autoStart={autoStartTimer}
            soundEnabled={soundEnabled}
          />

          {/* Close / Exit Button pinned to right */}
          <button
            onClick={onClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Exit Session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Row 2: Stage Pills Centered Below */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2 overflow-x-auto no-scrollbar py-0.5">
          {ACTS_STAGES.map((stg, idx) => {
            const isCurrent = idx === currentStageIndex;
            const isPast = idx < currentStageIndex;
            const stgTheme = STAGE_THEMES[stg];
            const topicCount = (activePlan[stg] || []).length;

            return (
              <button
                key={stg}
                type="button"
                onClick={() => {
                  setCurrentStageIndex(idx);
                  setCurrentTopicIndex(0);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
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
              </button>
            );
          })}
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

            {/* Prayer Topic Container */}
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

              {/* The Single Scrollbar for Verses / Cards */}
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
                    const groupIdentifier = group.groupId;
                    const isAddingSubHere = addingSubPrayerId === groupIdentifier;

                    // Cards with sub-information / updates
                    if (group.rootTitle && group.cards.length > 0) {
                      return (
                        <div
                          key={group.groupId}
                          className="group relative p-3.5 sm:p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 shadow-sm space-y-2.5 transition-all hover:border-neutral-700/80"
                        >
                          {/* Person/Topic Header - Exactly same styling as other cards (NOT blue, NO "active update" badge) */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <InlineEditableText
                                value={group.rootTitle}
                                onSave={(newVal) => {
                                  if (group.rootCard) {
                                    handleCardTextEdited(group.rootCard, newVal);
                                  }
                                }}
                                className="text-sm sm:text-base font-serif text-neutral-100 leading-relaxed font-medium"
                              />
                            </div>

                            {/* Right side actions on hover: + Sub-prayer on top, Archive below */}
                            <div className="shrink-0 flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddingSubPrayerId(isAddingSubHere ? null : groupIdentifier);
                                  setNewSubPrayerText('');
                                }}
                                title="Add sub-prayer for this person"
                                className="px-2 py-0.5 rounded-lg bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/60 text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Plus className="w-3 h-3 text-amber-400" />
                                <span>Sub-prayer</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (group.rootCard) handleArchive(group.rootCard);
                                }}
                                title="Archive this prayer"
                                className="px-2 py-0.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-700 border border-neutral-700/50 text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Archive className="w-3 h-3 text-neutral-400" />
                                <span>Archive</span>
                              </button>
                            </div>
                          </div>

                          {/* Inline Sub-Prayer Input Box (when triggered) */}
                          {isAddingSubHere && (
                            <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-700/80 space-y-2 animate-fadeIn">
                              <input
                                type="text"
                                value={newSubPrayerText}
                                onChange={(e) => setNewSubPrayerText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (group.rootCard) handleConfirmAddSubPrayer(group.rootCard);
                                  } else if (e.key === 'Escape') {
                                    setAddingSubPrayerId(null);
                                    setNewSubPrayerText('');
                                  }
                                }}
                                placeholder={`Add sub-prayer for ${group.rootTitle}...`}
                                autoFocus
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-serif text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingSubPrayerId(null);
                                    setNewSubPrayerText('');
                                  }}
                                  className="px-2.5 py-1 text-neutral-400 hover:text-white text-xs transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (group.rootCard) handleConfirmAddSubPrayer(group.rootCard);
                                  }}
                                  disabled={!newSubPrayerText.trim()}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Sub-portion (Updates under this Topic/Person) - Clean text with no update# or date */}
                          <div className="space-y-2 pt-1 border-t border-neutral-800/60">
                            {group.cards.map((card, cIdx) => (
                              <div
                                key={card.createdDate + cIdx}
                                className="group/sub p-2.5 sm:p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/70 flex items-start justify-between gap-3 transition-colors hover:border-neutral-700/80"
                              >
                                <div className="flex-1 min-w-0 text-sm sm:text-base font-serif text-neutral-200 leading-relaxed font-normal">
                                  <InlineEditableText
                                    value={card.text}
                                    onSave={(newVal) => handleCardTextEdited(card, newVal)}
                                    isMarkdown={card.isMarkdown}
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchive(card);
                                  }}
                                  title="Archive this sub-prayer"
                                  className="opacity-0 group-hover/sub:opacity-100 transition-opacity duration-200 px-2 py-0.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-700 border border-neutral-700/50 text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 shadow-sm active:scale-95 shrink-0"
                                >
                                  <Archive className="w-3 h-3 text-neutral-400" />
                                  <span>Archive</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // Standalone card(s)
                    return group.cards.map((card, cIdx) => {
                      const standaloneId = card.createdDate + cIdx;
                      const isAddingStandaloneSub = addingSubPrayerId === standaloneId;

                      return (
                        <div
                          key={standaloneId}
                          className="group relative p-3.5 sm:p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 shadow-sm space-y-2 transition-all hover:border-neutral-700/80"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <InlineEditableText
                                value={card.text}
                                onSave={(newVal) => handleCardTextEdited(card, newVal)}
                                isMarkdown={card.isMarkdown}
                                className="text-sm sm:text-base font-serif text-neutral-100 leading-relaxed"
                              />
                            </div>

                            {/* Right side actions on hover: + Sub-prayer on top, Archive below */}
                            <div className="shrink-0 flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddingSubPrayerId(isAddingStandaloneSub ? null : standaloneId);
                                  setNewSubPrayerText('');
                                }}
                                title="Add sub-prayer for this person"
                                className="px-2 py-0.5 rounded-lg bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/60 text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Plus className="w-3 h-3 text-amber-400" />
                                <span>Sub-prayer</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchive(card);
                                }}
                                title="Archive this prayer"
                                className="px-2 py-0.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-700 border border-neutral-700/50 text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Archive className="w-3 h-3 text-neutral-400" />
                                <span>Archive</span>
                              </button>
                            </div>
                          </div>

                          {/* Inline Sub-Prayer Input Box for standalone card */}
                          {isAddingStandaloneSub && (
                            <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-700/80 space-y-2 animate-fadeIn">
                              <input
                                type="text"
                                value={newSubPrayerText}
                                onChange={(e) => setNewSubPrayerText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleConfirmAddSubPrayer(card);
                                  } else if (e.key === 'Escape') {
                                    setAddingSubPrayerId(null);
                                    setNewSubPrayerText('');
                                  }
                                }}
                                placeholder="Add first sub-prayer update..."
                                autoFocus
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-serif text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingSubPrayerId(null);
                                    setNewSubPrayerText('');
                                  }}
                                  className="px-2.5 py-1 text-neutral-400 hover:text-white text-xs transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAddSubPrayer(card)}
                                  disabled={!newSubPrayerText.trim()}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
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
