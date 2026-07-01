'use client';

import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import './_imageCropModal.scss';

type Props = {
    file: File | null;
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: (file: File) => Promise<void> | void;
};

const outputSize = 600;
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

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
        image.src = src;
    });

const getCroppedImageFile = async (file: File, imageUrl: string, zoom: number, offsetX: number, offsetY: number) => {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('No se pudo preparar el recorte de la imagen.');
    }

    canvas.width = outputSize;
    canvas.height = outputSize;

    const baseScale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight);
    const scale = baseScale * zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const maxOffsetX = Math.max(0, (drawWidth - outputSize) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - outputSize) / 2);
    const drawX = (outputSize - drawWidth) / 2 + (offsetX / 100) * maxOffsetX;
    const drawY = (outputSize - drawHeight) / 2 + (offsetY / 100) * maxOffsetY;

    context.fillStyle = '#1D2C3F';
    context.fillRect(0, 0, outputSize, outputSize);
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });

    if (!blob) {
        throw new Error('No se pudo generar la imagen recortada.');
    }

    const fileName = file.name.replace(/\.[^.]+$/, '') || 'perfil';

    return new File([blob], `${fileName}-perfil.jpg`, { type: 'image/jpeg' });
};

export const ImageCropModal = ({ file, isOpen, onCancel, onConfirm }: Props) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [imageSize, setImageSize] = useState<ImageSize | null>(null);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [zoom, setZoom] = useState(1);
    const dragStateRef = useRef<DragState | null>(null);

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
            const croppedFile = await getCroppedImageFile(file, imageUrl, zoom, offsetX, offsetY);
            await onConfirm(croppedFile);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo preparar la imagen.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (isProcessing) return;

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
        const sensitivity = 180 / Math.max(rect.width, rect.height);
        const nextOffsetX = dragState.offsetX + (event.clientX - dragState.startX) * sensitivity;
        const nextOffsetY = dragState.offsetY + (event.clientY - dragState.startY) * sensitivity;

        setOffsetX(clampOffset(nextOffsetX));
        setOffsetY(clampOffset(nextOffsetY));
    };

    const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
        if (dragStateRef.current?.pointerId === event.pointerId) {
            dragStateRef.current = null;
        }
    };

    return (
        <div className="image-crop-modal" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
            <div className="image-crop-modal-backdrop" onClick={isProcessing ? undefined : onCancel} />
            <div className="image-crop-modal-panel">
                <div className="image-crop-modal-header">
                    <div>
                        <h2 id="image-crop-title">Ajustar imagen</h2>
                        <p>Arrastra la foto para centrarla antes de subirla al perfil.</p>
                    </div>
                    <button type="button" onClick={onCancel} disabled={isProcessing} aria-label="Cerrar">
                        ×
                    </button>
                </div>

                <div
                    className="image-crop-modal-preview"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                        backgroundImage: `url(${imageUrl})`,
                        backgroundPosition: `${50 - offsetX / 2}% ${50 - offsetY / 2}%`,
                        backgroundSize: imageSize && imageSize.width >= imageSize.height
                            ? `auto ${zoom * 100}%`
                            : `${zoom * 100}% auto`,
                    }}
                />

                <div className="image-crop-modal-controls">
                    <label>
                        Zoom
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.01"
                            value={zoom}
                            onChange={(event) => setZoom(Number(event.target.value))}
                            disabled={isProcessing}
                        />
                    </label>

                    <label>
                        Horizontal
                        <input
                            type="range"
                            min={minOffset}
                            max={maxOffset}
                            step="1"
                            value={offsetX}
                            onChange={(event) => setOffsetX(Number(event.target.value))}
                            disabled={isProcessing}
                        />
                    </label>

                    <label>
                        Vertical
                        <input
                            type="range"
                            min={minOffset}
                            max={maxOffset}
                            step="1"
                            value={offsetY}
                            onChange={(event) => setOffsetY(Number(event.target.value))}
                            disabled={isProcessing}
                        />
                    </label>
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
