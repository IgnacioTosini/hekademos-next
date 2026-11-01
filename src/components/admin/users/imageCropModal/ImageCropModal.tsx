'use client';

import { KeyboardEvent, PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import './_imageCropModal.scss';

type Props = {
    file: File | null;
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: (file: File) => Promise<void> | void;
    aspectRatio?: number;
    outputWidth?: number;
    description?: string;
    outputFormat?: 'image/jpeg' | 'image/png';
};

const defaultOutputSize = 600;
const minOffset = -100;
const maxOffset = 100;

type DragState = {
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
};

type ImageSize = {
    width: number;
    height: number;
};

const clampOffset = (value: number) => Math.min(maxOffset, Math.max(minOffset, value));
const clampZoom = (value: number) => Math.min(3, Math.max(1, Math.round(value * 100) / 100));

const getOverflow = (imageSize: ImageSize, width: number, height: number, zoom: number) => {
    const scale = Math.max(width / imageSize.width, height / imageSize.height) * zoom;
    return {
        x: Math.max(0, (imageSize.width * scale - width) / 2),
        y: Math.max(0, (imageSize.height * scale - height) / 2),
    };
};

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
        image.src = src;
    });

const getCroppedImageFile = async (file: File, imageUrl: string, zoom: number, offsetX: number, offsetY: number, outputWidth: number, outputHeight: number, outputFormat: 'image/jpeg' | 'image/png') => {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('No se pudo preparar el recorte de la imagen.');
    }

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const baseScale = Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
    const scale = baseScale * zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const maxOffsetX = Math.max(0, (drawWidth - outputWidth) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - outputHeight) / 2);
    const drawX = (outputWidth - drawWidth) / 2 + (offsetX / 100) * maxOffsetX;
    const drawY = (outputHeight - drawHeight) / 2 + (offsetY / 100) * maxOffsetY;

    if (outputFormat === 'image/jpeg') {
        context.fillStyle = '#1D2C3F';
        context.fillRect(0, 0, outputWidth, outputHeight);
    }
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputFormat, 0.92);
    });

    if (!blob) {
        throw new Error('No se pudo generar la imagen recortada.');
    }

    const fileName = file.name.replace(/\.[^.]+$/, '') || 'imagen';

    return new File([blob], `${fileName}-ajustada.${outputFormat === 'image/png' ? 'png' : 'jpg'}`, { type: outputFormat });
};

