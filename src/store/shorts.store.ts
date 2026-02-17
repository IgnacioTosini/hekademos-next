import { ShortItem } from '@/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShortsState {
    shorts: ShortItem[]
    page: number
    hasMore: boolean
    setShorts: (data: ShortItem[], page: number, hasMore: boolean) => void
    appendShorts: (data: ShortItem[], page: number, hasMore: boolean) => void
    reset: () => void
}

export const useShortsStore = create<ShortsState>()(
    persist(
        (set) => ({
            shorts: [],
            page: 0,
            hasMore: true,

            setShorts: (data, page, hasMore) =>
                set({ shorts: data, page, hasMore }),

            appendShorts: (data, page, hasMore) =>
                set((state) => ({
                    shorts: [...state.shorts, ...data],
                    page,
                    hasMore,
                })),

            reset: () => set({ shorts: [], page: 0, hasMore: true }),
        }),
        {
            name: 'shorts-storage', // localStorage key
        }
    )
)
