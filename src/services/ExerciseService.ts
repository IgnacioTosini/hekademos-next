import axios from "axios"
import type { ApiResponse, Exercise } from "../types"

const baseUrl = process.env.PROD
    ? process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL
    : process.env.NEXT_PUBLIC_API_BASE_URL_PROD
const API_BASE_URL = baseUrl?.endsWith('/api/exercises') ? baseUrl : `${baseUrl}/api/exercises`;
export class ExerciseService {
    static async fetchExercises(): Promise<ApiResponse<Exercise[]>> {
        try {
            const response = await axios.get<ApiResponse<Exercise[]>>(API_BASE_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching exercises:', error);
            return {
                success: false,
                message: 'Error al obtener ejercicios',
                data: []
            };
        }
    }

    static async fetchExerciseById(id: string): Promise<ApiResponse<Exercise>> {
        try {
            const response = await axios.get<ApiResponse<Exercise>>(`${API_BASE_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching exercise by id:', error);
            return {
                success: false,
                message: 'Error al obtener ejercicio',
                data: {} as Exercise
            };
        }
    }

    static async fetchExerciseByName(name: string): Promise<ApiResponse<Exercise[]>> {
        try {
            const response = await axios.get<ApiResponse<Exercise[]>>(`${API_BASE_URL}/by-name/${encodeURIComponent(name)}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching exercise by name:', error);
            return {
                success: false,
                message: 'Error al buscar ejercicio por nombre',
                data: []
            };
        }
    }

    static async fetchExerciseByYoutubeUrl(youtubeUrl: string): Promise<ApiResponse<Exercise[]>> {
        try {
            const response = await axios.get<ApiResponse<Exercise[]>>(`${API_BASE_URL}/by-youtube-url`, {
                params: { youtubeUrl }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching exercise by youtube url:', error);
            return {
                success: false,
                message: 'Error al buscar ejercicio por URL de YouTube',
                data: []
            };
        }
    }

    static async checkSyncStatus(): Promise<ApiResponse<boolean>> {
        try {
            const response = await axios.get<ApiResponse<boolean>>(`${API_BASE_URL}/sync-status`);
            return response.data;
        } catch (error) {
            console.error('Error checking sync status:', error);
            return {
                success: false,
                message: 'Error al verificar estado de sincronización',
                data: true // Por defecto asumir que necesita sync
            };
        }
    }

    static async createExercise(exercise: Omit<Exercise, 'id'>): Promise<ApiResponse<Exercise>> {
        try {
            const response = await axios.post<ApiResponse<Exercise>>(API_BASE_URL, exercise);
            return response.data;
        } catch (error) {
            console.error('Error creating exercise:', error);
            return {
                success: false,
                message: 'Error al crear ejercicio',
                data: {} as Exercise
            };
        }
    }

    static async updateExercise(id: string, exercise: Partial<Omit<Exercise, 'id'>>): Promise<ApiResponse<Exercise>> {
        try {
            const response = await axios.put<ApiResponse<Exercise>>(`${API_BASE_URL}/${id}`, exercise);
            return response.data;
        } catch (error) {
            console.error('Error updating exercise:', error);
            return {
                success: false,
                message: 'Error al actualizar ejercicio',
                data: {} as Exercise
            };
        }
    }

    static async deleteExercise(id: string): Promise<ApiResponse<null>> {
        try {
            const response = await axios.delete<ApiResponse<null>>(`${API_BASE_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting exercise:', error);
            return {
                success: false,
                message: 'Error al eliminar ejercicio',
                data: null
            };
        }
    }

    static async triggerManualSync(): Promise<ApiResponse<string>> {
        try {
            console.log('🔄 Iniciando sincronización desde backend...');
            const response = await axios.post<ApiResponse<string>>(`${API_BASE_URL}/sync`);

            if (response.data.success) {
                console.log('✅ Sincronización exitosa desde backend');
            }

            return response.data;
        } catch (error) {
            console.error('❌ Error triggering manual sync:', error);
            return {
                success: false,
                message: 'Error al iniciar sincronización manual',
                data: ''
            };
        }
    }

    // ✅ NUEVO MÉTODO: Obtener shorts desde BD (más rápido)
    static async fetchShortsFromDB(): Promise<ApiResponse<Exercise[]>> {
        try {
            console.log('⚡ Obteniendo shorts desde BD (rápido)...');
            const response = await axios.get<ApiResponse<Exercise[]>>(`${API_BASE_URL}/shorts`);
            console.log(`📊 Shorts desde BD:`, response.data.data?.length || 0);
            return response.data;
        } catch (error) {
            console.error('Error fetching shorts from DB:', error);
            return {
                success: false,
                message: 'Error al obtener shorts desde BD',
                data: []
            };
        }
    }

    // ✅ NUEVO MÉTODO: Sincronización en segundo plano
    static async backgroundSync(): Promise<ApiResponse<string>> {
        try {
            console.log('🔄 Iniciando sincronización en segundo plano...');
            const response = await axios.post<ApiResponse<string>>(`${API_BASE_URL}/background-sync`);
            return response.data;
        } catch (error) {
            console.error('❌ Error en background sync:', error);
            return {
                success: false,
                message: 'Error en sincronización de segundo plano',
                data: ''
            };
        }
    }

    // ✅ MODIFICAR: fetchShorts para usar BD primero
    static async fetchShorts(page: number, size: number) {
        const response = await fetch(
            `${API_BASE_URL}/shorts?page=${page}&size=${size}`
        )

        return response.json()
    }
}