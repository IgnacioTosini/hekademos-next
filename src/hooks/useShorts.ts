import { useInfiniteQuery } from '@tanstack/react-query'
import { ExerciseService } from '@/services/ExerciseService'
import { useShortsStore } from '@/store/shorts.store'

export const useShorts = () => {
    const { appendShorts } = useShortsStore()

    return useInfiniteQuery({
        queryKey: ['shorts'],
        queryFn: async ({ pageParam = 0 }) => {
            const response = await ExerciseService.fetchShorts(pageParam, 8)

            if (!response.success) {
                throw new Error('Error fetching shorts')
            }

            const data = response.data

            appendShorts(
                data.content,
                data.number,
                !data.last
            )

            return data
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.last) return undefined
            return lastPage.number + 1
        },
        initialPageParam: 0
    })
}
