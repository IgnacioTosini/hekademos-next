import { useInfiniteQuery } from '@tanstack/react-query'
import { ExerciseService } from '@/services/ExerciseService'

export const useShorts = () => {
    return useInfiniteQuery({
        queryKey: ['shorts'],
        queryFn: async ({ pageParam = 0 }) => {
            const response = await ExerciseService.fetchShorts(pageParam, 8)

            if (!response.success) {
                throw new Error('Error fetching shorts')
            }

            return response.data
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.last) return undefined
            return lastPage.number + 1
        },
        initialPageParam: 0,
    })
}
