import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
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
  onAddNewCard?: (subjectName: string, text: string) => PrayerCard | null;
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
      textareaRef.current.style.height = `${Math.max(26, textareaRef.current.scrollHeight)}px`;
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
    e.target.style.height = `${Math.max(26, e.target.scrollHeight)}px`;
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
  onArchiveCard,
  onAddNewCard
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [currentTopicIndex, setCurrentTopicIndex] = useState<number>(0);
  const [activePlan, setActivePlan] = useState<Record<ACTSStage, ActiveSessionItem[]>>(sessionPlan);
  const [addingSubPrayerId, setAddingSubPrayerId] = useState<string | null>(null);
  const [newSubPrayerText, setNewSubPrayerText] = useState<string>('');
  const [isAddingNewPrayer, setIsAddingNewPrayer] = useState<boolean>(false);
  const [newPrayerText, setNewPrayerText] = useState<string>('');
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

  // Only initialize on initial modal open transition. Adding/editing/archiving will NOT reset stage/topic!
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setActivePlan(sessionPlan);
      setCurrentStageIndex(0);
      setCurrentTopicIndex(0);
      setAddingSubPrayerId(null);
      setNewSubPrayerText('');
      setIsAddingNewPrayer(false);
      setNewPrayerText('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const currentStage: ACTSStage = ACTS_STAGES[currentStageIndex];
  const stageTopics = activePlan[currentStage] || [];
  const activeItem = stageTopics[currentTopicIndex];
  const theme = STAGE_THEMES[currentStage];

  // Determine if this is the final prayer screen of the entire prayer session
  const isLastPrayer = Boolean(activeItem) && (() => {
    if (currentTopicIndex < stageTopics.length - 1) return false;
    for (let sIdx = currentStageIndex + 1; sIdx < ACTS_STAGES.length; sIdx++) {
      const nextTopics = activePlan[ACTS_STAGES[sIdx]] || [];
      if (nextTopics.length > 0) return false;
    }
    return true;
  })();

  const handleNext = () => {
    if (activeItem) {
      onTopicPrayed(activeItem.categoryName, activeItem.subject.name, activeItem.cards);
    }

    if (isLastPrayer) {
      onClose();
      return;
    }

    if (currentTopicIndex + 1 < stageTopics.length) {
      setCurrentTopicIndex(currentTopicIndex + 1);
      setIsAddingNewPrayer(false);
      setNewPrayerText('');
      setAddingSubPrayerId(null);
    } else {
      // Advance to next ACTS stage with topics
      let nextStageIdx = currentStageIndex + 1;
      while (nextStageIdx < ACTS_STAGES.length && (activePlan[ACTS_STAGES[nextStageIdx]] || []).length === 0) {
        nextStageIdx++;
      }

      if (nextStageIdx < ACTS_STAGES.length) {
        setCurrentStageIndex(nextStageIdx);
        setCurrentTopicIndex(0);
        setIsAddingNewPrayer(false);
        setNewPrayerText('');
        setAddingSubPrayerId(null);
      } else {
        onClose();
      }
    }
  };

  const handlePrevious = () => {
    setIsAddingNewPrayer(false);
    setNewPrayerText('');
    setAddingSubPrayerId(null);

    if (currentTopicIndex > 0) {
      setCurrentTopicIndex(currentTopicIndex - 1);
    } else if (currentStageIndex > 0) {
      const prevStage = ACTS_STAGES[currentStageIndex - 1];
      const prevTopics = activePlan[prevStage] || [];
      setCurrentStageIndex(currentStageIndex - 1);
      setCurrentTopicIndex(Math.max(0, prevTopics.length - 1));
    }
  };

  // Always maintain fresh references for global keyboard & gesture listeners
  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  const handlePreviousRef = useRef(handlePrevious);
  handlePreviousRef.current = handlePrevious;

  // 1. Keyboard Navigation: Right arrow -> Next page, Left arrow -> Previous page
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept arrow keys if user is editing text in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('.group-editable'))
      ) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextRef.current();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 2. Trackpad Two-Finger Swipe (wheel with deltaX):
  // 2 fingers swipe left (deltaX > 0) -> Advance to next page
  // 2 fingers swipe right (deltaX < 0) -> Go to previous page
  const lastWheelTriggerRef = useRef<number>(0);
  const wheelAccumulatorRef = useRef<number>(0);
  const wheelResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      // Lock for 850ms after a successful page turn to fully drain trackpad momentum
      if (now - lastWheelTriggerRef.current < 850) {
        wheelAccumulatorRef.current = 0;
        return;
      }

      // If vertical scroll is significant or dominant, let user scroll the cards list smoothly
      if (Math.abs(e.deltaY) * 1.5 > Math.abs(e.deltaX)) {
        return;
      }

      // Filter out micro-movements
      if (Math.abs(e.deltaX) < 10) return;

      wheelAccumulatorRef.current += e.deltaX;

      if (wheelResetTimeoutRef.current) {
        window.clearTimeout(wheelResetTimeoutRef.current);
      }
      wheelResetTimeoutRef.current = window.setTimeout(() => {
        wheelAccumulatorRef.current = 0;
      }, 150);

      const SWIPE_THRESHOLD = 95;

      if (wheelAccumulatorRef.current > SWIPE_THRESHOLD) {
        // Swiped left with 2 fingers -> Advance to next page
        lastWheelTriggerRef.current = now;
        wheelAccumulatorRef.current = 0;
        handleNextRef.current();
      } else if (wheelAccumulatorRef.current < -SWIPE_THRESHOLD) {
        // Swiped right with 2 fingers -> Go to previous page
        lastWheelTriggerRef.current = now;
        wheelAccumulatorRef.current = 0;
        handlePreviousRef.current();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (wheelResetTimeoutRef.current) {
        window.clearTimeout(wheelResetTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // 3. Touchscreen Swipe (Touchstart / Touchend on Mobile / iOS / iPad)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchTriggerRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now()
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const changedTouch = e.changedTouches[0];
      if (!changedTouch) return;

      const diffX = changedTouch.clientX - touchStartRef.current.x;
      const diffY = changedTouch.clientY - touchStartRef.current.y;
      const now = Date.now();
      const elapsed = now - touchStartRef.current.time;

      touchStartRef.current = null;

      if (now - lastTouchTriggerRef.current < 600) {
        return;
      }

      // Swipe gesture: within 500ms, strictly horizontal, distance greater than 75px
      if (elapsed < 500 && Math.abs(diffX) > 75 && Math.abs(diffX) > Math.abs(diffY) * 1.6) {
        lastTouchTriggerRef.current = now;
        if (diffX < 0) {
          // Swiped left -> Advance to next page
          handleNextRef.current();
        } else {
          // Swiped right -> Go to previous page
          handlePreviousRef.current();
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen]);

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
    if (currentStage !== 'Supplication') return;
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

  // Handle adding a brand new prayer card under the last one in this topic's list
  const handleConfirmAddNewPrayer = () => {
    if (currentStage !== 'Supplication') return;
    if (!newPrayerText.trim() || !activeItem || !onAddNewCard) return;
    const addedCard = onAddNewCard(activeItem.subject.name, newPrayerText.trim());
    if (!addedCard) return;

    const updatedActiveCards = [...activeItem.cards, addedCard];
    const updatedSubjectCards = [...activeItem.subject.cards, addedCard];

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

    setIsAddingNewPrayer(false);
    setNewPrayerText('');
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
      updatedActiveCards = activeItem.cards.filter(c => !(c.createdDate === card.createdDate || (c.text.trim() === card.text.trim() && (c.stackGroup === card.stackGroup || c.threadId === card.threadId))));
      updatedSubjectCards = activeItem.subject.cards.filter(c => !(c.createdDate === card.createdDate || (c.text.trim() === card.text.trim() && (c.stackGroup === card.stackGroup || c.threadId === card.threadId))));
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

  if (!isOpen) return null;

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
                  setIsAddingNewPrayer(false);
                  setNewPrayerText('');
                  setAddingSubPrayerId(null);
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
        {stageTopics.length === 0 || !activeItem ? (
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

                    // Cards with sub-information / updates (e.g. Person with multiple requests in a horizontal tree chart)
                    if (group.rootTitle && group.cards.length > 0) {
                      const allSubCards = group.cards;
                      const totalRows = isAddingSubHere ? allSubCards.length + 1 : allSubCards.length;

                      return (
                        <div
                          key={group.groupId}
                          className="group relative p-3 sm:p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 shadow-sm transition-all hover:border-neutral-700/80"
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
                            {/* LEFT NODE: Person Name & Action Buttons */}
                            <div className="shrink-0 relative flex items-center py-1 max-w-[200px] sm:max-w-[240px]">
                              <div className="relative group/name shrink-0 max-w-full">
                                <InlineEditableText
                                  value={group.rootTitle}
                                  onSave={(newVal) => {
                                    if (group.rootCard) {
                                      handleCardTextEdited(group.rootCard, newVal);
                                    }
                                  }}
                                  className="text-sm sm:text-base font-serif text-neutral-100 font-semibold leading-snug tracking-tight"
                                />

                                {/* Action buttons on hover: positioned cleanly below name without offsetting the line */}
                                <div className="h-0 relative">
                                  <div className="absolute top-1.5 left-0 flex items-center gap-1.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 whitespace-nowrap">
                                    {currentStage === 'Supplication' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAddingSubPrayerId(isAddingSubHere ? null : groupIdentifier);
                                          setNewSubPrayerText('');
                                        }}
                                        title="Add sub-prayer for this person"
                                        className="px-2 py-0.5 rounded-lg bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/60 text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 shadow-md active:scale-95"
                                      >
                                        <Plus className="w-3 h-3 text-amber-400" />
                                        <span>Sub-prayer</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (group.rootCard) handleArchive(group.rootCard);
                                      }}
                                      title="Archive this person & all requests"
                                      className="px-2 py-0.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-700 border border-neutral-700/50 text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 shadow-md active:scale-95"
                                    >
                                      <Archive className="w-3 h-3 text-neutral-400" />
                                      <span>Archive</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Horizontal connector line: identical small gap (w-7 = 28px) regardless of person's name */}
                            <div className="hidden sm:block w-7 shrink-0 h-[1.5px] bg-neutral-700/80" />

                            {/* RIGHT SIDE: Horizontal tree chart branching to each prayer request */}
                            <div className={`relative flex-1 min-w-0 ${totalRows > 1 ? 'sm:pl-5' : ''} space-y-2 py-0.5`}>
                              {allSubCards.map((card, cIdx) => {
                                const isTop = cIdx === 0;
                                const isBottom = cIdx === totalRows - 1;

                                return (
                                  <div
                                    key={card.createdDate + cIdx}
                                    className="group/sub relative flex items-center"
                                  >
                                    {/* Horizontal branch line directly into this request card (only if multi-row tree) */}
                                    {totalRows > 1 && (
                                      <div className="hidden sm:block absolute -left-5 top-1/2 -translate-y-1/2 w-5 h-[1.5px] bg-neutral-700/80" />
                                    )}

                                    {/* Vertical rail connecting branches (only if > 1 card/row). NEVER extends above top card or below bottom card! */}
                                    {totalRows > 1 && (
                                      <>
                                        {isTop && (
                                          <div className="hidden sm:block absolute -left-5 top-1/2 -bottom-2 w-[1.5px] bg-neutral-700/80" />
                                        )}
                                        {isBottom && (
                                          <div className="hidden sm:block absolute -left-5 -top-2 bottom-1/2 w-[1.5px] bg-neutral-700/80" />
                                        )}
                                        {!isTop && !isBottom && (
                                          <div className="hidden sm:block absolute -left-5 -top-2 -bottom-2 w-[1.5px] bg-neutral-700/80" />
                                        )}
                                      </>
                                    )}

                                    {/* The Prayer Request Card */}
                                    <div className="w-full px-3 py-2 sm:py-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/70 flex items-start justify-between gap-3 transition-colors hover:border-neutral-700/80">
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
                                  </div>
                                );
                              })}

                              {/* Inline Sub-Prayer Input Box (when triggered) */}
                              {isAddingSubHere && (
                                <div className="relative flex items-center animate-fadeIn pt-1">
                                  {/* Horizontal branch line connecting new input to tree */}
                                  <div className="hidden sm:block absolute -left-5 top-1/2 -translate-y-1/2 w-5 h-[1.5px] bg-amber-500/60" />

                                  {/* Vertical line connecting from previous card to input center */}
                                  {totalRows > 1 && (
                                    <div className="hidden sm:block absolute -left-5 -top-2 bottom-1/2 w-[1.5px] bg-neutral-700/80" />
                                  )}

                                  <div className="w-full p-2.5 rounded-lg bg-neutral-900/95 border border-amber-500/40 space-y-2 shadow-lg">
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
                                </div>
                              )}
                            </div>
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
                          className="group relative p-3 sm:p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 shadow-sm space-y-1.5 transition-all hover:border-neutral-700/80"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <InlineEditableText
                                value={card.text}
                                onSave={(newVal) => handleCardTextEdited(card, newVal)}
                                isMarkdown={card.isMarkdown}
                                className="text-sm sm:text-base font-serif text-neutral-100 leading-snug"
                              />
                            </div>

                            {/* Right side actions on hover: + Sub-prayer on top (Supplication only), Archive below */}
                            <div className="shrink-0 flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {currentStage === 'Supplication' && (
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
                              )}

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
                            <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-700/80 space-y-2 animate-fadeIn my-1">
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

                {/* Option for new prayer under the last one in the list (Supplication only) */}
                {currentStage === 'Supplication' && activeItem.cards.length > 0 && (
                  <div className="pt-2">
                    {isAddingNewPrayer ? (
                      <div className="p-3 sm:p-4 rounded-xl bg-neutral-950/80 border border-neutral-700/80 space-y-2.5 animate-fadeIn">
                        <div className="text-xs font-medium text-neutral-300">
                          Add prayer to <span className="text-amber-400 font-semibold">{activeItem.subject.name}</span>:
                        </div>
                        <input
                          type="text"
                          value={newPrayerText}
                          onChange={(e) => setNewPrayerText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmAddNewPrayer();
                            if (e.key === 'Escape') {
                              setIsAddingNewPrayer(false);
                              setNewPrayerText('');
                            }
                          }}
                          placeholder={`Type prayer or person's name for ${activeItem.subject.name}...`}
                          autoFocus
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-serif text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewPrayer(false);
                              setNewPrayerText('');
                            }}
                            className="px-3 py-1.5 text-neutral-400 hover:text-white text-xs transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmAddNewPrayer}
                            disabled={!newPrayerText.trim()}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Add Prayer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewPrayer(true);
                          setNewPrayerText('');
                        }}
                        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950/40 hover:bg-neutral-900/60 text-xs text-neutral-400 hover:text-neutral-200 flex items-center justify-center gap-1.5 transition-all group active:scale-98"
                      >
                        <Plus className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-400 transition-colors" />
                        <span>Add prayer to {activeItem.subject.name}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Controls - Cleanly Anchored at Bottom, Never Pushed Off Screen */}
            <div className="shrink-0 flex items-center justify-between w-full pt-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStageIndex === 0 && currentTopicIndex === 0}
                className="px-3.5 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all active:scale-95"
                title="Previous topic (or swipe right / Left Arrow ←)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className={`flex items-center justify-center transition-all active:scale-95 ${
                  isLastPrayer
                    ? 'px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm gap-1.5 shadow-md'
                    : 'px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 hover:text-white border border-neutral-700/80 hover:border-neutral-600 shadow-sm'
                }`}
                title={isLastPrayer ? "Finish Praying (or swipe left / Right Arrow →)" : "Continue (or swipe left / Right Arrow →)"}
              >
                {isLastPrayer ? (
                  <>
                    <span>Finish Praying</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  </>
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
