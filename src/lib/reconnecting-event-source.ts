/**
 * ReconnectingEventSource - EventSource wrapper with automatic reconnection
 *
 * Features:
 * - Exponential backoff (1s, 2s, 4s, 8s... max 30s)
 * - Random jitter to prevent thundering herd
 * - Max retry limit
 * - Connection state tracking
 * - Works around Firefox 1-reconnect limitation
 */

export interface ReconnectingEventSourceOptions {
  maxRetries?: number
  initialRetryDelay?: number
  maxRetryDelay?: number
  onReconnect?: (attempt: number) => void
  onMaxRetriesReached?: () => void
  onStateChange?: (state: ConnectionState) => void
}

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'failed'

export class ReconnectingEventSource {
  private url: string
  private eventSource: EventSource | null = null
  private listeners: Map<string, Set<(event: MessageEvent) => void>> = new Map()
  private retryCount = 0
  private retryTimeout: ReturnType<typeof setTimeout> | null = null
  private state: ConnectionState = 'connecting'
  private aborted = false

  private readonly options: Required<ReconnectingEventSourceOptions>

  constructor(url: string, options: ReconnectingEventSourceOptions = {}) {
    this.url = url
    this.options = {
      maxRetries: options.maxRetries ?? 10,
      initialRetryDelay: options.initialRetryDelay ?? 1000,
      maxRetryDelay: options.maxRetryDelay ?? 30000,
      onReconnect: options.onReconnect ?? (() => {}),
      onMaxRetriesReached: options.onMaxRetriesReached ?? (() => {}),
      onStateChange: options.onStateChange ?? (() => {}),
    }

    this.connect()
  }

  private connect(): void {
    if (this.aborted) return

    try {
      this.eventSource = new EventSource(this.url)
      this.setState('connecting')

      this.eventSource.onopen = () => {
        this.retryCount = 0
        this.setState('connected')
      }

      this.eventSource.onerror = () => {
        if (this.aborted) return
        this.handleDisconnect()
      }

      // Re-attach all registered listeners to the new EventSource
      this.listeners.forEach((callbacks, eventType) => {
        callbacks.forEach((callback) => {
          this.eventSource?.addEventListener(eventType, callback as EventListener)
        })
      })
    } catch {
      this.handleDisconnect()
    }
  }

  private handleDisconnect(): void {
    if (this.aborted) return

    // Close current connection
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    // Check retry limit
    if (this.retryCount >= this.options.maxRetries) {
      this.setState('failed')
      this.options.onMaxRetriesReached()
      return
    }

    this.setState('reconnecting')
    this.retryCount++
    this.options.onReconnect(this.retryCount)

    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      this.options.initialRetryDelay * Math.pow(2, this.retryCount - 1),
      this.options.maxRetryDelay
    )
    // Add random jitter (0-25% of base delay)
    const jitter = Math.random() * 0.25 * baseDelay
    const delay = baseDelay + jitter

    this.retryTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state
      this.options.onStateChange(state)
    }
  }

  addEventListener(type: string, callback: (event: MessageEvent) => void): void {
    // Store in our map for reconnection
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(callback)

    // Add to current EventSource if exists
    if (this.eventSource) {
      this.eventSource.addEventListener(type, callback as EventListener)
    }
  }

  removeEventListener(type: string, callback: (event: MessageEvent) => void): void {
    const callbacks = this.listeners.get(type)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.listeners.delete(type)
      }
    }

    if (this.eventSource) {
      this.eventSource.removeEventListener(type, callback as EventListener)
    }
  }

  close(): void {
    this.aborted = true

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.listeners.clear()
    this.setState('closed')
  }

  getState(): ConnectionState {
    return this.state
  }

  getRetryCount(): number {
    return this.retryCount
  }

  // Standard EventSource properties for compatibility
  get readyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED
  }
}

/**
 * Helper function to create a reconnecting event source for batch progress
 */
export function createBatchProgressStream(
  baseUrl: string,
  batchId: string,
  options?: ReconnectingEventSourceOptions
): ReconnectingEventSource {
  return new ReconnectingEventSource(
    `${baseUrl}/extract-batch-worker/${batchId}/stream`,
    {
      maxRetries: 5,
      initialRetryDelay: 1000,
      maxRetryDelay: 10000,
      ...options,
    }
  )
}
