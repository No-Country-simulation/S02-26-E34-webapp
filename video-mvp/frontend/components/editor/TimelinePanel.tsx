'use client';

interface TimelinePanelProps {
  videoUrl: string | null;
  videoDuration: number;
  clipStart: number;
  clipEnd: number;
  playheadTime: number;
  onClipStartChange: (value: number) => void;
  onClipEndChange: (value: number) => void;
}

const formatSeconds = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
};

export default function TimelinePanel({
  videoUrl,
  videoDuration,
  clipStart,
  clipEnd,
  playheadTime,
  onClipStartChange,
  onClipEndChange,
}: TimelinePanelProps) {

  return (
    <section className="p-6 bg-[#0F0F15] rounded-3xl border border-white/5 flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#3b2bee]/20 rounded-md">
            <svg className="w-4 h-4 text-[#3b2bee]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest">Línea de Tiempo</h2>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-3">
          <div className="text-[10px] font-mono text-slate-500 text-right md:text-left">
            {formatSeconds(clipStart)} - {formatSeconds(clipEnd)} / {formatSeconds(videoDuration)}
          </div>
        </div>
      </div>

      <div className="h-32 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden p-4 flex flex-col justify-center gap-4">
        <div className="relative h-3 rounded-full bg-white/10">
          <div
            className="absolute top-0 h-3 rounded-full bg-[#3b2bee]/50"
            style={{
              left: `${videoDuration > 0 ? (clipStart / videoDuration) * 100 : 0}%`,
              width: `${videoDuration > 0 ? ((clipEnd - clipStart) / videoDuration) * 100 : 0}%`
            }}
          ></div>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#22c55e] shadow-[0_0_8px_#22c55e] rounded-full z-20"
            style={{
              left: `${videoDuration > 0 ? Math.min(100, Math.max(0, (clipStart / videoDuration) * 100)) : 0}%`
            }}
          ></div>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#ff6b6b] shadow-[0_0_8px_#ff6b6b] rounded-full z-20"
            style={{
              left: `${videoDuration > 0 ? Math.min(100, Math.max(0, (clipEnd / videoDuration) * 100)) : 0}%`
            }}
          ></div>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#8f85ff] shadow-[0_0_8px_#8f85ff] rounded-full z-10"
            style={{
              left: `${videoDuration > 0 ? Math.min(100, Math.max(0, (playheadTime / videoDuration) * 100)) : 0}%`
            }}
          ></div>
        </div>

        <div className={`relative ${!videoUrl ? 'opacity-40 pointer-events-none' : ''}`}>
          <input
            type="range"
            min={0}
            max={videoDuration || 0}
            step={1}
            value={clipStart}
            onChange={(event) => onClipStartChange(Math.round(Number(event.target.value)))}
            className="w-full accent-[#3b2bee]"
          />
          <input
            type="range"
            min={0}
            max={videoDuration || 0}
            step={1}
            value={clipEnd}
            onChange={(event) => onClipEndChange(Math.round(Number(event.target.value)))}
            className="w-full accent-[#3b2bee] mt-2"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Inicio: {formatSeconds(clipStart)}</span>
          <span>Fin: {formatSeconds(clipEnd)}</span>
        </div>
      </div>
    </section>
  );
}
