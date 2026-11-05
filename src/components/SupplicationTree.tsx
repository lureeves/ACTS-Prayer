import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  History, 
  Archive, 
  PlusCircle, 
  Calendar, 
  Eye, 
  CheckCircle,
  Sparkles,
  ArrowRight,
  Settings2,
  RotateCcw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PrayerSubject, PrayerCard, ScheduleCadenceType, EveryNWeeksSchedule, TopicPriority } from '../types/prayer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TopicScheduleModal } from './TopicScheduleModal';
import { BatchPrayersModal } from './BatchPrayersModal';
import { formatSubjectSchedule, getSubjectPriority } from '../services/scheduler';

interface SupplicationTreeProps {
  subjects: PrayerSubject[];
  onArchiveCard: (subjectName: string, card: PrayerCard) => void;
  onUnarchiveCard?: (subjectName: string, card: PrayerCard) => void;
  onAddCardUpdate: (subjectName: string, parentCard: PrayerCard, newText: string) => void;
  onAddNewCard: (subjectName: string, text: string) => void;
  onAddNewTopic?: (topicName: string) => void;
  onUpdateSchedule?: (
    subjectName: string,
    schedule: {
      schedulingMode: number;
      scheduleType?: ScheduleCadenceType;
      dayOfTheWeekMask?: number;
      everyNWeeks?: EveryNWeeksSchedule;
      daysOfMonth?: number[];
      priority?: TopicPriority;
      priorityLevel?: number;
      sessionCardLimit?: number;
      cardSelectionMode?: 'sequential' | 'random';
      cardRotationOffset?: number;
    }
  ) => void;
}

