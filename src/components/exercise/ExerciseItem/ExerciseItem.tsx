'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Modal } from '../Modal/Modal';
import './_exerciseItem.scss'

type ExerciseItemProps = {
    title: string;
    youtubeUrl: string;
}

const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export const ExerciseItem = ({ title, youtubeUrl }: ExerciseItemProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [cacheBuster, setCacheBuster] = useState<string | null>(null);

    const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const videoId = useMemo(() => extractVideoId(youtubeUrl), [youtubeUrl]);
    const thumbnailUrl = useMemo(() =>
        videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '',
        [videoId]);

    useEffect(() => {
        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, []);

    const clearLoadingTimeout = useCallback(() => {
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
        }
    }, []);

    const startLoadingTimeout = useCallback(() => {
        clearLoadingTimeout();
        loadingTimeoutRef.current = setTimeout(() => {
            setVideoError(true);
            setIsVideoLoading(false);
        }, 5000);
    }, [clearLoadingTimeout]);

    const openModal = useCallback(() => {
        setIsModalOpen(true);
        setVideoError(false);
        setRetryCount(0);
        setIsVideoLoading(true);
        startLoadingTimeout();
    }, [startLoadingTimeout]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setVideoError(false);
        setRetryCount(0);
        setIsVideoLoading(false);
        clearLoadingTimeout();
    }, [clearLoadingTimeout]);

    const handleVideoLoad = useCallback(() => {
        setIsVideoLoading(false);
        setVideoError(false);
        clearLoadingTimeout();
    }, [clearLoadingTimeout]);

    const handleVideoError = useCallback(() => {
        setVideoError(true);
        setIsVideoLoading(false);
        clearLoadingTimeout();
    }, [clearLoadingTimeout]);

    const retryVideo = useCallback(() => {
        setRetryCount(prev => prev + 1);
        setCacheBuster(Date.now().toString());
        setVideoError(false);
        setIsVideoLoading(true);
        startLoadingTimeout();
    }, [startLoadingTimeout]);

    const modalUrl = useMemo(() => {
        if (!videoId) return '';

        const params = new URLSearchParams({
            autoplay: '1',
            mute: '0',
            controls: '1',
            rel: '0'
        });

        if (cacheBuster) {
            params.set('t', cacheBuster);
        }

        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }, [videoId, cacheBuster]);


    const noCookieUrl = useMemo(() => {
        if (!videoId) return '';

        const params = new URLSearchParams({
            'autoplay': '1',
            'controls': '1',
            'rel': '0'
        });

        return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
    }, [videoId]);

    return (
        <>
            <div className='exerciseItem'>
                <h4>{title}</h4>

                <div className='video-container'>
                    {thumbnailUrl && (
                        <div className='thumbnail-container' onClick={openModal}>
                            <Image
                                src={thumbnailUrl}
                                alt={`Miniatura de ${title}`}
                                className='exercise-thumbnail'
                                width={320}
                                height={180}
                                loading="eager"
                                priority
                            />
                        </div>
                    )}

                    {!thumbnailUrl && (
                        <div className='no-thumbnail' onClick={openModal}>
                            <div className='play-button'>▶</div>
                            <p>Video no disponible</p>
                        </div>
                    )}
                </div>

                <button className='buttonYoutube' onClick={openModal}>
                    Ver Video
                </button>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal}>
                <div className="video-modal">
                    <h3>{title}</h3>

                    <div className="video-wrapper">
                        {isVideoLoading && !videoError && (
                            <div className="video-loading">
                                <div className="loading-spinner"></div>
                                <p>Cargando video...</p>
                            </div>
                        )}

                        {videoId && !videoError && (
                            <iframe
                                key={`modal-${videoId}-${retryCount}`}
                                src={retryCount < 2 ? modalUrl : noCookieUrl}
                                title={title}
                                width="560"
                                height="315"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                onLoad={handleVideoLoad}
                                onError={handleVideoError}
                                referrerPolicy="strict-origin-when-cross-origin"
                                style={{
                                    display: isVideoLoading ? 'none' : 'block',
                                    border: 'none',
                                    borderRadius: '8px'
                                }}
                            />
                        )}

                        {videoError && (
                            <div className="video-error">
                                <h4>⚠️ Video no disponible</h4>
                                <p>Este video puede tener restricciones de reproducción embebida.</p>

                                {retryCount < 3 && (
                                    <button onClick={retryVideo} className="retry-button">
                                        Reintentar {retryCount > 0 && '(método alternativo)'}
                                    </button>
                                )}

                                <button
                                    onClick={() => window.open(youtubeUrl, '_blank')}
                                    className="youtube-button"
                                >
                                    Ver en YouTube ↗
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button
                            className="primary"
                            onClick={() => window.open(youtubeUrl, '_blank')}
                        >
                            Abrir en YouTube
                        </button>
                        <button className="secondary" onClick={closeModal}>
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}