"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaPlay } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { getYoutubeVideoId } from "@/utils/youtube";
import "./_youtubeVideoButton.scss";

type Props = {
    videoUrl?: string;
    title: string;
};

export const YoutubeVideoButton = ({ videoUrl, title }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const videoId = useMemo(() => getYoutubeVideoId(videoUrl), [videoUrl]);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsOpen(false);
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [isOpen]);

    if (!videoId) return null;

    return (
        <>
            <button type="button" className="youtube-video-trigger" onClick={() => setIsOpen(true)} aria-label={`Ver video de ${title}`}>
                <FaPlay /> Ver video
            </button>

            {isOpen && createPortal(
                <div className="youtube-video-modal" role="dialog" aria-modal="true" aria-label={`Video de ${title}`} onMouseDown={() => setIsOpen(false)}>
                    <div className="youtube-video-dialog" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="youtube-video-header">
                            <h3>{title}</h3>
                            <button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar video"><IoClose /></button>
                        </div>
                        <div className="youtube-video-frame">
                            <iframe
                                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                                title={`Video de ${title}`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
