'use client';

import { Play, Pause, RotateCcw, Square } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  disabled?: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onStop: () => void;
  className?: string;
  iconClassName?: string;
  disabledButtonClassName?: string;
  playPauseButtonClassName?: string;
  restartButtonClassName?: string;
  stopButtonClassName?: string;
}

export default function PlaybackControls({
  isPlaying,
  disabled = false,
  onTogglePlay,
  onRestart,
  onStop,
  className,
  iconClassName = 'w-4 h-4',
  disabledButtonClassName = 'bg-white/5 text-slate-600 cursor-not-allowed',
  playPauseButtonClassName = 'bg-[#3b2bee]/15 text-[#8f85ff] hover:bg-[#3b2bee]/30',
  restartButtonClassName = 'bg-white/5 hover:bg-white/10 text-slate-400',
  stopButtonClassName = 'bg-[#3b2bee]/15 text-[#8f85ff] hover:bg-[#3b2bee]/30',
}: PlaybackControlsProps) {
  const playPauseClasses = disabled ? disabledButtonClassName : playPauseButtonClassName;
  const restartClasses = disabled ? disabledButtonClassName : restartButtonClassName;
  const stopClasses = disabled ? disabledButtonClassName : stopButtonClassName;

  return (
    <div className={className ?? 'flex items-center gap-2'}>
      <button
        onClick={onTogglePlay}
        disabled={disabled}
        title={isPlaying ? 'Pausar' : 'Play'}
        className={`p-2 rounded-xl transition-colors ${playPauseClasses}`}
      >
        {isPlaying ? (
          <Pause className={iconClassName} />
        ) : (
          <Play className={`${iconClassName} fill-current`} />
        )}
      </button>

      <button
        onClick={onRestart}
        disabled={disabled}
        title="Reiniciar"
        className={`p-2 rounded-xl transition-colors ${restartClasses}`}
      >
        <RotateCcw className={iconClassName} />
      </button>

      <button
        onClick={onStop}
        disabled={disabled}
        title="Stop"
        className={`p-2 rounded-xl transition-colors ${stopClasses}`}
      >
        <Square className={iconClassName} />
      </button>
    </div>
  );
}
