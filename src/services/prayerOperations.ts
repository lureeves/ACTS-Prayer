import type { PrayerCategory, PrayerCard } from '../types/prayer';

/**
 * Normalizes subject or category names for case/whitespace/quote-insensitive comparison.
 */
export function normalizeName(str?: string): string {
  return (str || '').trim().toLowerCase().replace(/[\u2018\u2019']/g, "'");
}

/**
 * Ensures thread root containers are marked archived: true, thread updates are marked archived: false,
 * and any cards marked with userArchived: true are properly moved to the Archive category.
 */
export function sanitizeThreadUpdates(categories: PrayerCategory[]): PrayerCategory[] {
  const cardsToMoveToArchive: { subjectName: string; originalCategory: string; card: PrayerCard }[] = [];

  const cleanedCategories = categories.map(cat => {
    if (cat.name.toLowerCase() === 'archive') return cat;

    return {
      ...cat,
      subjects: cat.subjects.map(sub => {
        const remainingCards: PrayerCard[] = [];
        const groups: Record<string, PrayerCard[]> = {};

        sub.cards.forEach(card => {
          if (card.userArchived) {
            let rootTitle: string | undefined = undefined;
            const key = card.stackGroup || card.threadId;
            if (key) {
              const root = sub.cards.find(c => (c.stackGroup === key || c.threadId === key) && c !== card);
              if (root) rootTitle = root.text;
            }

            cardsToMoveToArchive.push({
              subjectName: sub.name,
              originalCategory: cat.name,
              card: {
                ...card,
                archived: true,
                originalCategory: cat.name,
                originalSubject: sub.name,
                originalTopic: rootTitle || card.originalTopic
              }
            });
          } else {
            remainingCards.push(card);
            const key = card.stackGroup || card.threadId;
            if (key) {
              if (!groups[key]) groups[key] = [];
              groups[key].push(card);
            }
          }
        });

        const rootCards = new Set<string>();
        const unarchiveCards = new Set<string>();

        Object.values(groups).forEach(g => {
          if (g.length > 1) {
            g.sort((a, b) => {
              if (a.archived && !b.archived) return -1;
              if (!a.archived && b.archived) return 1;
              const timeDiff = new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
              if (timeDiff !== 0) return timeDiff;
              return (a.ordering || 0) - (b.ordering || 0);
            });
            // Root topic container: kept archived so the bare name isn't an active prayer card
            rootCards.add(g[0].createdDate + g[0].text);
            // All updates: keep active unless the user explicitly archived them!
            for (let i = 1; i < g.length; i++) {
              if (!g[i].userArchived) {
                unarchiveCards.add(g[i].createdDate + g[i].text);
              }
            }
          }
        });

        const updatedCards = remainingCards.map(c => {
          const id = c.createdDate + c.text;
          if (rootCards.has(id)) {
            return { ...c, archived: true };
          }
          if (unarchiveCards.has(id)) {
            return { ...c, archived: false, archivedDate: undefined };
          }
          return c;
        });

        return { ...sub, cards: updatedCards };
      })
    };
  });

  // Automatically move any previously user-archived cards to Archive category
  if (cardsToMoveToArchive.length > 0) {
    let archiveCat = cleanedCategories.find(c => c.name.toLowerCase() === 'archive');
    if (!archiveCat) {
      archiveCat = {
        name: 'Archive',
        ordering: 999,
        createdDate: new Date().toISOString(),
        subjects: []
      };
      cleanedCategories.push(archiveCat);
    }

    cardsToMoveToArchive.forEach(({ subjectName, card }) => {
      let archiveSub = archiveCat!.subjects.find(s => normalizeName(s.name) === normalizeName(subjectName));
      if (!archiveSub) {
        archiveSub = {
          name: subjectName,
          ordering: archiveCat!.subjects.length,
          createdDate: new Date().toISOString(),
          cards: []
        };
        archiveCat!.subjects.push(archiveSub);
      }
      if (!archiveSub.cards.some(c => c.createdDate === card.createdDate && c.text === card.text)) {
        archiveSub.cards.unshift(card);
      }
    });
  }

  return cleanedCategories;
}

/**
 * Moves a card (or an entire thread if the root card is selected) to the Archive category.
 */
export function moveCardsToArchive(
  categories: PrayerCategory[],
  subjectName: string,
  card: PrayerCard
): { updatedCategories: PrayerCategory[]; archivedCards: PrayerCard[] } {
  const nowIso = new Date().toISOString();
  const key = card.stackGroup || card.threadId;
  const normTargetSubject = normalizeName(subjectName);

  // Find if this card is the root card of a multi-card thread
  let isRootOfThread = false;
  let rootCardTitle: string | undefined = undefined;
  let threadCardsList: PrayerCard[] = [];

  for (const cat of categories) {
    if (cat.name.toLowerCase() === 'archive') continue;
    const sub = cat.subjects.find(s => normalizeName(s.name) === normTargetSubject);
    if (sub && key) {
      const threadCards = sub.cards.filter(c => (c.stackGroup === key || c.threadId === key));
      if (threadCards.length > 1) {
        threadCards.sort((a, b) => {
          if (a.archived && !b.archived) return -1;
          if (!a.archived && b.archived) return 1;
          const timeDiff = new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
          if (timeDiff !== 0) return timeDiff;
          return (a.ordering || 0) - (b.ordering || 0);
        });
        threadCardsList = threadCards;
        rootCardTitle = threadCards[0].text;
        if (threadCards[0].createdDate === card.createdDate && threadCards[0].text.trim() === card.text.trim()) {
          isRootOfThread = true;
        }
      }
      break;
    }
  }

  const cardsToArchive: PrayerCard[] = [];

  const updatedCategories = categories.map(cat => {
    // Never extract cards from Archive category
    if (cat.name.toLowerCase() === 'archive') return cat;

    const updatedSubjects = cat.subjects.map(sub => {
      if (normalizeName(sub.name) === normTargetSubject) {
        const remainingCards: PrayerCard[] = [];
        sub.cards.forEach(c => {
          const isTargetCard = c.createdDate === card.createdDate && c.text.trim() === card.text.trim();
          const isThreadCard = isRootOfThread && key && (c.stackGroup === key || c.threadId === key);

          if (isTargetCard || isThreadCard) {
            const isRootCardItself = threadCardsList.length > 0 && 
              c.createdDate === threadCardsList[0].createdDate && 
              c.text.trim() === threadCardsList[0].text.trim();
            const originalTopic = (!isRootCardItself && rootCardTitle) 
              ? rootCardTitle 
              : (c.originalTopic || undefined);

            cardsToArchive.push({
              ...c,
              archived: true,
              userArchived: true,
              archivedDate: nowIso,
              originalCategory: cat.name,
              originalSubject: sub.name,
              originalTopic
            });
          } else {
            remainingCards.push(c);
          }
        });
        return { ...sub, cards: remainingCards };
      }
      return sub;
    });
    return { ...cat, subjects: updatedSubjects };
  });

  // Target Archive Category
  let archiveCat = updatedCategories.find(c => c.name.toLowerCase() === 'archive');
  if (!archiveCat) {
    archiveCat = {
      name: 'Archive',
      ordering: 999,
      createdDate: nowIso,
      visible: true,
      subjects: []
    };
    updatedCategories.push(archiveCat);
  }
  archiveCat.visible = true;

  let archiveSub = archiveCat.subjects.find(s => normalizeName(s.name) === normTargetSubject);
  if (!archiveSub) {
    archiveSub = {
      name: subjectName,
      ordering: archiveCat.subjects.length,
      createdDate: nowIso,
      cards: []
    };
    archiveCat.subjects.push(archiveSub);
  }

  // Prepend newly archived cards into the Archive subject
  cardsToArchive.forEach(c => {
    if (!archiveSub!.cards.some(existing => existing.createdDate === c.createdDate && existing.text.trim() === c.text.trim())) {
      archiveSub!.cards.unshift(c);
    }
  });

  return { updatedCategories, archivedCards: cardsToArchive };
}

/**
 * Adds a new card to a subject.
 */
export function addNewCard(
  categories: PrayerCategory[],
  subjectName: string,
  text: string
): { updatedCategories: PrayerCategory[]; newCard: PrayerCard | null } {
  if (!text.trim()) return { updatedCategories: categories, newCard: null };
  const nowIso = new Date().toISOString();
  const newCard: PrayerCard = {
    text: text.trim(),
    ordering: 0,
    createdDate: nowIso,
    archived: false,
    seenCount: 0,
    isMarkdown: false
  };

  const normTargetSubject = normalizeName(subjectName);

  const updatedCategories = categories.map(cat => {
    const updatedSubjects = cat.subjects.map(sub => {
      if (normalizeName(sub.name) === normTargetSubject) {
        return {
          ...sub,
          cards: [...sub.cards, newCard]
        };
      }
      return sub;
    });
    return { ...cat, subjects: updatedSubjects };
  });

  return { updatedCategories, newCard };
}

/**
 * Adds a thread update card (sub-prayer) to a parent card. If the parent was standalone,
 * groups both cards with shared stackGroup & threadId, and sets parent card archived: true.
 */
export function addCardUpdate(
  categories: PrayerCategory[],
  subjectName: string,
  parentCard: PrayerCard,
  newText: string
): { updatedCategories: PrayerCategory[]; newCard: PrayerCard | null } {
  if (!newText.trim()) return { updatedCategories: categories, newCard: null };
  const nowIso = new Date().toISOString();
  const stackGroupId = parentCard.stackGroup || crypto.randomUUID();
  const threadId = parentCard.threadId || crypto.randomUUID();

  const newCard: PrayerCard = {
    text: newText.trim(),
    ordering: (parentCard.ordering || 0) + 1,
    createdDate: nowIso,
    stackGroup: stackGroupId,
    threadId,
    archived: false,
    seenCount: 0,
    isMarkdown: false
  };

  const normTargetSubject = normalizeName(subjectName);

  const updatedCategories = categories.map(cat => {
    const updatedSubjects = cat.subjects.map(sub => {
      if (normalizeName(sub.name) === normTargetSubject) {
        const updatedCards = sub.cards.map(c => {
          if (c.createdDate === parentCard.createdDate && c.text.trim() === parentCard.text.trim()) {
            return {
              ...c,
              stackGroup: stackGroupId,
              threadId,
              archived: true
            };
          }
          return c;
        });
        return {
          ...sub,
          cards: [...updatedCards, newCard]
        };
      }
      return sub;
    });
    return { ...cat, subjects: updatedSubjects };
  });

  return { updatedCategories, newCard };
}

/**
 * Restores / Unarchives a card from Archive category back to its original category & subject.
 */
export function unarchiveCard(
  categories: PrayerCategory[],
  subjectName: string,
  card: PrayerCard
): { updatedCategories: PrayerCategory[]; restoredCard: PrayerCard } {
  const nowIso = new Date().toISOString();
  const targetCategoryName = card.originalCategory || 'Supplication';
  const targetSubjectName = card.originalSubject || subjectName;
  const normArchiveSubject = normalizeName(subjectName);
  const normTargetCategory = normalizeName(targetCategoryName);
  const normTargetSubject = normalizeName(targetSubjectName);

  // 1. Remove card from Archive category
  const updatedCategories = categories.map(cat => {
    if (cat.name.toLowerCase() === 'archive') {
      return {
        ...cat,
        subjects: cat.subjects.map(sub => {
          if (normalizeName(sub.name) === normArchiveSubject) {
            return {
              ...sub,
              cards: sub.cards.filter(c => !(c.createdDate === card.createdDate && c.text.trim() === card.text.trim()))
            };
          }
          return sub;
        })
      };
    }
    return cat;
  });

  // 2. Restore card to target category and subject
  const restoredCard: PrayerCard = {
    ...card,
    archived: false,
    userArchived: false,
    archivedDate: undefined
  };

  let targetCat = updatedCategories.find(c => normalizeName(c.name) === normTargetCategory);
  if (!targetCat) {
    targetCat = {
      name: targetCategoryName,
      ordering: updatedCategories.length,
      createdDate: nowIso,
      visible: true,
      subjects: []
    };
    updatedCategories.push(targetCat);
  }

  let targetSub = targetCat.subjects.find(s => normalizeName(s.name) === normTargetSubject);
  if (!targetSub) {
    targetSub = {
      name: targetSubjectName,
      ordering: targetCat.subjects.length,
      createdDate: nowIso,
      cards: []
    };
    targetCat.subjects.push(targetSub);
  }

  // Add back into subject
  targetSub.cards.unshift(restoredCard);

  return { updatedCategories, restoredCard };
}
