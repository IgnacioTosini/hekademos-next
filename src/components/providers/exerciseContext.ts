'use client';

import { createContext, useContext } from 'react'

type ExerciseUIContextProps = {
    searchTerm: string
    setSearchTerm: (term: string) => void
}

export const ExerciseContext = createContext<ExerciseUIContextProps | undefined>(undefined)

export const useExerciseContext = () => {
    const context = useContext(ExerciseContext)

    if (!context) {
        throw new Error('useExerciseContext must be used within an ExerciseProvider')
    }

    return context
}
