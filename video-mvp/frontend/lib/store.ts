// frontend/lib/store.ts
import { create } from 'zustand';

interface VideoState {
  videoFile: File | null;
  videoUrl: string | null;
  convertedUrl: string | null;
  isProcessing: boolean;
  progress: number;
  videoId: string | null;
  options: {
    addSubtitles: boolean;
    addBranding: boolean;
  };
  setVideoFile: (file: File | null) => void;
  setVideoUrl: (url: string | null) => void;
  setConvertedUrl: (url: string | null) => void;
  setIsProcessing: (processing: boolean) => void;
  setProgress: (progress: number | ((prev: number) => number)) => void;
  setVideoId: (id: string | null) => void;
  setOption: (option: keyof VideoState['options'], value: boolean) => void;
  resetState: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videoFile: null,
  videoUrl: null,
  convertedUrl: null,
  isProcessing: false,
  progress: 0,
  videoId: null,
  options: {
    addSubtitles: false,
    addBranding: false
  },
  setVideoFile: (file) => set({ videoFile: file }),
  setVideoUrl: (url) => set({ videoUrl: url }),
  setConvertedUrl: (url) => set({ convertedUrl: url }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setProgress: (progress) => set((state) => ({
    progress: typeof progress === 'function' ? progress(state.progress) : progress
  })),
  setVideoId: (id) => set({ videoId: id }),
  setOption: (option, value) => set((state) => ({
    options: { ...state.options, [option]: value }
  })),
  resetState: () => set({
    videoFile: null,
    videoUrl: null,
    convertedUrl: null,
    isProcessing: false,
    progress: 0,
    videoId: null,
    options: {
      addSubtitles: false,
      addBranding: false
    }
  })
}));