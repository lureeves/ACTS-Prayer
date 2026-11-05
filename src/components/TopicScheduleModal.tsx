import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  RotateCw, 
  Check, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  Layers,
  Shuffle,
  ListOrdered
} from 'lucide-react';
import { PrayerSubject, ScheduleCadenceType, EveryNWeeksSchedule, TopicPriority } from '../types/prayer';
import { DAY_NAMES, FULL_DAY_NAMES, getSubjectPriority, getSubjectPrayerUnits } from '../services/scheduler';

interface TopicScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: PrayerSubject | null;
  onSaveSchedule: (
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

export const TopicScheduleModal: React.FC<TopicScheduleModalProps> = ({
  isOpen,
  onClose,
  subject,
  onSaveSchedule
}) => {
  const [mode, setMode] = useState<number>(0); // 0 = Random / Queue, 1 = Scheduled
  const [cadenceType, setCadenceType] = useState<ScheduleCadenceType>('daysOfWeek');
  const [selectedDaysMask, setSelectedDaysMask] = useState<number>(0);
  const [intervalWeeks, setIntervalWeeks] = useState<number>(2);
  const [intervalDayOfWeek, setIntervalDayOfWeek] = useState<number>(3); // Wednesday
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([1, 15]);
  const [priority, setPriority] = useState<TopicPriority>('medium');
  const [isBatchEnabled, setIsBatchEnabled] = useState<boolean>(false);
  const [batchLimit, setBatchLimit] = useState<number>(5);
  const [batchMode, setBatchMode] = useState<'sequential' | 'random'>('sequential');
  const [rotationOffset, setRotationOffset] = useState<number>(0);

  useEffect(() => {
    if (subject && isOpen) {
      setMode(subject.schedulingMode ?? 0);
      setCadenceType(subject.scheduleType ?? (subject.daysOfMonth?.length ? 'daysOfMonth' : subject.everyNWeeks ? 'everyNWeeks' : 'daysOfWeek'));
      setSelectedDaysMask(subject.dayOfTheWeekMask ?? 0);
      setIntervalWeeks(subject.everyNWeeks?.interval ?? 2);
      setIntervalDayOfWeek(subject.everyNWeeks?.dayOfWeek ?? 3);
      setSelectedMonthDays(subject.daysOfMonth ?? [1, 15]);
      setPriority(getSubjectPriority(subject));

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

  const toggleDayOfWeek = (dayIdx: number) => {
    const bit = 1 << dayIdx;
    setSelectedDaysMask(prev => prev ^ bit);
  };

  const toggleMonthDay = (dayNum: number) => {
    setSelectedMonthDays(prev => 
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    const priorityLevel = priority === 'high' ? 3 : priority === 'low' ? 1 : 2;

    const batchConfig = {
      sessionCardLimit: isBatchEnabled && batchLimit > 0 ? Math.max(1, batchLimit) : undefined,
      cardSelectionMode: isBatchEnabled && batchLimit > 0 ? batchMode : undefined,
      cardRotationOffset: rotationOffset
    };

    if (mode === 0) {
      onSaveSchedule(subject.name, {
        schedulingMode: 0,
        dayOfTheWeekMask: 0,
        scheduleType: undefined,
        everyNWeeks: undefined,
        daysOfMonth: undefined,
        priority,
        priorityLevel,
        ...batchConfig
      });
    } else {
      if (cadenceType === 'daysOfWeek') {
        onSaveSchedule(subject.name, {
          schedulingMode: 1,
          scheduleType: 'daysOfWeek',
          dayOfTheWeekMask: selectedDaysMask || 1 << new Date().getDay(),
          everyNWeeks: undefined,
          daysOfMonth: undefined,
          priority,
          priorityLevel,
          ...batchConfig
        });
      } else if (cadenceType === 'everyNWeeks') {
        onSaveSchedule(subject.name, {
          schedulingMode: 1,
          scheduleType: 'everyNWeeks',
          dayOfTheWeekMask: 0,
          everyNWeeks: {
            interval: Math.max(1, intervalWeeks),
            dayOfWeek: intervalDayOfWeek,
            startDate: new Date().toISOString()
          },
          daysOfMonth: undefined,
          priority,
          priorityLevel,
          ...batchConfig
        });
      } else if (cadenceType === 'daysOfMonth') {
        onSaveSchedule(subject.name, {
          schedulingMode: 1,
          scheduleType: 'daysOfMonth',
          dayOfTheWeekMask: 0,
          everyNWeeks: undefined,
          daysOfMonth: selectedMonthDays.length > 0 ? selectedMonthDays : [1],
          priority,
          priorityLevel,
          ...batchConfig
        });
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <h3 className="text-base font-bold text-neutral-100">Topic Scheduling</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Configure how often <span className="font-semibold text-neutral-200">"{subject.name}"</span> surfaces in your prayer sessions.
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
          {/* Cadence Selection: Random vs Scheduled */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Scheduling Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode(0)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  mode === 0
                    ? 'bg-neutral-800 border-sky-500/80 text-white ring-1 ring-sky-500/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                  <RotateCw className="w-4 h-4 text-sky-400" />
                  Random / Queue
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Surfaces in the standard rotating queue based on least-recently prayed.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode(1)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  mode === 1
                    ? 'bg-neutral-800 border-sky-500/80 text-white ring-1 ring-sky-500/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Scheduled
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Surfaces strictly on designated calendar days or recurring intervals.
                </p>
              </button>
            </div>
          </div>

          {/* If Scheduled, show detailed options */}
          {mode === 1 && (
            <div className="space-y-4 pt-2 border-t border-neutral-800/80 animate-fadeIn">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Recurring Schedule Type
                </label>
                <div className="flex items-center gap-1.5 p-1 bg-neutral-950/80 border border-neutral-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCadenceType('daysOfWeek')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      cadenceType === 'daysOfWeek'
                        ? 'bg-neutral-800 text-neutral-100 shadow-sm font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Day of the Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setCadenceType('everyNWeeks')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      cadenceType === 'everyNWeeks'
                        ? 'bg-neutral-800 text-neutral-100 shadow-sm font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Every N Weeks
                  </button>
                  <button
                    type="button"
                    onClick={() => setCadenceType('daysOfMonth')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      cadenceType === 'daysOfMonth'
                        ? 'bg-neutral-800 text-neutral-100 shadow-sm font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Days of the Month
                  </button>
                </div>
              </div>

              {/* Sub-option 1: Days of Week */}
              {cadenceType === 'daysOfWeek' && (
                <div className="space-y-3 p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-xl">
                  <p className="text-xs text-neutral-300">
                    Select which day(s) of the week this topic should surface:
                  </p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_NAMES.map((name, idx) => {
                      const isSelected = (selectedDaysMask & (1 << idx)) !== 0;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleDayOfWeek(idx)}
                          className={`py-2 px-1 text-xs font-medium rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-200 border-sky-500/60 font-semibold shadow-sm'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                    <button
                      type="button"
                      onClick={() => setSelectedDaysMask(62)} // Mon - Fri (2+4+8+16+32)
                      className="hover:text-neutral-200 underline"
                    >
                      Weekdays (Mon-Fri)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDaysMask(65)} // Sun + Sat (1+64)
                      className="hover:text-neutral-200 underline"
                    >
                      Weekends
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDaysMask(127)} // All days
                      className="hover:text-neutral-200 underline"
                    >
                      Every Day
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-option 2: Every N Weeks */}
              {cadenceType === 'everyNWeeks' && (
                <div className="space-y-3 p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-xl">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Repeat Every</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="52"
                          value={intervalWeeks}
                          onChange={e => setIntervalWeeks(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-100 focus:outline-none focus:border-sky-500"
                        />
                        <span className="text-xs text-neutral-400">weeks</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">On Day</label>
                      <select
                        value={intervalDayOfWeek}
                        onChange={e => setIntervalDayOfWeek(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        {FULL_DAY_NAMES.map((name, idx) => (
                          <option key={name} value={idx}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-sky-400/90 italic pt-1">
                    ✨ Surfaces every {intervalWeeks} {intervalWeeks === 1 ? 'week' : 'weeks'} on {FULL_DAY_NAMES[intervalDayOfWeek]}.
                  </p>
                </div>
              )}

              {/* Sub-option 3: Days of Month */}
              {cadenceType === 'daysOfMonth' && (
                <div className="space-y-3 p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-300">
                      Select day(s) of the month (1 - 31):
                    </p>
                    <div className="flex gap-2 text-[11px] text-neutral-400">
                      <button
                        type="button"
                        onClick={() => setSelectedMonthDays([1])}
                        className="hover:text-neutral-200 underline"
                      >
                        1st
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMonthDays([1, 15])}
                        className="hover:text-neutral-200 underline"
                      >
                        1st & 15th
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMonthDays([30, 31])}
                        className="hover:text-neutral-200 underline"
                      >
                        Month End
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 pt-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(dayNum => {
                      const isSelected = selectedMonthDays.includes(dayNum);
                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => toggleMonthDay(dayNum)}
                          className={`py-1.5 text-xs font-mono rounded-lg border text-center transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 font-semibold shadow-sm'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs text-amber-400/90 italic pt-1">
                    ✨ Surfaces on day {selectedMonthDays.join(', ') || '(none selected)'} of every month.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Priority Level Selection: High, Medium, Low */}
          <div className="space-y-2 pt-4 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Priority
              </label>
              <span className="text-[11px] text-neutral-500">
                Controls order when praying
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* High Priority */}
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  priority === 'high'
                    ? 'bg-rose-500/15 border-rose-500/80 text-white ring-1 ring-rose-500/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-rose-300">
                  <ArrowUp className="w-3.5 h-3.5" />
                  High
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Appears <span className="text-rose-300 font-medium">first</span> when praying
                </p>
              </button>

              {/* Medium Priority */}
              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  priority === 'medium'
                    ? 'bg-sky-500/15 border-sky-500/80 text-white ring-1 ring-sky-500/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-sky-300">
                  <Minus className="w-3.5 h-3.5" />
                  Medium
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Appears in the <span className="text-sky-300 font-medium">middle</span> (Normal)
                </p>
              </button>

              {/* Low Priority */}
              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  priority === 'low'
                    ? 'bg-slate-800/80 border-slate-500/80 text-white ring-1 ring-slate-500/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-300">
                  <ArrowDown className="w-3.5 h-3.5" />
                  Low
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Appears at the <span className="text-slate-300 font-medium">end</span>
                </p>
              </button>
            </div>
          </div>

          {/* Card Batching & Limits: Cards per Session */}
          <div className="space-y-3 pt-4 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Cards Per Session
                  </label>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Limit how many cards/people to pray for each time this topic surfaces.
                </p>
              </div>
              {totalUnitsCount > 0 && (
                <span className="text-[11px] font-mono text-neutral-400 bg-neutral-950/80 px-2 py-0.5 rounded-lg border border-neutral-800">
                  {totalUnitsCount} active {totalUnitsCount === 1 ? 'person/card' : 'people/cards'}
                </span>
              )}
            </div>

            {/* Batching Mode Toggle: All Cards vs Batch */}
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
                  All Cards
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Show all active requests in this topic every session.
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
                  Batch ({batchLimit} at a time)
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Pray for a subset of cards/people, rotating or shuffling each time.
                </p>
              </button>
            </div>

            {/* If Batch Enabled, show Count and Mode (Sequential vs Random) */}
            {isBatchEnabled && (
              <div className="space-y-4 p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-xl animate-fadeIn">
                {/* Batch Count Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-300">
                      Number of cards/people per session:
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
                    <input
                      type="number"
                      min={1}
                      max={totalUnitsCount > 0 ? totalUnitsCount : 100}
                      value={batchLimit}
                      onChange={(e) => setBatchLimit(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-mono text-neutral-100 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-neutral-400">
                      out of {totalUnitsCount} active {totalUnitsCount === 1 ? 'person/card' : 'people/cards'}
                    </span>
                  </div>
                </div>

                {/* Progression Mode: Sequential vs Random */}
                <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                  <label className="text-xs font-medium text-neutral-300">
                    Selection & Rotation Style:
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
                        Rotates through the list. Next session shows the next {batchLimit} people, and so forth.
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
                        Shuffles cards each session, picking a fresh {batchLimit} cards each time.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Status description */}
                {batchMode === 'sequential' && totalUnitsCount > 0 && (
                  <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                    <span>
                      Next session starts at item #{((rotationOffset % totalUnitsCount) + 1)}.
                    </span>
                    {rotationOffset > 0 && (
                      <button
                        type="button"
                        onClick={() => setRotationOffset(0)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                      >
                        Reset to #1
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
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
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-950 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-3.5 h-3.5" /> Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
};
