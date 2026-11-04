import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, BellRing } from 'lucide-react';

interface TimerBarProps {
  initialMinutes?: number;
  autoStart?: boolean;
  soundEnabled?: boolean;
  onTimeUp?: () => void;
  className?: string;
}

// Generate gentle soft macOS bell chime using Web Audio API
export const playSoftChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play warm harmonic chord chime (C5, G5, C6)
    const notes = [523.25, 783.99, 1046.50];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.2 / (idx + 1), now + idx * 0.05 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 2.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 2.2);
    });
  } catch (e) {
    console.warn('Audio chime playback note:', e);
  }
};

export const TimerBar: React.FC<TimerBarProps> = ({
  initialMinutes = 15,
  autoStart = true,
  soundEnabled = true,
  onTimeUp,
  className = ''
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const chimePlayedRef = useRef<boolean>(false);

  // Sync when initialMinutes changes
  useEffect(() => {
    setSecondsRemaining(initialMinutes * 60);
    setIsFinished(false);
    chimePlayedRef.current = false;
    if (autoStart) {
      setIsRunning(true);
    }
  }, [initialMinutes, autoStart]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            if (!chimePlayedRef.current) {
              chimePlayedRef.current = true;
              if (soundEnabled) playSoftChime();
              if (onTimeUp) onTimeUp();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, soundEnabled, onTimeUp]);

  const toggleRunning = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    chimePlayedRef.current = false;
    setSecondsRemaining(initialMinutes * 60);
  };

  const addTime = (minutes: number) => {
    setSecondsRemaining(prev => prev + minutes * 60);
    if (isFinished) {
      setIsFinished(false);
      chimePlayedRef.current = false;
    }
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-700/60 rounded-full shadow-2xl text-neutral-200 transition-all ${className}`}>
      {/* Time Display */}
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-lg font-semibold tracking-wider ${
            isFinished
              ? 'text-amber-400 animate-pulse'
              : secondsRemaining < 60
              ? 'text-rose-400'
              : 'text-neutral-100'
          }`}
        >
          {formattedTime}
        </span>
        {isFinished && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-medium">
            <BellRing className="w-3 h-3 animate-bounce" /> Time is up
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-neutral-700 mx-1" />

      {/* Primary Action: Play / Pause */}
      <button
        onClick={toggleRunning}
        title={isRunning ? "Pause" : "Start"}
        className="p-1.5 rounded-full hover:bg-neutral-800 active:scale-95 text-neutral-300 hover:text-white transition-all"
      >
        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
      </button>

      {/* Reset */}
      <button
        onClick={resetTimer}
        title="Reset Timer"
        className="p-1.5 rounded-full hover:bg-neutral-800 active:scale-95 text-neutral-400 hover:text-neutral-200 transition-all"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Quick Add Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => addTime(1)}
          title="Add 1 minute"
          className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 active:scale-95 transition-all flex items-center gap-0.5"
        >
          <Plus className="w-2.5 h-2.5" />1m
        </button>
        <button
          onClick={() => addTime(5)}
          title="Add 5 minutes"
          className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 active:scale-95 transition-all flex items-center gap-0.5"
        >
          <Plus className="w-2.5 h-2.5" />5m
        </button>
      </div>
    </div>
  );
};
