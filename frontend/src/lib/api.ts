/**
 * Cliente HTTP mínimo para la API.
 *
 * - Usa rutas relativas (/api) → mismo origen, sin CORS.
 * - `credentials: 'include'` para enviar la cookie de sesión HttpOnly.
 * - Añade la cabecera X-CSRF-Token en métodos mutables (double-submit cookie).
 * - Nunca guarda credenciales en localStorage/sessionStorage.
 */

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

/** Traduce códigos HTTP a mensajes comprensibles para usuarios no técnicos. */
function friendlyMessage(status: number): string {
  if (status === 0) return 'No se puede conectar con el servidor. Comprueba que está en marcha.'
  if (status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
  if (status === 403) return 'No tienes permiso para realizar esta acción.'
  if (status === 404) return 'El elemento solicitado no existe.'
  if (status === 409) return 'El elemento ya existe.'
  if (status === 413) return 'El archivo es demasiado grande.'
  if (status >= 500) return 'Se ha producido un error en el servidor. Inténtalo de nuevo más tarde.'
  return 'No se ha podido completar la operación.'
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)

  if (!SAFE_METHODS.has(method)) {
    const csrf = readCookie('csrf_token')
    if (csrf) headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`/api${path}`, { ...init, method, headers, credentials: 'include' })
  } catch {
    throw new ApiError(0, friendlyMessage(0))
  }

  if (!response.ok) {
    let detail: unknown
    try {
      detail = await response.json()
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(response.status, friendlyMessage(response.status), detail)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

