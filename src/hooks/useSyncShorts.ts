import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExerciseService } from '../services/ExerciseService'

export const useSyncShorts = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const response = await ExerciseService.triggerManualSync()

            if (!response.success) {
                throw new Error('Error syncing')
            }

            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shorts'] })
        },
    })
}
