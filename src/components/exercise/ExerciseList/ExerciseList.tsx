'use client';

import { useMemo, useEffect, useRef } from 'react';
import { ExerciseItem } from '../ExerciseItem/ExerciseItem';
import { useShorts } from '@/hooks/useShorts';
import { useExerciseContext } from '@/components/providers/exerciseContext';
import { Exercise } from '@/types';
import './_exerciseList.scss'

export const ExerciseList = () => {

    const { searchTerm } = useExerciseContext();

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useShorts();

    // 🔥 Flatten de todas las páginas
    const shorts = data?.pages.flatMap((page) =>
        page.content.map((exercise: Exercise) => ({
            title: exercise.name,
            url: exercise.videoUrl
        }))
    ) ?? [];

    // 🔥 Filtro por búsqueda
    const filteredItems = useMemo(() => {
        if (!searchTerm) return shorts;

        return shorts.filter(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [shorts, searchTerm]);

    // 🔥 Infinite Scroll Observer
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!hasNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNextPage();
                }
            },
            { threshold: 1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, fetchNextPage]);

    // 🔥 Loading inicial
    if (isLoading) {
        return (
            <div className='exerciseListContainer'>
                <div className="initial-loading">
                    <div className="loading-spinner">🔄</div>
                    <p>Cargando ejercicios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='exerciseListContainer'>

            <h3>
                {filteredItems.length} Ejercicio{filteredItems.length !== 1 ? 's' : ''}
                {searchTerm
                    ? ` encontrado${filteredItems.length !== 1 ? 's' : ''} para "${searchTerm}"`
                    : ' disponibles'}
            </h3>

            {filteredItems.length === 0 ? (
                <div className="no-exercises">
                    <p>
                        {searchTerm
                            ? `No se encontraron ejercicios que coincidan con "${searchTerm}"`
                            : "No hay ejercicios disponibles."
                        }
                    </p>
                </div>
            ) : (
                <>
                    <ul className='exerciseList'>
                        {filteredItems.map((item, index) => (
                            <li key={`${item.url}-${index}`}>
                                <ExerciseItem
                                    title={item.title}
                                    youtubeUrl={item.url}
                                />
                            </li>
                        ))}
                    </ul>

                    {/* 🔥 Trigger invisible */}
                    {hasNextPage && <div ref={loadMoreRef} style={{ height: 1 }} />}

                    {/* 🔥 Loader de siguiente página */}
                    {isFetchingNextPage && (
                        <div className="loading-more">
                            🔄 Cargando más ejercicios...
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
