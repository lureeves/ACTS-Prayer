import { PrayerCategory, PrayerSubject, PrayerCard, ACTSStage, DailyRotationState, TopicPriority } from '../types/prayer';

export interface ActiveSessionItem {
  categoryName: ACTSStage;
  subject: PrayerSubject;
  cards: PrayerCard[]; // All active verses / cards for this attribute or topic
  priority?: TopicPriority;
  isPriorityOverride: boolean;
}

export interface PrayerUnit {
  id: string;
  rootTitle?: string;
  rootCard?: PrayerCard;
  activeCards: PrayerCard[];
  allCards: PrayerCard[];
}

/**
 * Groups a subject's cards into distinct prayer units (either a person/thread, or an individual standalone card).
 */
export function getSubjectPrayerUnits(cards: PrayerCard[]): PrayerUnit[] {
  const unitsMap = new Map<string, PrayerUnit>();
  const unitOrder: string[] = [];

  cards.forEach((card, idx) => {
    const key = card.stackGroup || card.threadId || `card-${card.createdDate}-${card.text}-${idx}`;
    if (!unitsMap.has(key)) {
      unitsMap.set(key, {
        id: key,
        activeCards: [],
        allCards: []
      });
      unitOrder.push(key);
    }
    const unit = unitsMap.get(key)!;
    unit.allCards.push(card);
    if (!card.archived) {
      unit.activeCards.push(card);
    }
  });

  const activeUnits: PrayerUnit[] = [];
  unitOrder.forEach(key => {
    const unit = unitsMap.get(key)!;
    if (unit.activeCards.length > 0) {
      if (unit.allCards.length > 1) {
        const sorted = [...unit.allCards].sort(
          (a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime() || (a.ordering || 0) - (b.ordering || 0)
        );
        unit.rootTitle = sorted[0].text;
        unit.rootCard = sorted[0];
      } else {
        unit.rootCard = unit.activeCards[0];
        unit.rootTitle = unit.activeCards[0].text;
      }
      activeUnits.push(unit);
    }
  });

  return activeUnits;
}

/**
 * Selects active cards for a subject during prayer session, respecting sessionCardLimit
 * and cardSelectionMode ('sequential' batch rotation vs 'random').
 */
export function selectSubjectSessionCards(subject: PrayerSubject): PrayerCard[] {
  const activeUnits = getSubjectPrayerUnits(subject.cards);
  if (activeUnits.length === 0) return [];

  const limit = subject.sessionCardLimit;
  if (!limit || limit <= 0 || activeUnits.length <= limit) {
    return activeUnits.flatMap(u => u.activeCards);
  }

  if (subject.cardSelectionMode === 'random') {
    const shuffled = [...activeUnits].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit).flatMap(u => u.activeCards);
  }

  // Sequential rotation: use cardRotationOffset, wrap around
  const offset = (subject.cardRotationOffset || 0) % activeUnits.length;
  const chosenUnits: PrayerUnit[] = [];
  for (let i = 0; i < limit; i++) {
    chosenUnits.push(activeUnits[(offset + i) % activeUnits.length]);
  }
  return chosenUnits.flatMap(u => u.activeCards);
}

/**
 * Returns YYYY-MM-DD in local time
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates days difference between two YYYY-MM-DD date strings
 */
