// components/VideoPreview.tsx (mejorado)
import React, { useEffect, useRef } from 'react';

interface VideoPreviewProps {
  src: string;
  aspectRatio?: 'horizontal' | 'vertical';
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ src, aspectRatio = 'vertical' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${aspectRatio === 'vertical' ? 'aspect-9/16' : 'aspect-video'}`}>
      <video
        ref={videoRef}
        src={src}
        controls
        className="w-full h-full object-contain"
        onError={(e) => console.error('Error loading video:', e)}
      >
        Tu navegador no soporta el elemento de video.
      </video>
    </div>
  );
};

export default VideoPreview;