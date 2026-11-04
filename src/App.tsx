import { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Settings as SettingsIcon, 
  Plus, 
  Sparkles, 
  Flame,
  Laptop,
  Globe,
  FileCheck,
  Archive,
  HeartHandshake,
  X,
  Cloud
} from 'lucide-react';
import { PrayerData, AppSettings, PrayerCard, PrayerSubject, PrayerCategory, ScheduleCadenceType, EveryNWeeksSchedule, TopicPriority } from './types/prayer';
import { loadPrayerData, savePrayerData, loadSettings, saveSettings, isTauriEnvironment } from './services/storage';
import { generateSessionPlan, syncDailyRotation, getLocalDateString } from './services/scheduler';
import { GuidedSessionModal } from './components/GuidedSessionModal';
import { SettingsModal } from './components/SettingsModal';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { SupplicationTree } from './components/SupplicationTree';
import { CategoryCardsView } from './components/CategoryCardsView';
import { ArchiveToThanksgivingModal } from './components/ArchiveToThanksgivingModal';
import { DEFAULT_PRAYER_DATA } from './data/defaultData';

function sanitizeThreadUpdates(categories: PrayerCategory[]): PrayerCategory[] {
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
            g.sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());
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
      let archiveSub = archiveCat!.subjects.find(s => s.name.trim().toLowerCase() === subjectName.trim().toLowerCase());
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