export function getDaysDifference(olderDateStr: string, newerDateStr: string): number {
  try {
    const d1 = new Date(olderDateStr + 'T00:00:00');
    const d2 = new Date(newerDateStr + 'T00:00:00');
    const diffTime = d2.getTime() - d1.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

/**
 * Safely rotates an array by a given offset
 */
export function rotateArray<T>(arr: T[], offset: number): T[] {
  if (arr.length <= 1) return arr;
  const normalized = ((offset % arr.length) + arr.length) % arr.length;
  return [...arr.slice(normalized), ...arr.slice(0, normalized)];
}

/**
 * Automatically checks and updates daily rotation state if a new day has arrived.
 * Ensures the app automatically advances to the next set of topics at midnight
 * even if the user doesn't finish praying.
 */
export function syncDailyRotation(
  currentRotation?: DailyRotationState,
  currentDate: Date = new Date(),
  supplicationLimit: number = 3
): { rotation: DailyRotationState; changed: boolean } {
  const todayStr = getLocalDateString(currentDate);

  if (!currentRotation || !currentRotation.lastRotationDate) {
    return {
      rotation: {
        lastRotationDate: todayStr,
        offsets: {
          Adoration: 0,
          Confession: 0,
          Thanksgiving: 0,
          Supplication: 0
        }
      },
      changed: true
    };
  }

  const daysPassed = getDaysDifference(currentRotation.lastRotationDate, todayStr);

  if (daysPassed > 0) {
    // Advance each category's rotation offset by the number of days that elapsed
    const newOffsets = {
      Adoration: (currentRotation.offsets?.Adoration || 0) + daysPassed,
      Confession: (currentRotation.offsets?.Confession || 0) + daysPassed,
      Thanksgiving: (currentRotation.offsets?.Thanksgiving || 0) + daysPassed,
      Supplication: (currentRotation.offsets?.Supplication || 0) + (daysPassed * supplicationLimit)
    };

    return {
      rotation: {
        lastRotationDate: todayStr,
        offsets: newOffsets
      },
      changed: true
    };
  }

  return { rotation: currentRotation, changed: false };
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * Checks if a scheduled subject is active on the given target date.
 * Supports:
 * 1. Specific days of the week (dayOfTheWeekMask bitwise)
 * 2. Recurring every N weeks on a specific day of week (everyNWeeks)
 * 3. Specific days of the month (daysOfMonth)
 */
export function isSubjectActiveToday(subject: PrayerSubject, targetDate: Date = new Date()): boolean {
  if (subject.schedulingMode !== 1) {
    return false; // Not in scheduled mode; participates in standard queue rotation
  }

  // Support both local calendar day and UTC day to gracefully support evening / multi-timezone use
  const localDayOfWeek = targetDate.getDay(); // 0 is Sunday, 6 is Saturday
  const utcDayOfWeek = targetDate.getUTCDay();

  const localDayOfMonth = targetDate.getDate(); // 1 - 31
  const utcDayOfMonth = targetDate.getUTCDate();

  // Option C: Certain days of the month (e.g. 1st, 15th)
  if (subject.scheduleType === 'daysOfMonth' || (subject.daysOfMonth && subject.daysOfMonth.length > 0)) {
    const days = subject.daysOfMonth || [];
    return days.includes(localDayOfMonth) || days.includes(utcDayOfMonth);
  }

  // Option B: Every N weeks on a day of the week
  if (subject.scheduleType === 'everyNWeeks' && subject.everyNWeeks) {
    const targetDay = subject.everyNWeeks.dayOfWeek;
    if (localDayOfWeek !== targetDay && utcDayOfWeek !== targetDay) {
      return false;
    }
    const anchor = new Date(subject.everyNWeeks.startDate || subject.createdDate || '2026-01-01');
    const diffWeeks = Math.floor((targetDate.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks % (subject.everyNWeeks.interval || 1) === 0;
  }

  // Option A: Specific days of the week (standard dayOfTheWeekMask)
  if (subject.dayOfTheWeekMask) {
    const todayMask = (1 << localDayOfWeek) | (1 << utcDayOfWeek);
    return (subject.dayOfTheWeekMask & todayMask) !== 0;
  }

  return false;
}

/**
 * Resolves the priority for a topic ('low' | 'medium' | 'high').
 * Defaults to 'medium' for normal topics.
 * Legacy override on "Day" is removed.
 */
export function getSubjectPriority(subject: PrayerSubject): TopicPriority {
  if (subject.priority) return subject.priority;
  if (subject.priorityLevel === 3) return 'high';
  if (subject.priorityLevel === 1) return 'low';
  // Strip legacy PrayerMate override on 'Day'
  if (subject.name.trim().toLowerCase() === 'day') return 'medium';
  if (subject.priorityLevel && subject.priorityLevel > 100) return 'high';
  return 'medium';
}

/**
 * Returns rank for sorting: High = 1 (first), Medium = 2 (middle), Low = 3 (end).
 */
export function getPriorityOrderRank(priority: TopicPriority): number {
  switch (priority) {
    case 'high': return 1;
    case 'medium': return 2;
    case 'low': return 3;
    default: return 2;
  }
}

/**
 * Formats a subject's schedule into a user-friendly label for display.
 */
export function formatSubjectSchedule(subject: PrayerSubject): string {
  if (subject.schedulingMode === 0 || subject.schedulingMode === undefined) {
    return 'Random / Queue';
  }

  // Days of Month
  if (subject.scheduleType === 'daysOfMonth' || (subject.daysOfMonth && subject.daysOfMonth.length > 0)) {
    const days = (subject.daysOfMonth || []).slice().sort((a, b) => a - b);
    if (days.length === 0) return 'Monthly';
    return `Monthly: ${days.map(d => {
      const j = d % 10, k = d % 100;
      if (j === 1 && k !== 11) return d + 'st';
      if (j === 2 && k !== 12) return d + 'nd';
      if (j === 3 && k !== 13) return d + 'rd';
      return d + 'th';
    }).join(', ')}`;
  }

  // Every N Weeks
  if (subject.scheduleType === 'everyNWeeks' && subject.everyNWeeks) {
    const day = DAY_NAMES[subject.everyNWeeks.dayOfWeek] || 'Day';
    const interval = subject.everyNWeeks.interval || 1;
    if (interval === 1) return `Every ${day}`;
    return `Every ${interval} wks (${day})`;
  }

  // Days of the Week Mask
  if (subject.dayOfTheWeekMask) {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      if ((subject.dayOfTheWeekMask & (1 << i)) !== 0) {
        days.push(DAY_NAMES[i]);
      }
    }
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('Sun') && !days.includes('Sat')) return 'Weekdays';
    if (days.length === 2 && days.includes('Sun') && days.includes('Sat')) return 'Weekends';
    if (days.length === 0) return 'Scheduled';
    return days.join(', ');
  }

  return 'Scheduled';
}

/**
 * Prepare items for an ACTS prayer session
 * - Automatically advances each day based on daily rotation offsets
 * - Adoration: 1 attribute topic per session with all its verses shown together (scrollable)
 * - Confession: 1 subject (rotating daily)
 * - Thanksgiving: 1 subject (rotating daily)
 * - Supplication: fixed number of topics (default 3, user-configured in settings)
 * - Prioritized ordering: High priority items first, Medium items in the middle, Low items at the end.
 */
export function generateSessionPlan(
  categories: PrayerCategory[],
  date: Date = new Date(),
  supplicationTopicsLimit: number = 3,
  rotationOffsets?: Record<string, number>
): Record<ACTSStage, ActiveSessionItem[]> {
  const stageMap: Record<ACTSStage, ActiveSessionItem[]> = {
    Adoration: [],
    Confession: [],
    Thanksgiving: [],
    Supplication: []
  };

  for (const stage of Object.keys(stageMap) as ACTSStage[]) {
    const category = categories.find(c => c.name.trim().toLowerCase() === stage.toLowerCase());
    if (!category || category.visible === false) continue;

    // Filter subjects (excluding inbox)
    const activeSubjects = category.subjects.filter(s => !s.isInbox);

    if (activeSubjects.length === 0) continue;

    let selectedSubjects: PrayerSubject[] = [];
    const offset = rotationOffsets?.[stage] || 0;

    if (stage === 'Supplication') {
      const dayRoutedSubjects: PrayerSubject[] = [];
      const highPrioritySubjects: PrayerSubject[] = [];
      const regularMediumSubjects: PrayerSubject[] = [];
      const regularLowSubjects: PrayerSubject[] = [];

      for (const subject of activeSubjects) {
        const p = getSubjectPriority(subject);
        if (subject.schedulingMode === 1) {
          if (isSubjectActiveToday(subject, date)) {
            dayRoutedSubjects.push(subject);
          }
        } else if (p === 'high') {
          highPrioritySubjects.push(subject);
        } else if (p === 'low') {
          regularLowSubjects.push(subject);
        } else {
          regularMediumSubjects.push(subject);
        }
      }

      // Sort deterministically by ordering / createdDate
      const sortFn = (a: PrayerSubject, b: PrayerSubject) => (a.ordering || 0) - (b.ordering || 0) || a.name.localeCompare(b.name);
      regularMediumSubjects.sort(sortFn);
      regularLowSubjects.sort(sortFn);
      highPrioritySubjects.sort(sortFn);

      // Rotating pool for non-assigned slots: Medium rotating topics first, then Low rotating topics
      const rotatingPool = [
        ...rotateArray(regularMediumSubjects, offset),
        ...rotateArray(regularLowSubjects, offset)
      ];

      // Assigned topics for today: High priority topics + today's scheduled day-of-week topics
      const assignedSubjects = [...highPrioritySubjects, ...dayRoutedSubjects];
      const uniqueAssigned = Array.from(new Set(assignedSubjects));
      const assignedCount = uniqueAssigned.length;
      const userLimit = Math.max(1, supplicationTopicsLimit);

      // Requirement:
      // Set the number of topics to whatever the user specifies including the assigned ones for that day.
      // But if there are more assigned topics than the user sets for that day, then display more topics as the user does the prayer.
      if (assignedCount >= userLimit) {
        selectedSubjects = uniqueAssigned;
      } else {
        const slotsRemaining = userLimit - assignedCount;
        const fillRegular = rotatingPool.filter(s => !uniqueAssigned.includes(s)).slice(0, slotsRemaining);
        selectedSubjects = [...uniqueAssigned, ...fillRegular];
      }

      // Requirement:
      // Make the high corresponding items appear first when praying.
      // The medium ones in the middle and the low ones at the end.
      selectedSubjects.sort((a, b) => {
        const rankA = getPriorityOrderRank(getSubjectPriority(a));
        const rankB = getPriorityOrderRank(getSubjectPriority(b));
        return rankA - rankB;
      });
    } else {
      // Adoration, Confession, Thanksgiving: exactly 1 subject per session, rotating daily
      // Sort deterministically so rotation order is consistent and stable
      const sortedSubjects = [...activeSubjects].sort(
        (a, b) => (a.ordering || 0) - (b.ordering || 0) || a.name.localeCompare(b.name)
      );

      const rotated = rotateArray(sortedSubjects, offset);
      selectedSubjects = rotated.slice(0, 1);
    }

    // Flatten into active session items (each item is an attribute/topic with all its verses/cards)
    const items: ActiveSessionItem[] = [];
    for (const subject of selectedSubjects) {
      const activeCards = selectSubjectSessionCards(subject);

      items.push({
        categoryName: stage,
        subject,
        cards: activeCards,
        priority: getSubjectPriority(subject),
        isPriorityOverride: getSubjectPriority(subject) === 'high'
      });
    }

    stageMap[stage] = items;
  }

  return stageMap;
}
