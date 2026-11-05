import React, { useState, useEffect } from 'react';
import { X, Layers, ListOrdered, Shuffle, Check, Users, Sparkles, RotateCcw } from 'lucide-react';
import { PrayerSubject } from '../types/prayer';
import { getSubjectPrayerUnits } from '../services/scheduler';

interface BatchPrayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: PrayerSubject | null;
  categoryName?: string;
  onSaveBatch: (
    subjectName: string,
    config: {
      sessionCardLimit?: number;
      cardSelectionMode?: 'sequential' | 'random';
      cardRotationOffset?: number;
    }
  ) => void;
}

export const BatchPrayersModal: React.FC<BatchPrayersModalProps> = ({
  isOpen,
  onClose,
  subject,
  onSaveBatch
}) => {
  const [isBatchEnabled, setIsBatchEnabled] = useState<boolean>(false);
  const [batchLimit, setBatchLimit] = useState<number>(5);
  const [batchMode, setBatchMode] = useState<'sequential' | 'random'>('sequential');
  const [rotationOffset, setRotationOffset] = useState<number>(0);

  useEffect(() => {
    if (subject && isOpen) {
      const hasLimit = typeof subject.sessionCardLimit === 'number' && subject.sessionCardLimit > 0;
      setIsBatchEnabled(hasLimit);
      setBatchLimit(hasLimit ? subject.sessionCardLimit! : 5);
      setBatchMode(subject.cardSelectionMode || 'sequential');
      setRotationOffset(subject.cardRotationOffset || 0);
    }
  }, [subject, isOpen]);

  if (!isOpen || !subject) return null;

  const activeUnits = getSubjectPrayerUnits(subject.cards);
  const totalUnitsCount = activeUnits.length;

  const handleSave = () => {
    onSaveBatch(subject.name, {
      sessionCardLimit: isBatchEnabled && batchLimit > 0 ? Math.max(1, batchLimit) : undefined,
      cardSelectionMode: isBatchEnabled && batchLimit > 0 ? batchMode : undefined,
      cardRotationOffset: rotationOffset
    });
    onClose();
  };

  const nextSequentialStart = totalUnitsCount > 0 ? (rotationOffset % totalUnitsCount) + 1 : 1;
  const nextUnit = totalUnitsCount > 0 ? activeUnits[(rotationOffset % totalUnitsCount)] : null;
  const nextUnitName = nextUnit?.rootTitle || nextUnit?.activeCards[0]?.text.slice(0, 30) || 'Card #1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-base font-bold text-neutral-100">Batch Prayers</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Configure batching for <span className="font-semibold text-neutral-200">"{subject.name}"</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Mode Toggle: All Cards vs Batch Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Session Mode
              </label>
              {totalUnitsCount > 0 && (
                <span className="text-[11px] font-mono text-neutral-400 bg-neutral-950/80 px-2 py-0.5 rounded-lg border border-neutral-800">
                  {totalUnitsCount} active {totalUnitsCount === 1 ? 'person/card' : 'people/cards'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsBatchEnabled(false)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !isBatchEnabled
                    ? 'bg-neutral-800 border-indigo-500/80 text-white ring-1 ring-indigo-500/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-neutral-200">
                  <Users className="w-3.5 h-3.5" />
                  All Cards
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Pray for all {totalUnitsCount} requests every session.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsBatchEnabled(true)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isBatchEnabled
                    ? 'bg-indigo-500/15 border-indigo-500/80 text-white ring-1 ring-indigo-500/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-indigo-300">
                  <Layers className="w-3.5 h-3.5" />
                  Batch Prayers
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Pray for {batchLimit} at a time, cycling through them.
                </p>
              </button>
            </div>
          </div>

          {/* If Batch Enabled, show Number of Cards & Cycle Mode (Sequential vs Random) */}
          {isBatchEnabled && (
            <div className="space-y-4 p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-xl animate-fadeIn">
              {/* Batch Count Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-300">
                    Number of cards/people at a time:
                  </label>
                  <div className="flex items-center gap-1">
                    {[3, 5, 7, 10].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setBatchLimit(n)}
                        className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors ${
                          batchLimit === n
                            ? 'bg-indigo-500 text-white font-bold shadow-sm'
                            : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchLimit(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center font-bold text-sm transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={totalUnitsCount > 0 ? totalUnitsCount : 100}
                    value={batchLimit}
                    onChange={(e) => setBatchLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-1.5 text-center bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-mono text-neutral-100 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setBatchLimit(prev => Math.min(totalUnitsCount || 100, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center font-bold text-sm transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-neutral-400 ml-1">
                    out of {totalUnitsCount} active {totalUnitsCount === 1 ? 'person/card' : 'people/cards'}
                  </span>
                </div>
              </div>

              {/* Cycling Mode: Sequential vs Random */}
              <div className="space-y-2 pt-3 border-t border-neutral-800/80">
                <label className="text-xs font-medium text-neutral-300">
                  How should the batch cycle through cards?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchMode('sequential')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchMode === 'sequential'
                        ? 'bg-neutral-800 border-indigo-500/80 text-white ring-1 ring-indigo-500/30'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-indigo-300">
                      <ListOrdered className="w-3.5 h-3.5" />
                      Sequential
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                      Rotates in order. Next session shows the next {batchLimit} people, and so forth.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchMode('random')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchMode === 'random'
                        ? 'bg-neutral-800 border-indigo-500/80 text-white ring-1 ring-indigo-500/30'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-indigo-300">
                      <Shuffle className="w-3.5 h-3.5" />
                      Random
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                      Shuffles cards each session, picking a fresh {batchLimit} cards at random.
                    </p>
                  </button>
                </div>
              </div>

              {/* Status and Rotation preview */}
              {batchMode === 'sequential' && totalUnitsCount > 0 && (
                <div className="flex items-center justify-between text-xs text-neutral-400 pt-1 border-t border-neutral-800/60">
                  <span className="truncate pr-2">
                    Starts at #{nextSequentialStart}: <span className="text-neutral-300 font-medium">{nextUnitName}</span>
                  </span>
                  {rotationOffset > 0 && (
                    <button
                      type="button"
                      onClick={() => setRotationOffset(0)}
                      className="shrink-0 text-[11px] text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Reset to #1
                    </button>
                  )}
                </div>
              )}

              {batchMode === 'random' && (
                <div className="text-xs text-neutral-400 pt-1 border-t border-neutral-800/60 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Random batch of {batchLimit} cards picked every session.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-950 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-3.5 h-3.5" /> Save Batch Settings
          </button>
        </div>
      </div>
    </div>
  );
};
