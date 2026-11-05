import React, { useState } from 'react';
import { 
  Calendar, 
  Eye, 
  Archive, 
  PlusCircle, 
  Layers, 
  ChevronRight, 
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { PrayerCategory, PrayerSubject, PrayerCard } from '../types/prayer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { BatchPrayersModal } from './BatchPrayersModal';

interface CategoryCardsViewProps {
  category: PrayerCategory;
  onArchiveCard: (subjectName: string, card: PrayerCard) => void;
  onUnarchiveCard?: (subjectName: string, card: PrayerCard) => void;
  onAddNewCard: (subjectName: string, text: string) => void;
  onAddNewTopic?: (topicName: string) => void;
  onUpdateSchedule?: (
    subjectName: string,
    schedule: {
      schedulingMode?: number;
      sessionCardLimit?: number;
      cardSelectionMode?: 'sequential' | 'random';
      cardRotationOffset?: number;
    }
  ) => void;
}

export const CategoryCardsView: React.FC<CategoryCardsViewProps> = ({
  category,
  onArchiveCard,
  onUnarchiveCard,
  onAddNewCard,
  onAddNewTopic,
  onUpdateSchedule
}) => {
  const isArchiveCategory = category.name.toLowerCase() === 'archive';
  const [batchingSubject, setBatchingSubject] = useState<PrayerSubject | null>(null);

  // Expand all subjects in Archive by default so users immediately see their archived items
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(() => {
    if (isArchiveCategory) {
      const initial: Record<string, boolean> = {};
      category.subjects.forEach(s => {
        initial[s.name] = true;
      });
      return initial;
    }
    return {
      [category.subjects[0]?.name || '']: true
    };
  });
  const [newCardInput, setNewCardInput] = useState<Record<string, string>>({});
  const [newTopicName, setNewTopicName] = useState<string>('');

  const toggleSubject = (name: string) => {
    setExpandedSubjects(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const visibleSubjects = isArchiveCategory
    ? category.subjects.filter(s => s.cards.length > 0)
    : category.subjects.filter(s => !(s.isInbox && s.cards.length === 0));

  const totalCardsInArchive = isArchiveCategory
    ? category.subjects.reduce((sum, s) => sum + s.cards.length, 0)
    : 0;

  if (isArchiveCategory && totalCardsInArchive === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-12 h-12 rounded-2xl bg-neutral-800/60 border border-neutral-700/50 flex items-center justify-center mx-auto mb-3 text-neutral-400">
          <Archive className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-200">No archived prayer cards</h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
          Archived requests and updates will appear here. You can restore them back to your active list at any time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleSubjects.map(subject => {
        const isExpanded = isArchiveCategory 
          ? expandedSubjects[subject.name] !== false 
          : !!expandedSubjects[subject.name];
        const displayCards = isArchiveCategory ? subject.cards : subject.cards.filter(c => !c.archived);

        return (
          <div
            key={subject.name + subject.ordering}
            className="border border-neutral-800 bg-neutral-900/60 rounded-2xl overflow-hidden hover:border-neutral-700/80 transition-all"
          >
            {/* Header */}
            <div
              onClick={() => toggleSubject(subject.name)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-800/40 select-none transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-200 text-base">{subject.name}</h3>
                    {subject.seenCount !== undefined && !isArchiveCategory && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                        Prayed {subject.seenCount} {subject.seenCount === 1 ? 'time' : 'times'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isArchiveCategory && onUpdateSchedule && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBatchingSubject(subject);
                    }}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                      subject.sessionCardLimit && subject.sessionCardLimit > 0
                        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25 shadow-sm font-medium'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700/60 hover:text-neutral-200 hover:border-neutral-600'
                    }`}
                    title="Configure batch prayer limits (e.g. 5 at a time, sequential or random)"
                  >
                    <Layers className="w-3 h-3 text-indigo-400" />
                    <span>
                      {subject.sessionCardLimit && subject.sessionCardLimit > 0
                        ? `Batch: ${subject.sessionCardLimit} (${subject.cardSelectionMode === 'random' ? 'Rand' : 'Seq'})`
                        : 'Batch Prayers'}
                    </span>
                  </button>
                )}

                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300">
                  {displayCards.length} {isArchiveCategory ? 'archived' : 'active'}
                </span>
              </div>
            </div>

            {/* Body */}
            {isExpanded && (
              <div className="p-4 pt-1 border-t border-neutral-800/80 bg-neutral-950/40 space-y-3">
                {displayCards.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-2">
                    {isArchiveCategory ? 'No archived cards in this topic.' : 'No active cards in this subject.'}
                  </p>
                ) : (
                  displayCards.map((card, idx) => (
                    <div
                      key={card.createdDate + idx}
                      className="border border-neutral-800 bg-neutral-900/80 rounded-xl p-4 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(card.archivedDate || card.createdDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Eye className="w-3 h-3" />
                            Prayed {card.seenCount || 0} {card.seenCount === 1 ? 'time' : 'times'}
                          </span>
                          {card.originalTopic && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              Topic: {card.originalTopic}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-neutral-200 leading-relaxed font-serif">
                          <MarkdownRenderer content={card.text} isMarkdown={card.isMarkdown} />
                        </div>
                      </div>

                      {isArchiveCategory ? (
                        onUnarchiveCard && (
                          <button
                            type="button"
                            onClick={() => onUnarchiveCard(subject.name, card)}
                            title="Restore card back to active requests"
                            className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 hover:text-sky-300 text-neutral-200 flex items-center gap-1.5 transition-all self-start border border-neutral-700/60"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-neutral-400 group-hover:text-sky-300" />
                            <span>Restore</span>
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => onArchiveCard(subject.name, card)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1.5 transition-all self-start"
                        >
                          <Archive className="w-3.5 h-3.5" /> Archive
                        </button>
                      )}
                    </div>
                  ))
                )}

                {/* Add new card (hidden in Archive) */}
                {!isArchiveCategory && (
                  <div className="pt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder={`Add card to ${subject.name}...`}
                      value={newCardInput[subject.name] || ''}
                      onChange={e => setNewCardInput({ ...newCardInput, [subject.name]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newCardInput[subject.name]?.trim()) {
                          onAddNewCard(subject.name, newCardInput[subject.name].trim());
                          setNewCardInput({ ...newCardInput, [subject.name]: '' });
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => {
                        if (newCardInput[subject.name]?.trim()) {
                          onAddNewCard(subject.name, newCardInput[subject.name].trim());
                          setNewCardInput({ ...newCardInput, [subject.name]: '' });
                        }
                      }}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add New Topic to Category (hidden in Archive) */}
      {!isArchiveCategory && onAddNewTopic && (
        <div className="p-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 transition-all">
          <h4 className="text-xs font-semibold text-neutral-300 mb-2 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-amber-400" />
            Add New Topic to {category.name}
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Topic name for ${category.name} (e.g. "Work", "Community", "Faithfulness")...`}
              value={newTopicName}
              onChange={e => setNewTopicName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTopicName.trim()) {
                  onAddNewTopic(newTopicName.trim());
                  setExpandedSubjects(prev => ({ ...prev, [newTopicName.trim()]: true }));
                  setNewTopicName('');
                }
              }}
              className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                if (newTopicName.trim()) {
                  onAddNewTopic(newTopicName.trim());
                  setExpandedSubjects(prev => ({ ...prev, [newTopicName.trim()]: true }));
                  setNewTopicName('');
                }
              }}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Topic
            </button>
          </div>
        </div>
      )}

      {/* Batch Prayers Modal */}
      <BatchPrayersModal
        isOpen={!!batchingSubject}
        onClose={() => setBatchingSubject(null)}
        subject={batchingSubject}
        onSaveBatch={(name, config) => {
          if (onUpdateSchedule) {
            onUpdateSchedule(name, {
              schedulingMode: batchingSubject?.schedulingMode ?? 0,
              ...config
            });
          }
        }}
      />
    </div>
  );
};
