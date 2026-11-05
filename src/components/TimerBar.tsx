import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, BellRing } from 'lucide-react';

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
    <div
      className={`group relative inline-flex items-center justify-center px-4 py-1.5 bg-neutral-900/90 hover:bg-neutral-900 backdrop-blur-md border border-neutral-800 hover:border-neutral-700/80 rounded-full shadow-lg transition-all duration-300 ease-out select-none ${className}`}
    >
      {/* Time Display - Clean countdown timer digits */}
      <button
        type="button"
        onClick={toggleRunning}
        onDoubleClick={resetTimer}
        title="Click to pause/play • Double-click to reset • Hover for options"
        className="flex items-center gap-1.5 cursor-pointer focus:outline-none transition-transform duration-300 ease-out"
      >
        <span
          className={`font-mono text-base sm:text-lg font-semibold tracking-wider transition-colors ${
            isFinished
              ? 'text-amber-400 animate-pulse'
              : secondsRemaining < 60
              ? 'text-rose-400'
              : isRunning
              ? 'text-neutral-100'
              : 'text-neutral-400'
          }`}
        >
          {formattedTime}
        </span>
        {isFinished && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full font-medium">
            <BellRing className="w-2.5 h-2.5 animate-bounce" /> Time is up
          </span>
        )}
      </button>

      {/* Hidden options that smoothly reveal to the right on hover, sliding clock left while keeping the container centered */}
      <div className="flex items-center max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-300 ease-out overflow-hidden pointer-events-none group-hover:pointer-events-auto">
        <div className="h-3.5 w-px bg-neutral-700/80 mx-2 shrink-0" />
        
        <div className="flex items-center gap-1 shrink-0">
          {/* Primary Action: Play / Pause */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleRunning();
            }}
            title={isRunning ? "Pause" : "Start"}
            className="p-1 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors active:scale-95"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetTimer();
            }}
            title="Reset Timer"
            className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Quick Add */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addTime(1);
            }}
            title="Add 1 minute"
            className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors active:scale-95"
          >
            +1m
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addTime(5);
            }}
            title="Add 5 minutes"
            className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors active:scale-95"
          >
            +5m
          </button>
        </div>
      </div>
    </div>
  );
};
