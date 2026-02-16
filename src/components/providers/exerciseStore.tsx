'use client'

import { useState } from 'react'
import { ExerciseContext } from './exerciseContext'

export const ExerciseProvider = ({
    children,
}: {
    children: React.ReactNode
}) => {
    const [searchTerm, setSearchTerm] = useState('')

    return (
        <ExerciseContext.Provider
            value={{
                searchTerm,
                setSearchTerm,
            }}
        >
            {children}
        </ExerciseContext.Provider>
    )
}
