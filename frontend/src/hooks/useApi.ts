import { useCallback, useState } from 'react'

/**
 * API state for tracking request status
 */
interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * API response wrapper matching backend ApiResponse type
 */
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Generic API hook for making HTTP requests
 *
 * @returns {object} API state and request function
 */
export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  /**
   * Make an API request
   */
  const request = useCallback(
    async (url: string, options?: RequestInit): Promise<T | null> => {
      setState({ data: null, loading: true, error: null })

      try {
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          ...options,
        })

        const json: ApiResponse<T> = await response.json()

        if (!response.ok || !json.success) {
          const errorMessage = json.error?.message || `HTTP error ${response.status}`
          setState({ data: null, loading: false, error: errorMessage })
          return null
        }

        const data = json.data ?? null
        setState({ data, loading: false, error: null })
        return data
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setState({ data: null, loading: false, error: message })
        return null
      }
    },
    []
  )

  /**
   * Make a GET request
   */
  const get = useCallback(
    (url: string) => request(url, { method: 'GET' }),
    [request]
  )

  /**
   * Make a POST request
   */
  const post = useCallback(
    (url: string, body?: unknown) =>
      request(url, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    [request]
  )

  /**
   * Make a PUT request
   */
  const put = useCallback(
    (url: string, body?: unknown) =>
      request(url, {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      }),
    [request]
  )

  /**
   * Make a DELETE request
   */
  const del = useCallback(
    (url: string) => request(url, { method: 'DELETE' }),
    [request]
  )

  return {
    ...state,
    request,
    get,
    post,
    put,
    delete: del,
  }
}