export const ImageCropModal = ({ file, isOpen, onCancel, onConfirm, aspectRatio = 1, outputWidth = defaultOutputSize, description = 'Arrastra la foto para centrarla antes de subirla al perfil.', outputFormat = 'image/jpeg' }: Props) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [imageSize, setImageSize] = useState<ImageSize | null>(null);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [zoom, setZoom] = useState(1);
    const dragStateRef = useRef<DragState | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

    useEffect(() => {
        setImageSize(null);
        setOffsetX(0);
        setOffsetY(0);
        setZoom(1);
    }, [file]);

    useEffect(() => {
        if (!imageUrl) return;

        let isMounted = true;

        loadImage(imageUrl)
            .then((image) => {
                if (!isMounted) return;

                setImageSize({
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                });
            })
            .catch((error) => {
                toast.error(error instanceof Error ? error.message : 'No se pudo leer la imagen.');
            });

        return () => {
            isMounted = false;
        };
    }, [imageUrl]);

    useEffect(() => () => {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
    }, [imageUrl]);

    if (!isOpen || !file || !imageUrl) return null;

    const handleConfirm = async () => {
        try {
            setIsProcessing(true);
            const croppedFile = await getCroppedImageFile(file, imageUrl, zoom, offsetX, offsetY, outputWidth, Math.round(outputWidth / aspectRatio), outputFormat);
            await onConfirm(croppedFile);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo preparar la imagen.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (isProcessing || !imageSize) return;
        event.preventDefault();

        event.currentTarget.setPointerCapture(event.pointerId);
        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX,
            offsetY,
        };
    };

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;

        if (!dragState || dragState.pointerId !== event.pointerId) return;

        const rect = event.currentTarget.getBoundingClientRect();
        if (!imageSize) return;
        const overflow = getOverflow(imageSize, rect.width, rect.height, zoom);
        const nextOffsetX = overflow.x ? dragState.offsetX + (event.clientX - dragState.startX) / overflow.x * 100 : 0;
        const nextOffsetY = overflow.y ? dragState.offsetY + (event.clientY - dragState.startY) / overflow.y * 100 : 0;

        setOffsetX(clampOffset(nextOffsetX));
        setOffsetY(clampOffset(nextOffsetY));
    };

    const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
        if (dragStateRef.current?.pointerId === event.pointerId) {
            dragStateRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const changeZoom = (value: number) => {
        setZoom(clampZoom(value));
        if (value <= 1) { setOffsetX(0); setOffsetY(0); }
    };

    const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
        if (isProcessing) return;
        event.preventDefault();
        changeZoom(zoom + (event.deltaY < 0 ? .1 : -.1));
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (isProcessing) return;
        const changes: Record<string, [number, number]> = {
            ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5],
        };
        const change = changes[event.key];
        if (!change) return;
        event.preventDefault();
        setOffsetX((current) => clampOffset(current + change[0]));
        setOffsetY((current) => clampOffset(current + change[1]));
    };

    return (
        <div className="image-crop-modal" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
            <div className="image-crop-modal-backdrop" onClick={isProcessing ? undefined : onCancel} />
            <div className="image-crop-modal-panel">
                <div className="image-crop-modal-header">
                    <div>
                        <span className="image-crop-modal-eyebrow">ENCUADRE</span>
                        <h2 id="image-crop-title">Ajustar imagen</h2>
                        <p>{description}</p>
                    </div>
                    <button type="button" onClick={onCancel} disabled={isProcessing} aria-label="Cerrar">
                        ×
                    </button>
                </div>

                <div
                    ref={previewRef}
                    className={`image-crop-modal-preview${aspectRatio === 1 ? '' : ' is-rectangular'}`}
                    role="img"
                    aria-label="Vista previa del recorte. Arrastrá para mover la imagen o usá las flechas del teclado."
                    tabIndex={0}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onWheel={handleWheel}
                    onKeyDown={handleKeyDown}
                    style={{
                        aspectRatio: String(aspectRatio),
                        backgroundImage: `url(${imageUrl})`,
                        backgroundPosition: `${50 - offsetX / 2}% ${50 - offsetY / 2}%`,
                        backgroundSize: imageSize && imageSize.width / imageSize.height >= aspectRatio
                            ? `auto ${zoom * 100}%` : `${zoom * 100}% auto`,
                    }}
                />

                <div className="image-crop-modal-controls">
                    <div className="image-crop-modal-hint">Arrastrá la imagen para moverla. Usá la rueda para acercar o alejar.</div>
                    <div className="image-crop-modal-zoom-heading"><strong>Zoom</strong><output>{Math.round(zoom * 100)}%</output></div>
                    <div className="image-crop-modal-zoom-row">
                        <button type="button" onClick={() => changeZoom(zoom - .1)} disabled={isProcessing || zoom <= 1} aria-label="Alejar imagen">−</button>
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.01"
                            value={zoom}
                            onChange={(event) => changeZoom(Number(event.target.value))}
                            disabled={isProcessing}
                            aria-label="Zoom de la imagen"
                        />
                        <button type="button" onClick={() => changeZoom(zoom + .1)} disabled={isProcessing || zoom >= 3} aria-label="Acercar imagen">+</button>
                    </div>
                    <button type="button" className="image-crop-modal-reset" onClick={() => { changeZoom(1); setOffsetX(0); setOffsetY(0); }} disabled={isProcessing || (zoom === 1 && offsetX === 0 && offsetY === 0)}>Restablecer encuadre</button>
                </div>

                <div className="image-crop-modal-actions">
                    <button type="button" className="image-crop-modal-secondary" onClick={onCancel} disabled={isProcessing}>
                        Cancelar
                    </button>
                    <button type="button" className="image-crop-modal-primary" onClick={handleConfirm} disabled={isProcessing}>
                        {isProcessing ? 'Preparando...' : 'Usar imagen'}
                    </button>
                </div>
            </div>
        </div>
    );
};