export const SupplicationTree: React.FC<SupplicationTreeProps> = ({
  subjects,
  onArchiveCard,
  onUnarchiveCard,
  onAddCardUpdate,
  onAddNewCard,
  onAddNewTopic,
  onUpdateSchedule
}) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
    [subjects[0]?.name || '']: true
  });
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [newCardInput, setNewCardInput] = useState<Record<string, string>>({});
  const [updateInput, setUpdateInput] = useState<{ [key: string]: string }>({});
  const [activeUpdateCard, setActiveUpdateCard] = useState<string | null>(null);
  const [schedulingSubject, setSchedulingSubject] = useState<PrayerSubject | null>(null);
  const [batchingSubject, setBatchingSubject] = useState<PrayerSubject | null>(null);
  const [newTopicName, setNewTopicName] = useState<string>('');

  const toggleSubject = (name: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const toggleThread = (groupId: string) => {
    setExpandedThreads(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Group cards within a subject by stackGroup or threadId, or treat standalone cards as individual stacks
  const groupCards = (cards: PrayerCard[]) => {
    const groups: { [key: string]: PrayerCard[] } = {};

    cards.forEach((card, idx) => {
      const key = card.stackGroup || card.threadId || `card-${card.createdDate}-${idx}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    });

    // Sort cards inside groups chronologically by createdDate
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());
    });

    return groups;
  };

  return (
    <div className="space-y-4">
      {subjects.map(subject => {
        const isExpanded = !!expandedSubjects[subject.name];
        const groups = groupCards(subject.cards);
        const activeCardsCount = subject.cards.filter(c => !c.archived).length;

        return (
          <div
            key={subject.name}
            className="border border-neutral-800 bg-neutral-900/60 rounded-2xl overflow-hidden transition-all duration-200 hover:border-neutral-700/80"
          >
            {/* Subject Header */}
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
                    {(() => {
                      const priority = getSubjectPriority(subject);
                      if (priority === 'high') {
                        return (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                            <ArrowUp className="w-2.5 h-2.5" /> High
                          </span>
                        );
                      }
                      if (priority === 'low') {
                        return (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1">
                            <ArrowDown className="w-2.5 h-2.5" /> Low
                          </span>
                        );
                      }
                      return null;
                    })()}

                    {/* Batch Limit Badge */}
                    {subject.sessionCardLimit && subject.sessionCardLimit > 0 && (
                      <span 
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-medium"
                        title={`Showing ${subject.sessionCardLimit} cards/people per session (${subject.cardSelectionMode === 'random' ? 'Random' : 'Sequential'})`}
                      >
                        <Layers className="w-2.5 h-2.5" />
                        {subject.sessionCardLimit} / session ({subject.cardSelectionMode === 'random' ? 'Rand' : 'Seq'})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {activeCardsCount} active requests
                    {subject.sessionCardLimit && subject.sessionCardLimit > 0 && (
                      <span className="text-neutral-500"> • {subject.sessionCardLimit} per session ({subject.cardSelectionMode === 'random' ? 'random' : 'sequential'})</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Schedule Cadence Badge & Configuration Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSchedulingSubject(subject);
                  }}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                    subject.schedulingMode === 1
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25 shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700/60 hover:text-neutral-200 hover:border-neutral-600'
                  }`}
                  title="Configure topic frequency & schedule"
                >
                  <Calendar className="w-3 h-3" />
                  <span>{formatSubjectSchedule(subject)}</span>
                  <Settings2 className="w-2.5 h-2.5 opacity-60" />
                </button>

                {/* Batch Prayers Button */}
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

                <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                  {subject.cards.length} cards
                </span>
              </div>
            </div>

            {/* Subject Content */}
            {isExpanded && (
              <div className="p-4 pt-1 border-t border-neutral-800/80 bg-neutral-950/40 space-y-3">
                {Object.keys(groups).length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-2">No active requests in this topic.</p>
                ) : (
                  Object.entries(groups).map(([groupId, cardStack]) => {
                    const rootCard = cardStack[0];
                    const updates = cardStack.length > 1 ? cardStack.slice(1).filter(c => !c.archived) : [];
                    const isThreadExpanded = !!expandedThreads[groupId];
                    const hasUpdates = updates.length > 0;
                    const latestActiveUpdate = hasUpdates ? updates[updates.length - 1] : null;
                    const totalSeenCount = updates.reduce((sum, u) => sum + (u.seenCount || 0), rootCard.seenCount || 0);

                    return (
                      <div
                        key={groupId}
                        className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                          isThreadExpanded 
                            ? 'border-neutral-700 bg-neutral-900 shadow-md' 
                            : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700/80 hover:bg-neutral-900/90'
                        }`}
                      >
                        {/* Topic Header on Top - Clicking reveals inner updates if hasUpdates */}
                        <div
                          onClick={hasUpdates ? () => toggleThread(groupId) : undefined}
                          className={`p-3.5 sm:p-4 select-none flex items-start justify-between gap-3 transition-colors ${
                            hasUpdates 
                              ? 'cursor-pointer hover:bg-neutral-800/40' 
                              : 'cursor-default'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Chevron only shown if this topic has updates */}
                            {hasUpdates && (
                              <div className="p-1 rounded-lg bg-neutral-800 text-neutral-400 mt-0.5 shrink-0">
                                {isThreadExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-neutral-200" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                                )}
                              </div>
                            )}

                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-neutral-100 tracking-tight">
                                  {rootCard.text}
                                </h4>

                                {hasUpdates && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    {updates.length} {updates.length === 1 ? 'update' : 'updates'}
                                  </span>
                                )}

                                {!hasUpdates && rootCard.archived && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                                    Archived
                                  </span>
                                )}

                                <span className="text-[11px] text-neutral-500 font-mono">
                                  Prayed {totalSeenCount} {totalSeenCount === 1 ? 'time' : 'times'}
                                </span>
                              </div>

                              {/* When collapsed and updates exist, show preview of latest update */}
                              {!isThreadExpanded && latestActiveUpdate && (
                                <p className="text-xs text-neutral-400 truncate flex items-center gap-1.5 pt-0.5">
                                  <span className="text-[10px] font-semibold text-sky-400/90 uppercase tracking-wider shrink-0">
                                    Latest:
                                  </span>
                                  <span className="text-neutral-300 truncate">{latestActiveUpdate.text}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons: Archive, + Update */}
                          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                            {!hasUpdates && !rootCard.archived && (
                              <button
                                onClick={() => onArchiveCard(subject.name, rootCard)}
                                title="Archive & Celebrate in Thanksgiving"
                                className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-700/50 border border-neutral-700/60 text-neutral-300 flex items-center gap-1 transition-all"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Archive</span>
                              </button>
                            )}

                            {hasUpdates && (
                              <>
                                <button
                                  onClick={() => onArchiveCard(subject.name, rootCard)}
                                  title="Archive entire topic"
                                  className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-700/50 border border-neutral-700/60 text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition-all"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Archive Topic</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setExpandedThreads(prev => ({ ...prev, [groupId]: true }));
                                    setActiveUpdateCard(activeUpdateCard === groupId ? null : groupId);
                                  }}
                                  title="Add update to this topic"
                                  className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1 transition-all"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Update</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* REVEALED INNER UPDATES - ONLY IF hasUpdates */}
                        {hasUpdates && isThreadExpanded && (
                          <div className="p-4 pt-2 border-t border-neutral-800/80 bg-neutral-950/70 space-y-3 animate-fadeIn">
                            <div className="space-y-2.5">
                              {updates.map((updateCard, uIdx) => {
                                const isArchived = !!updateCard.archived;

                                return (
                                  <div
                                    key={updateCard.createdDate + uIdx}
                                    className={`p-3.5 rounded-xl border transition-all ${
                                      isArchived
                                        ? 'bg-neutral-950/40 border-neutral-800/60 opacity-60'
                                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2 gap-2 flex-wrap">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                          isArchived
                                            ? 'bg-neutral-800 text-neutral-400'
                                            : 'bg-neutral-800 text-neutral-300'
                                        }`}>
                                          Update #{uIdx + 1}
                                        </span>
                                        <span>{new Date(updateCard.createdDate).toLocaleDateString()}</span>
                                        {isArchived && (
                                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                                            Archived
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2.5">
                                        <span className="font-mono text-[10px] text-neutral-400">
                                          Prayed {updateCard.seenCount || 0} {updateCard.seenCount === 1 ? 'time' : 'times'}
                                        </span>

                                        {/* Dedicated Archive Button for each update */}
                                        {!isArchived ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onArchiveCard(subject.name, updateCard);
                                            }}
                                            title="Archive this update (record in Thanksgiving)"
                                            className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-700/50 border border-neutral-700/60 text-neutral-300 flex items-center gap-1 transition-all"
                                          >
                                            <Archive className="w-3.5 h-3.5 text-neutral-400 hover:text-emerald-300" />
                                            <span>Archive</span>
                                          </button>
                                        ) : onUnarchiveCard ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onUnarchiveCard(subject.name, updateCard);
                                            }}
                                            title="Restore / Unarchive this update"
                                            className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60 flex items-center gap-1 transition-all"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                                            <span>Unarchive</span>
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>

                                    {/* Clean, readable text - NEVER crossed out! */}
                                    <div className={`text-xs sm:text-sm leading-relaxed ${isArchived ? 'text-neutral-400' : 'text-neutral-100 font-medium'}`}>
                                      <MarkdownRenderer content={updateCard.text} isMarkdown={updateCard.isMarkdown} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Add Next Update Inline Form */}
                            <div className="pt-2 border-t border-neutral-800/80 flex gap-2">
                              <input
                                type="text"
                                placeholder={`Add next prayer update for ${rootCard.text}...`}
                                value={updateInput[groupId] || ''}
                                onChange={e => setUpdateInput({ ...updateInput, [groupId]: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && updateInput[groupId]?.trim()) {
                                    onAddCardUpdate(subject.name, rootCard, updateInput[groupId].trim());
                                    setUpdateInput({ ...updateInput, [groupId]: '' });
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-neutral-100 focus:outline-none focus:border-sky-500"
                              />
                              <button
                                onClick={() => {
                                  if (updateInput[groupId]?.trim()) {
                                    onAddCardUpdate(subject.name, rootCard, updateInput[groupId].trim());
                                    setUpdateInput({ ...updateInput, [groupId]: '' });
                                  }
                                }}
                                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Post Update</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Add new card to this subject */}
                <div className="pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Add prayer request to ${subject.name}...`}
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
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add New Topic to Supplication */}
      {onAddNewTopic && (
        <div className="p-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 transition-all">
          <h4 className="text-xs font-semibold text-neutral-300 mb-2 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-sky-400" />
            Add New Topic to Supplication
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Topic name (e.g. Extended Family, Workplace, Neighbors)..."
              value={newTopicName}
              onChange={e => setNewTopicName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTopicName.trim()) {
                  onAddNewTopic(newTopicName.trim());
                  setExpandedSubjects(prev => ({ ...prev, [newTopicName.trim()]: true }));
                  setNewTopicName('');
                }
              }}
              className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
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
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Topic
            </button>
          </div>
        </div>
      )}

      {/* Topic Scheduling Modal */}
      <TopicScheduleModal
        isOpen={!!schedulingSubject}
        onClose={() => setSchedulingSubject(null)}
        subject={schedulingSubject}
        onSaveSchedule={(name, sched) => {
          if (onUpdateSchedule) {
            onUpdateSchedule(name, sched);
          }
        }}
      />

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
