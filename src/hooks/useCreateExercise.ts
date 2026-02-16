import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExerciseService } from '../services/ExerciseService'

export const useCreateExercise = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ExerciseService.createExercise,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises'] })
        }
    })
}
