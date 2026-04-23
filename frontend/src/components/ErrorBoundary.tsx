/**
 * Top-level error boundary.
 *
 * - Renders a friendly fallback instead of a white screen.
 * - Hides stack traces in production.
 * - Ships errors to the logging sink (console + optional custom hook).
 */
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional hook called when an error is caught (e.g. to ship to Sentry). */
  onError?: (error: Error, info: ErrorInfo) => void
  /** Custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] caught', { error, info })
    this.props.onError?.(error, info)
  }

  private reset = () => this.setState({ hasError: false, error: null })

  public render() {
    if (!this.state.hasError) return this.props.children

    const err = this.state.error
    if (this.props.fallback && err) {
      return this.props.fallback(err, this.reset)
    }

    const isProd = import.meta.env.PROD
    return (
      <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-dark-800 border border-dark-700 rounded-lg p-6 shadow-xl">
          <h1 className="text-2xl font-semibold text-red-400 mb-2">
            Something went wrong
          </h1>
          <p className="text-dark-300 mb-4">
            We hit an unexpected error rendering the page. You can try again, or
            head back to the dashboard.
          </p>
          {!isProd && err && (
            <pre className="bg-black/40 text-red-300 text-xs p-3 rounded overflow-auto max-h-40 mb-4">
              {err.message}
              {err.stack ? `\n\n${err.stack}` : ''}
            </pre>
          )}
          <div className="flex gap-2">
            <button
              onClick={this.reset}
              className="flex-1 py-2 px-4 rounded bg-primary-600 hover:bg-primary-500 transition"
            >
              Try again
            </button>
            <a
              href="/"
              className="flex-1 py-2 px-4 rounded bg-dark-700 hover:bg-dark-600 text-center transition"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
