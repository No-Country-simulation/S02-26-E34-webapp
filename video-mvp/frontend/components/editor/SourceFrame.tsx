'use client';

import { useEffect, useRef } from 'react';
import { CloudUpload } from 'lucide-react';
import { Maximize } from 'lucide-react';
import { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';

interface Settings {
    selectionSize: number;
    cropX: number;
    cropY: number;
    showOverlay: boolean;
    safeZones: boolean;
    showGrid: boolean;
    autoTrack: boolean;
}

interface SourceFrameProps {
    videoUrl: string | null;
    isBackendOnline: boolean | null;
    settings: Settings;
    onCropXChange: (value: number) => void;
    onCropYChange: (value: number) => void;
    onSelectionSizeChange: (value: number) => void;
    onSelectionAreaChange: (selection: {
        x: number;
        y: number;
        width: number;
        height: number;
        frameWidth: number;
        frameHeight: number;
        centerX: number;
        centerY: number;
        left: number;
        top: number;
        right: number;
        bottom: number;
    }) => void;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    getRootProps: (props?: DropzoneRootProps) => DropzoneRootProps;
    getInputProps: (props?: DropzoneInputProps) => DropzoneInputProps;
    isDragActive: boolean;
    selectionSyncTick?: number;
}

export default function SourceFrame({
    videoUrl,
    isBackendOnline,
    settings,
    onCropXChange,
    onCropYChange,
    onSelectionSizeChange,
    onSelectionAreaChange,
    videoRef,
    getRootProps,
    getInputProps,
    isDragActive,
    selectionSyncTick,
}: SourceFrameProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const selectionRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<{
        isDragging: boolean;
        mode: 'move' | 'resize-left' | 'resize-right';
        startX: number;
        startY: number;
        startLeft: number;
        startTop: number;
        startWidth: number;
    }>({
        isDragging: false,
        mode: 'move',
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        startWidth: 0
    });

    const emitSelectionArea = () => {
        const frameElement = frameRef.current;
        const selectionElement = selectionRef.current;

        if (!frameElement || !selectionElement) return;

        const frameRect = frameElement.getBoundingClientRect();
        const frameContentLeft = frameRect.left + frameElement.clientLeft;
        const frameContentTop = frameRect.top + frameElement.clientTop;
        const frameContentWidth = frameElement.clientWidth;
        const frameContentHeight = frameElement.clientHeight;
        const selectionRect = selectionElement.getBoundingClientRect();

        const x = Math.round(selectionRect.left - frameContentLeft);
        const y = Math.round(selectionRect.top - frameContentTop);
        const width = Math.round(selectionRect.width);
        const height = Math.round(selectionRect.height);
        const centerX = Math.round(x + width / 2);
        const centerY = Math.round(y + height / 2);

        onSelectionAreaChange({
            x,
            y,
            width,
            height,
            frameWidth: Math.round(frameContentWidth),
            frameHeight: Math.round(frameContentHeight),
            centerX,
            centerY,
            left: x,
            top: y,
            right: x + width,
            bottom: y + height
        });
    };

    useEffect(() => {
        if (!videoUrl) return;
        emitSelectionArea();
    }, [videoUrl, settings.cropX, settings.cropY, settings.selectionSize, selectionSyncTick]);

    useEffect(() => {
        if (!videoUrl || !frameRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            emitSelectionArea();
        });

        resizeObserver.observe(frameRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [videoUrl]);

    const beginInteraction = (event: React.PointerEvent<HTMLDivElement>, mode: 'move' | 'resize-left' | 'resize-right') => {
        const frameElement = frameRef.current;
        const selectionElement = selectionRef.current;

        if (!frameElement || !selectionElement) return;

        const frameRect = frameElement.getBoundingClientRect();
        const frameContentLeft = frameRect.left + frameElement.clientLeft;
        const selectionRect = selectionElement.getBoundingClientRect();

        dragStateRef.current = {
            isDragging: true,
            mode,
            startX: event.clientX,
            startY: event.clientY,
            startLeft: selectionRect.left - frameContentLeft,
            startTop: selectionRect.top - (frameRect.top + frameElement.clientTop),
            startWidth: selectionRect.width
        };

        if (selectionElement) {
            selectionElement.setPointerCapture(event.pointerId);
        }
        event.preventDefault();
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        beginInteraction(event, 'move');
    };

    const handleResizeLeftPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        beginInteraction(event, 'resize-left');
    };

    const handleResizeRightPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        beginInteraction(event, 'resize-right');
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!dragStateRef.current.isDragging) return;

        const frameElement = frameRef.current;
        const selectionElement = selectionRef.current;

        if (!frameElement || !selectionElement) return;

        const frameRect = frameElement.getBoundingClientRect();
        const frameContentLeft = frameRect.left + frameElement.clientLeft;
        const frameContentTop = frameRect.top + frameElement.clientTop;
        const frameContentWidth = frameElement.clientWidth;
        const frameContentHeight = frameElement.clientHeight;
        const selectionRect = selectionElement.getBoundingClientRect();

        if (dragStateRef.current.mode === 'move') {
            const deltaX = event.clientX - dragStateRef.current.startX;
            const deltaY = event.clientY - dragStateRef.current.startY;
            const nextLeftRaw = dragStateRef.current.startLeft + deltaX;
            const nextTopRaw = dragStateRef.current.startTop + deltaY;
            const maxLeft = Math.max(0, frameContentWidth - selectionRect.width);
            const maxTop = Math.max(0, frameContentHeight - selectionRect.height);
            const nextLeft = Math.min(Math.max(0, nextLeftRaw), maxLeft);
            const nextTop = Math.min(Math.max(0, nextTopRaw), maxTop);
            const centerX = nextLeft + selectionRect.width / 2;
            const centerY = nextTop + selectionRect.height / 2;
            const nextCropX = (centerX / frameContentWidth) * 100;
            const nextCropY = (centerY / frameContentHeight) * 100;

            onCropXChange(Number(nextCropX.toFixed(2)));
            onCropYChange(Number(nextCropY.toFixed(2)));

            const x = Math.round(nextLeft);
            const y = Math.round(nextTop);
            const width = Math.round(selectionRect.width);
            const height = Math.round(selectionRect.height);

            onSelectionAreaChange({
                x,
                y,
                width,
                height,
                frameWidth: Math.round(frameContentWidth),
                frameHeight: Math.round(frameContentHeight),
                centerX: Math.round(centerX),
                centerY: Math.round(centerY),
                left: x,
                top: y,
                right: x + width,
                bottom: y + height
            });
            return;
        }

        const centerX = (settings.cropX / 100) * frameContentWidth;
        const centerY = (settings.cropY / 100) * frameContentHeight;
        const maxHalfWidthByCenter = Math.min(centerX, frameContentWidth - centerX);
        const maxHalfHeightByCenter = Math.min(centerY, frameContentHeight - centerY);
        const maxWidthByHorizontal = maxHalfWidthByCenter * 2;
        const maxHeightByVertical = maxHalfHeightByCenter * 2;
        const maxWidthByVertical = maxHeightByVertical * (9 / 16);
        const maxWidth = Math.max(1, Math.min(maxWidthByHorizontal, maxWidthByVertical));
        const minHeight = frameContentHeight * 0.25;
        const minWidth = minHeight * (9 / 16);

        const deltaX = event.clientX - dragStateRef.current.startX;
        const resizeDelta = dragStateRef.current.mode === 'resize-right' ? deltaX : -deltaX;
        const widthFromDrag = dragStateRef.current.startWidth + (resizeDelta * 2);
        const nextWidth = Math.min(Math.max(minWidth, widthFromDrag), maxWidth);
        const nextHeight = nextWidth * (16 / 9);
        const nextSelectionSize = (nextHeight / frameContentHeight) * 100;

        onSelectionSizeChange(Number(nextSelectionSize.toFixed(2)));

        const x = Math.round(centerX - nextWidth / 2);
        const y = Math.round(centerY - nextHeight / 2);
        const width = Math.round(nextWidth);
        const height = Math.round(nextHeight);

        onSelectionAreaChange({
            x,
            y,
            width,
            height,
            frameWidth: Math.round(frameContentWidth),
            frameHeight: Math.round(frameContentHeight),
            centerX: Math.round(centerX),
            centerY: Math.round(centerY),
            left: x,
            top: y,
            right: x + width,
            bottom: y + height
        });
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        const selectionElement = selectionRef.current;
        dragStateRef.current.isDragging = false;
        if (selectionElement?.hasPointerCapture(event.pointerId)) {
            selectionElement.releasePointerCapture(event.pointerId);
        }
        emitSelectionArea();
    };

    return (
        <section className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-[#12121A] rounded-lg border border-white/5">
                    <Maximize className="text-[#3b2bee] w-5 h-5" />
                </div>
                <div>
                    <h2 className="font-bold text-xl text-white tracking-tight">Marco de Origen</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">1920x1080 (16:9) • RAW</p>
                </div>
            </div>

            <div className="relative">
                <input {...getInputProps()} className="hidden" />
                {!videoUrl ? (
                    <div
                        {...getRootProps()}
                        className={`w-full aspect-video bg-transparent rounded-4xl border-2 border-dashed flex flex-col items-center justify-center text-center p-12 cursor-pointer transition-all ${isDragActive ? 'border-[#3b2bee] bg-[#3b2bee]/5 scale-[1.01]' : 'border-[#12121A]'
                            } ${isBackendOnline === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="p-4 bg-[#3b2bee]/10 rounded-full mb-6">
                            <CloudUpload className="w-10 h-10 text-[#3b2bee]" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Sube tu video aquí</h3>
                        <p className="text-slate-500 font-medium lowercase">mp4 horizontal</p>
                        {isBackendOnline === false && (
                            <p className="text-xs text-red-500 mt-6 font-bold uppercase tracking-widest">Servidor no disponible</p>
                        )}
                    </div>
                ) : (
                    <div ref={frameRef} className="relative w-full aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl group border-8 border-[#0F0F15] select-none">
                        <div className="w-full h-full transition-transform duration-300 origin-center">
                            <video ref={videoRef} src={videoUrl} className="w-full h-full object-cover" controls={false} />
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div
                                ref={selectionRef}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                                className="aspect-9/16 border-2 border-[#3b2bee] ring-[100vw] ring-black/60 absolute pointer-events-auto cursor-move transition-all duration-150 touch-none"
                                style={{
                                    height: `${settings.selectionSize}%`,
                                    left: `${settings.cropX}%`,
                                    top: `${settings.cropY}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                <div
                                    onPointerDown={handleResizeLeftPointerDown}
                                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-12 rounded-md bg-[#3b2bee]/80 border border-white/30 cursor-ew-resize pointer-events-auto"
                                />
                                <div
                                    onPointerDown={handleResizeRightPointerDown}
                                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-12 rounded-md bg-[#3b2bee]/80 border border-white/30 cursor-ew-resize pointer-events-auto"
                                />
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#3b2bee] text-[8px] md:text-[10px] font-black text-white rounded-full uppercase tracking-[0.2em] shadow-xl flex items-center gap-2 whitespace-nowrap">
                                    Área de Recorte
                                </div>
                                <div className="absolute -top-1 -left-1 w-4 h-4 md:w-5 md:h-5 border-t-4 border-l-4 border-white rounded-tl-sm"></div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 border-t-4 border-r-4 border-white rounded-tr-sm"></div>
                                <div className="absolute -bottom-1 -left-1 w-4 h-4 md:w-5 md:h-5 border-b-4 border-l-4 border-white rounded-bl-sm"></div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 border-b-4 border-r-4 border-white rounded-br-sm"></div>
                                {settings.showGrid && (
                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                                        {[...Array(9)].map((_, i) => <div key={i} className="border border-white/20"></div>)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