function moveCardsToArchive(
  categories: PrayerCategory[],
  subjectName: string,
  card: PrayerCard
): { updatedCategories: PrayerCategory[]; archivedCards: PrayerCard[] } {
  const nowIso = new Date().toISOString();
  const key = card.stackGroup || card.threadId;
  const norm = (str?: string) => (str || '').trim().toLowerCase().replace(/[\u2018\u2019']/g, "'");
  const normTargetSubject = norm(subjectName);

  // Find if this card is the root card of a multi-card thread
  let isRootOfThread = false;
  let rootCardTitle: string | undefined = undefined;

  for (const cat of categories) {
    if (cat.name.toLowerCase() === 'archive') continue;
    const sub = cat.subjects.find(s => norm(s.name) === normTargetSubject);
    if (sub && key) {
      const threadCards = sub.cards.filter(c => (c.stackGroup === key || c.threadId === key));
      if (threadCards.length > 1) {
        threadCards.sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());
        if (threadCards[0].createdDate === card.createdDate && threadCards[0].text.trim() === card.text.trim()) {
          isRootOfThread = true;
        } else {
          rootCardTitle = threadCards[0].text;
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
      if (norm(sub.name) === normTargetSubject) {
        const remainingCards: PrayerCard[] = [];
        sub.cards.forEach(c => {
          const isTargetCard = (c.createdDate === card.createdDate && c.text.trim() === card.text.trim()) || 
                               (c.createdDate === card.createdDate);
          const isThreadCard = isRootOfThread && key && (c.stackGroup === key || c.threadId === key);

          if (isTargetCard || isThreadCard) {
            cardsToArchive.push({
              ...c,
              archived: true,
              userArchived: true,
              archivedDate: nowIso,
              originalCategory: cat.name,
              originalSubject: sub.name,
              originalTopic: (!isRootOfThread && rootCardTitle) ? rootCardTitle : (c.originalTopic || undefined)
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

  let archiveSub = archiveCat.subjects.find(s => norm(s.name) === normTargetSubject);
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

export function App() {
  const [prayerData, setPrayerData] = useState<PrayerData | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [activeTab, setActiveTab] = useState<string>('Supplication');
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState<boolean>(false);
  const [pendingArchiveCard, setPendingArchiveCard] = useState<{ subjectName: string; card: PrayerCard } | null>(null);
  const [archiveToast, setArchiveToast] = useState<{ subjectName: string; card: PrayerCard; text: string } | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'synced' | 'saving'>('synced');

  // Auto-dismiss archive toast notification after 5 seconds
  useEffect(() => {
    if (!archiveToast) return;
    const timer = setTimeout(() => {
      setArchiveToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [archiveToast]);

  // Load state on launch and automatically sync daily rotation
  useEffect(() => {
    async function init() {
      const { data, filePath } = await loadPrayerData(settings.filePath);
      data.Categories = sanitizeThreadUpdates(data.Categories);

      // Ensure Archive category is visible and remove legacy overrides
      data.Categories.forEach(cat => {
        if (cat.name.toLowerCase() === 'archive') {
          cat.visible = true;
        }
        cat.subjects.forEach(sub => {
          if (sub.name.trim().toLowerCase() === 'day' && sub.priorityLevel) {
            delete sub.priorityLevel;
            sub.priority = 'medium';
          } else if (sub.priorityLevel === 10000) {
            delete sub.priorityLevel;
            sub.priority = 'medium';
          }
        });
      });

      // Auto-sync Friends list if loaded data has outdated placeholder
      const supp = data.Categories.find(c => c.name.toLowerCase() === 'supplication');
      const friends = supp?.subjects.find(s => s.name.trim().toLowerCase() === 'friends');
      if (friends && !friends.cards.some(c => c.text === 'Luke Larco')) {
        const defaultSupp = DEFAULT_PRAYER_DATA.Categories.find(c => c.name.toLowerCase() === 'supplication');
        const defaultFriends = defaultSupp?.subjects?.find(s => s.name.trim().toLowerCase() === 'friends');
        if (defaultFriends && defaultFriends.cards.length > 0) {
          friends.cards = defaultFriends.cards;
          await savePrayerData(data, settings.filePath);
        }
      }

      const { rotation: updatedRotation, changed } = syncDailyRotation(
        data.Metadata.dailyRotation,
        new Date(),
        settings.supplicationTopicsLimit || 3
      );
      if (changed) {
        data.Metadata.dailyRotation = updatedRotation;
        await savePrayerData(data, settings.filePath);
      }
      setPrayerData(data);
      setCurrentFilePath(filePath);
    }
    init();
  }, [settings.filePath, settings.supplicationTopicsLimit]);

  // Synchronize state changes to local JSON file
  const persistState = useCallback(async (updatedData: PrayerData) => {
    setPrayerData(updatedData);
    setSaveStatus('saving');
    try {
      await savePrayerData(updatedData, settings.filePath);
      setTimeout(() => setSaveStatus('synced'), 400);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('synced');
    }
  }, [settings.filePath]);

  // Automatic daily rotation check (advances at midnight or when awakening after a new day)
  useEffect(() => {
    if (!prayerData) return;

    const checkDayTransition = () => {
      const { rotation: updatedRotation, changed } = syncDailyRotation(
        prayerData.Metadata.dailyRotation,
        new Date(),
        settings.supplicationTopicsLimit || 3
      );
      if (changed) {
        const updatedData = {
          ...prayerData,
          Metadata: {
            ...prayerData.Metadata,
            dailyRotation: updatedRotation
          }
        };
        persistState(updatedData);
      }
    };

    // Check every 20 seconds to smoothly catch midnight transitions or laptop wake
    const intervalId = window.setInterval(checkDayTransition, 20000);
    return () => clearInterval(intervalId);
  }, [prayerData, settings.supplicationTopicsLimit, persistState]);

  // Reactive runtime sync for Friends list if active in-memory state has outdated placeholder
  useEffect(() => {
    if (!prayerData) return;
    const supp = prayerData.Categories.find(c => c.name.toLowerCase() === 'supplication');
    const friends = supp?.subjects.find(s => s.name.trim().toLowerCase() === 'friends');
    if (friends && !friends.cards.some(c => c.text === 'Luke Larco')) {
      const defaultSupp = DEFAULT_PRAYER_DATA.Categories.find(c => c.name.toLowerCase() === 'supplication');
      const defaultFriends = defaultSupp?.subjects?.find(s => s.name.trim().toLowerCase() === 'friends');
      if (defaultFriends && defaultFriends.cards.length > 0) {
        const updatedCategories = prayerData.Categories.map(cat => {
          if (cat.name.toLowerCase() === 'supplication') {
            return {
              ...cat,
              subjects: cat.subjects.map(sub => {
                if (sub.name.trim().toLowerCase() === 'friends') {
                  return {
                    ...sub,
                    cards: defaultFriends.cards
                  };
                }
                return sub;
              })
            };
          }
          return cat;
        });
        persistState({ ...prayerData, Categories: updatedCategories });
      }
    }
  }, [prayerData, persistState]);

  // Register Global Hotkey (Cmd + Shift + P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Tauri native global shortcut
    if (isTauriEnvironment()) {
      import('@tauri-apps/plugin-global-shortcut').then(({ register }) => {
        register('CommandOrControl+Shift+P', (event) => {
          if (event.state === 'Pressed') {
            setIsQuickCaptureOpen(true);
          }
        }).catch(err => console.warn('Could not register native shortcut:', err));
      }).catch(err => console.warn('Global shortcut plugin error:', err));
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!prayerData) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-400">
        <Sparkles className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm">Loading prayer journal...</p>
      </div>
    );
  }

  // Pre-generate today's session plan based on scheduling engine & daily rotation offsets
  const sessionPlan = generateSessionPlan(
    prayerData.Categories,
    new Date(),
    settings.supplicationTopicsLimit || 3,
    prayerData.Metadata.dailyRotation?.offsets
  );
  const totalSessionCards = Object.values(sessionPlan).reduce(
    (acc, topics) => acc + topics.reduce((sum, t) => sum + t.cards.length, 0),
    0
  );

  // Mark topic and its cards as prayed in session
  const handleTopicPrayed = (categoryName: string, subjectName: string, cards: PrayerCard[]) => {
    const nowIso = new Date().toISOString();
    const cardKeys = new Set(cards.map(c => c.createdDate + c.text));

    const updatedCategories = prayerData.Categories.map(cat => {
      if (cat.name.trim().toLowerCase() === categoryName.trim().toLowerCase()) {
        const updatedSubjects = cat.subjects.map(sub => {
          if (sub.name === subjectName) {
            const updatedCards = sub.cards.map(c => {
              if (cardKeys.has(c.createdDate + c.text)) {
                return {
                  ...c,
                  lastPrayed: nowIso,
                  seenCount: (c.seenCount || 0) + 1
                };
              }
              return c;
            });
            return {
              ...sub,
              lastPrayed: nowIso,
              schedulingTimestamp: nowIso,
              seenCount: (sub.seenCount || 0) + 1,
              cards: updatedCards
            };
          }
          return sub;
        });
        return { ...cat, subjects: updatedSubjects };
      }
      return cat;
    });

    // Advance session offset if user prays multiple sessions on the same day
    const currentOffsets = prayerData.Metadata.dailyRotation?.offsets || {
      Adoration: 0,
      Confession: 0,
      Thanksgiving: 0,
      Supplication: 0
    };

    // Each topic completed in session advances that category's offset by 1
    // (e.g. 1 topic for Adoration/Confession/Thanksgiving, or each of the 3 topics in Supplication)
    const newOffsets = {
      ...currentOffsets,
      [categoryName]: (currentOffsets[categoryName as keyof typeof currentOffsets] || 0) + 1
    };

    const updatedMetadata = {
      ...prayerData.Metadata,
      dailyRotation: {
        lastRotationDate: prayerData.Metadata.dailyRotation?.lastRotationDate || getLocalDateString(),
        offsets: newOffsets
      }
    };

    persistState({ ...prayerData, Categories: updatedCategories, Metadata: updatedMetadata });
  };

  // Directly archive card to Archive tab immediately upon clicking Archive
  const handleArchiveRequest = (subjectName: string, card: PrayerCard) => {
    if (!prayerData) return;
    const { updatedCategories, archivedCards } = moveCardsToArchive(prayerData.Categories, subjectName, card);
    persistState({ ...prayerData, Categories: updatedCategories });

    // Show toast notification with option to also celebrate in Thanksgiving
    const archivedItem = archivedCards[0] || card;
    setArchiveToast({
      subjectName,
      card: archivedItem,
      text: card.text
    });
  };

  // Perform Archive Only (if initiated from modal)
  const handleConfirmArchiveOnly = () => {
    setPendingArchiveCard(null);
  };

  // Add Thanksgiving card for an already-archived card
  const handleConfirmWithThanksgiving = (thanksgivingNote: string) => {
    if (!pendingArchiveCard || !prayerData) return;
    const { subjectName } = pendingArchiveCard;
    const nowIso = new Date().toISOString();

    const norm = (s: string) => s.trim().toLowerCase().replace(/[\u2018\u2019']/g, "'");
    const thanksgivingCat = prayerData.Categories.find(c => c.name.toLowerCase() === 'thanksgiving');
    if (thanksgivingCat) {
      let targetSubject = thanksgivingCat.subjects.find(s => norm(s.name) === 'answered prayers' || norm(s.name) === norm(subjectName));
      if (!targetSubject && thanksgivingCat.subjects.length > 0) {
        targetSubject = thanksgivingCat.subjects[0];
      }

      const newThanksCard: PrayerCard = {
        text: thanksgivingNote,
        ordering: 0,
        createdDate: nowIso,
        archived: false,
        seenCount: 0,
        isMarkdown: false
      };

      if (targetSubject) {
        targetSubject.cards.unshift(newThanksCard);
        persistState({ ...prayerData });
      }
    }

    setPendingArchiveCard(null);
  };

  // Add new card to a subject
  const handleAddNewCard = (subjectName: string, text: string) => {
    const nowIso = new Date().toISOString();
    const newCard: PrayerCard = {
      text,
      ordering: 0,
      createdDate: nowIso,
      archived: false,
      seenCount: 0,
      isMarkdown: false
    };

    const updatedCategories = prayerData.Categories.map(cat => {
      const updatedSubjects = cat.subjects.map(sub => {
        if (sub.name === subjectName) {
          return {
            ...sub,
            cards: [newCard, ...sub.cards]
          };
        }
        return sub;
      });
      return { ...cat, subjects: updatedSubjects };
    });

    persistState({ ...prayerData, Categories: updatedCategories });
  };

  // Add thread update card to a stack
  const handleAddCardUpdate = (subjectName: string, parentCard: PrayerCard, newText: string) => {
    const nowIso = new Date().toISOString();
    const stackGroupId = parentCard.stackGroup || crypto.randomUUID();
    const threadId = parentCard.threadId || crypto.randomUUID();

    const newCard: PrayerCard = {
      text: newText,
      ordering: (parentCard.ordering || 0) + 1,
      createdDate: nowIso,
      stackGroup: stackGroupId,
      threadId,
      archived: false,
      seenCount: 0,
      isMarkdown: false
    };

    const updatedCategories = prayerData.Categories.map(cat => {
      const updatedSubjects = cat.subjects.map(sub => {
        if (sub.name === subjectName) {
          // If parent wasn't grouped yet, group it without archiving older updates
          const updatedCards = sub.cards.map(c => {
            if (c.createdDate === parentCard.createdDate) {
              return {
                ...c,
                stackGroup: stackGroupId,
                threadId
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

    persistState({ ...prayerData, Categories: updatedCategories });
  };

  // Restore / Unarchive Card from Archive category back to active category & subject
  const handleUnarchiveCard = (subjectName: string, card: PrayerCard) => {
    if (!prayerData) return;
    const nowIso = new Date().toISOString();
    const norm = (str?: string) => (str || '').trim().toLowerCase().replace(/[\u2018\u2019']/g, "'");

    const targetCategoryName = card.originalCategory || 'Supplication';
    const targetSubjectName = card.originalSubject || subjectName;

    // 1. Remove card from Archive category
    const updatedCategories = prayerData.Categories.map(cat => {
      if (cat.name.toLowerCase() === 'archive') {
        return {
          ...cat,
          subjects: cat.subjects.map(sub => {
            if (norm(sub.name) === norm(subjectName)) {
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

    let targetCat = updatedCategories.find(c => c.name.trim().toLowerCase() === targetCategoryName.trim().toLowerCase());
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

    let targetSub = targetCat.subjects.find(s => norm(s.name) === norm(targetSubjectName));
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

    persistState({ ...prayerData, Categories: updatedCategories });
  };

  // Add new topic / subject to a category
  const handleAddNewTopic = (categoryName: string, topicName: string) => {
    if (!topicName.trim() || !prayerData) return;
    const nowIso = new Date().toISOString();

    const updatedCategories = prayerData.Categories.map(cat => {
      if (cat.name.trim().toLowerCase() === categoryName.trim().toLowerCase()) {
        const maxOrdering = cat.subjects.reduce((max, s) => Math.max(max, s.ordering || 0), 0);
        const newSubject: PrayerSubject = {
          name: topicName.trim(),
          ordering: maxOrdering + 1,
          createdDate: nowIso,
          priorityLevel: 0,
          schedulingMode: 0,
          seenCount: 0,
          cards: []
        };
        return {
          ...cat,
          subjects: [...cat.subjects, newSubject]
        };
      }
      return cat;
    });

    persistState({ ...prayerData, Categories: updatedCategories });
  };

  // Update scheduling configuration for a topic / subject
  const handleUpdateTopicSchedule = (
    categoryName: string,
    subjectName: string,
    schedule: {
      schedulingMode: number;
      scheduleType?: ScheduleCadenceType;
      dayOfTheWeekMask?: number;
      everyNWeeks?: EveryNWeeksSchedule;
      daysOfMonth?: number[];
      priority?: TopicPriority;
      priorityLevel?: number;
    }
  ) => {
    if (!prayerData) return;
    const normalize = (s: string) => s.trim().toLowerCase().replace(/[\u2018\u2019']/g, '');
    const targetNormalized = normalize(subjectName);
    const updatedCategories = prayerData.Categories.map(cat => {
      if (cat.name.trim().toLowerCase() === categoryName.trim().toLowerCase()) {
        const updatedSubjects = cat.subjects.map(sub => {
          if (normalize(sub.name) === targetNormalized) {
            return {
              ...sub,
              ...schedule
            };
          }
          return sub;
        });
        return { ...cat, subjects: updatedSubjects };
      }
      return cat;
    });

    persistState({ ...prayerData, Categories: updatedCategories });
  };
  const handleQuickCapture = (categoryName: string, subjectName: string, text: string, isMarkdown: boolean) => {
    const nowIso = new Date().toISOString();
    const newCard: PrayerCard = {
      text,
      ordering: 0,
      createdDate: nowIso,
      archived: false,
      seenCount: 0,
      isMarkdown
    };

    let updatedCategories = [...prayerData.Categories];
    let cat = updatedCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

    if (!cat) {
      cat = {
        name: categoryName,
        ordering: updatedCategories.length + 1,
        createdDate: nowIso,
        visible: true,
        subjects: []
      };
      updatedCategories.push(cat);
    }

    let sub = cat.subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
    if (!sub) {
      sub = {
        name: subjectName,
        ordering: cat.subjects.length + 1,
        createdDate: nowIso,
        cards: []
      };
      cat.subjects.unshift(sub);
    }

    sub.cards.unshift(newCard);
    persistState({ ...prayerData, Categories: updatedCategories });
  };

  const activeCategory = prayerData.Categories.find(c => c.name.toLowerCase() === activeTab.toLowerCase());
  const isTauri = isTauriEnvironment();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navbar - Reformatted for half-screen and split-view macOS windows */}
      <header className="titlebar-drag-region sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-4 sm:px-6 py-2.5 space-y-2">
        {/* Top Row: App Branding + Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: App Title & Status */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-neutral-950 font-bold shadow-sm shadow-amber-500/20 shrink-0">
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-neutral-100 whitespace-nowrap">ACTS Prayer</h1>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-neutral-800 text-neutral-400 inline-flex items-center gap-1">
                  {isTauri ? <Laptop className="w-2.5 h-2.5 text-emerald-400" /> : <Globe className="w-2.5 h-2.5 text-sky-400" />}
                  {isTauri ? 'Native' : 'Web'}
                </span>
                <span className={`text-[9px] font-mono flex items-center gap-0.5 ${
                  saveStatus === 'saving' ? 'text-amber-400 animate-pulse' : 'text-neutral-500'
                }`}>
                  <FileCheck className="w-2.5 h-2.5" />
                  {saveStatus === 'saving' ? 'Syncing' : 'Saved'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Primary Actions (Always visible on half-screen) */}
          <div className="no-drag flex items-center gap-1.5 shrink-0">
            {/* Quick Capture (Cmd+Shift+P) */}
            <button
              onClick={() => setIsQuickCaptureOpen(true)}
              title="Quick Capture (Cmd+Shift+P)"
              className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 rounded-xl text-xs font-medium flex items-center gap-1 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">New Request</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* Start ACTS Guided Session */}
            <button
              onClick={() => setIsSessionActive(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-95 whitespace-nowrap"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start Session</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 bg-neutral-950/20 rounded-full">
                {totalSessionCards}
              </span>
            </button>

            {/* iCloud Sync & Storage */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-sky-400 hover:bg-neutral-900 border border-neutral-800 transition-colors shrink-0"
              title="iCloud Drive Sync & Backups"
            >
              <Cloud className="w-4 h-4 text-sky-400" />
            </button>

            {/* Preferences */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 border border-neutral-800 transition-colors shrink-0"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Category Navigation Tabs (Comfortably spans across half screen) */}
        <div className="no-drag flex items-center justify-center">
          <nav className="flex items-center gap-0.5 bg-neutral-900/90 border border-neutral-800 p-1 rounded-xl shadow-inner w-full max-w-xl justify-between overflow-x-auto no-scrollbar">
            {['Adoration', 'Confession', 'Thanksgiving', 'Supplication', 'Archive'].map(tab => {
              const isActive = activeTab.toLowerCase() === tab.toLowerCase();
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 text-center py-1 px-1 sm:px-2 rounded-lg text-xs font-medium transition-all truncate whitespace-nowrap ${
                    isActive
                      ? 'bg-neutral-800 text-neutral-100 shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Category Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">{activeTab}</h2>
              {activeTab === 'Supplication' && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-700/80 text-xs font-mono text-neutral-300 shadow-sm"
                  title="Number of topics prompted per session (including assigned ones)"
                >
                  <span className="text-[11px] text-neutral-400 font-sans">Session Topics:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newLimit = Math.max(1, (settings.supplicationTopicsLimit || 3) - 1);
                      const newSettings = { ...settings, supplicationTopicsLimit: newLimit };
                      setSettings(newSettings);
                      saveSettings(newSettings);
                    }}
                    className="w-4 h-4 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-bold transition-colors"
                  >
                    -
                  </button>
                  <span className="font-bold text-amber-400 px-0.5">{settings.supplicationTopicsLimit || 3}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newLimit = Math.min(20, (settings.supplicationTopicsLimit || 3) + 1);
                      const newSettings = { ...settings, supplicationTopicsLimit: newLimit };
                      setSettings(newSettings);
                      saveSettings(newSettings);
                    }}
                    className="w-4 h-4 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              )}
              {activeTab !== 'Supplication' && activeCategory?.manualSessionLimit && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  Session Limit: {activeCategory.manualSessionLimit}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
              {activeTab === 'Adoration' && 'Praising God for His glorious nature, power, and sovereign majesty.'}
              {activeTab === 'Confession' && 'Repentance and confession of sin, resting in Christ’s complete redemption.'}
              {activeTab === 'Thanksgiving' && 'Giving thanks for specific answered prayers, provisions, and relationships.'}
              {activeTab === 'Supplication' && 'Interceding for family, friends, ministries, country, and personal walk.'}
              {activeTab === 'Archive' && 'Past prayer requests and historical logs.'}
            </p>
          </div>

          <div className="text-xs text-neutral-400 font-mono whitespace-nowrap self-start sm:self-auto">
            {activeCategory?.subjects.length || 0} topics • {
              activeCategory?.subjects.reduce((sum, s) => sum + s.cards.length, 0) || 0
            } total cards
          </div>
        </div>

        {/* Content View */}
        {activeCategory ? (
          activeTab === 'Supplication' ? (
            <SupplicationTree
              subjects={activeCategory.subjects}
              onArchiveCard={handleArchiveRequest}
              onUnarchiveCard={handleUnarchiveCard}
              onAddCardUpdate={handleAddCardUpdate}
              onAddNewCard={(sub, txt) => handleAddNewCard(sub, txt)}
              onAddNewTopic={(topicName) => handleAddNewTopic('Supplication', topicName)}
              onUpdateSchedule={(subName, sched) => handleUpdateTopicSchedule('Supplication', subName, sched)}
            />
          ) : (
            <CategoryCardsView
              key={activeCategory.name}
              category={activeCategory}
              onArchiveCard={handleArchiveRequest}
              onUnarchiveCard={handleUnarchiveCard}
              onAddNewCard={(sub, txt) => handleAddNewCard(sub, txt)}
              onAddNewTopic={(topicName) => handleAddNewTopic(activeCategory.name, topicName)}
            />
          )
        ) : (
          <div className="text-center py-16 text-neutral-500 text-sm">
            Category not found.
          </div>
        )}
      </main>

      {/* Toast notification after archiving */}
      {archiveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-emerald-500/50 shadow-2xl rounded-2xl p-4 flex items-center gap-3 text-sm text-neutral-200 animate-slideUp">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Archive className="w-4 h-4" />
          </div>
          <div className="max-w-xs">
            <p className="font-semibold text-neutral-100 text-xs">Moved to Archive tab</p>
            <p className="text-[11px] text-neutral-400 truncate">"{archiveToast.text}"</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => {
                setPendingArchiveCard({ subjectName: archiveToast.subjectName, card: archiveToast.card });
                setArchiveToast(null);
              }}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Celebrate</span>
            </button>
            <button
              onClick={() => setArchiveToast(null)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Guided ACTS Prayer Session Modal */}
      <GuidedSessionModal
        isOpen={isSessionActive}
        onClose={() => setIsSessionActive(false)}
        sessionPlan={sessionPlan}
        initialMinutes={settings.sessionDurationMinutes}
        autoStartTimer={settings.autoStartTimer}
        soundEnabled={settings.soundEnabled}
        onTopicPrayed={handleTopicPrayed}
      />

      {/* Preferences & Storage Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          saveSettings(newSettings);
        }}
        prayerData={prayerData}
        onImportData={persistState}
        currentFilePath={currentFilePath}
      />

      {/* Quick Capture Floating Modal (Cmd+Shift+P) */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        categories={prayerData.Categories}
        onAddCard={handleQuickCapture}
      />

      {/* Archive to Thanksgiving Answered Prayer Modal */}
      <ArchiveToThanksgivingModal
        isOpen={!!pendingArchiveCard}
        onClose={() => setPendingArchiveCard(null)}
        card={pendingArchiveCard?.card || null}
        onConfirmArchiveOnly={handleConfirmArchiveOnly}
        onConfirmWithThanksgiving={handleConfirmWithThanksgiving}
      />
    </div>
  );
}

export default App;
