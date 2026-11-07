import { apiService } from './apiService'
import { mockService } from './mockService'
import type { DataService } from './types'

/**
 * true → se usan DATOS DE PRUEBA simulados (Fase 2).
 * false → se conecta a la API REST real de FastAPI (Fase 3 en adelante).
 *
 * Se controla con VITE_USE_MOCKS en el archivo .env del frontend.
 */
export const IS_MOCK = import.meta.env.VITE_USE_MOCKS === 'true'

export const dataService: DataService = IS_MOCK ? mockService : apiService

export type * from './types'
