'use client'

import { ExerciseList, SearchBar } from '@/components'
import { useSyncShorts } from '@/hooks/useSyncShorts'
import './_exercisesPage.scss'

export default function ExercisesPage() {
  const syncMutation = useSyncShorts()

  return (
    <div className='exercisePage'>
      <div className='exerciseHeader'>
        <h1>Biblioteca de Ejercicios</h1>
        <p>
          Descubrí nuestra colección completa de ejercicios para entrenar tu
          cuerpo con conciencia y propósito.
        </p>

        <div className='syncSection'>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending
              ? 'Sincronizando...'
              : '🔄 Sincronizar con YouTube'}
          </button>
        </div>
      </div>

      <div className='exerciseContent'>
        <SearchBar />
        <ExerciseList />
      </div>
    </div>
  )
}
