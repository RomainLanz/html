import type { PipelineSource, Readable, Writable } from 'stream';
import type { Children } from './';

declare global {
  /**
   * The `SUSPENSE_ROOT` is a global object that holds the state of all the suspense
   * components rendered in the server.
   */
  var SUSPENSE_ROOT: {
    /**
     * The requests map is a map of RequestId x SuspenseData containing the stream to
     * write the HTML, the number of running promises and if the first suspense has
     * already resolved.
     */
    requests: Map<number | string, RequestData>;

    /**
     * This value is used (and incremented shortly after) when no requestId is provided
     * for {@linkcode renderToStream}
     *
     * @default 1
     */
    requestCounter: number;

    /**
     * If the usage of suspense is enabled.
     *
     * @default false
     */
    enabled: boolean;

    /**
     * If we should automatically stream {@linkcode SuspenseScript} before the first
     * suspense is rendered. If you disable this setting, you need to manually load the
     * {@linkcode SuspenseScript} in your HTML before any suspense is rendered. Otherwise,
     * the suspense will not work.
     *
     * @default true
     */
    autoScript: boolean;
  };
}

/** Everything a suspense needs to know about its request lifecycle. */
export type RequestData = {
  /** If the first suspense has already resolved */
  sent: boolean;

  /** How many are still running */
  running: number;

  /**
   * The stream we should write
   *
   * WeakRef requires ES2021 typings (node 14+) to be installed.
   */
  stream: WeakRef<Writable>;
};

/**
 * A component that returns a fallback while the async children are loading.
 *
 * The `rid` prop is the one {@linkcode renderToStream} returns, this way the suspense
 * knows which request it belongs to.
 */
export function Suspense(props: SuspenseProps): JSX.Element;

/**
 * A component that keeps injecting html while the generator is running.
 *
 * The `rid` prop is the one {@linkcode renderToStream} returns, this way the suspense
 * knows which request it belongs to.
 */
export function SuspenseGenerator<T>(
  props: T extends string | Buffer
    ? SuspenseGeneratorProps<T>
    : SuspenseObjectGeneratorProps<T>
): JSX.Element;

/**
 * Transforms a component tree who may contain `Suspense` components into a stream of
 * HTML.
 *
 * @example
 *
 * ```tsx
 * // Simple nodejs webserver to render html
 *
 * http
 *   .createServer((req, res) => {
 *     res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
 *     const stream = renderToStream((r) => <AppWithSuspense rid={r} />);
 *     stream.pipe(res);
 *   })
 *   .listen(1227);
 *
 * // Prints out the rendered stream
 * const stream = renderToStream((r) => <AppWithSuspense rid={r} />);
 *
 * for await (const html of stream) {
 *   console.log(html.toString());
 * }
 * ```
 *
 * @param factory The component tree to render.
 * @param rid The request id to identify the request, if not provided, a new incrementing
 *   id will be used.
 * @see {@linkcode Suspense}
 */
export function renderToStream(
  factory: (this: void, rid: number | string) => JSX.Element,
  rid?: number | string
): Readable;

/**
 * Returns a promise that resolves to the entire HTML generated by the component tree.
 * **Suspense calls are waited for**.
 *
 * This method is a shorthand to call {@linkcode renderToStream} and collect its result
 * into a string.
 *
 * **Rendering to string will not give any benefits over streaming, it will only be
 * slower.**
 *
 * @example
 *
 * ```tsx
 * // Does not uses suspense benefits! Useful for testing. Prefer to
 * // use renderToStream instead.
 * const html = await renderToString(r => <AppWithSuspense rid={r} />) console.log(html)
 *
 * ```
 *
 * @param factory The component tree to render
 * @param rid The request id to identify the request, if not provided, a new incrementing
 *   id will be used. @see {@linkcode renderToStream}
 */
export function renderToString(
  factory: (this: void, rid: number | string) => JSX.Element,
  rid?: number | string
): Promise<string>;

/**
 * This script needs to be loaded at the top of the page. You do not need to load it
 * manually, unless GLOBAL_SUSPENSE.autoScript is set to false.
 *
 * @see {@linkcode Suspense}
 */
export const SuspenseScript: string;

/**
 * The props for the `Suspense` component.
 *
 * @see {@linkcode Suspense}
 */
export interface SuspenseProps {
  /** The request id is used to identify the request for this suspense. */
  rid: number | string;

  /** The fallback to render while the async children are loading. */
  fallback: JSX.Element;

  /** The async children to render as soon as they are ready. */
  children: Children;

  /**
   * This error boundary is used to catch any error thrown by an async component and
   * streams its fallback instead.
   *
   * ### Undefined behaviors happens on each browser kind when the html stream is unexpected closed by the server if an error is thrown. You should always define an error boundary to catch errors.
   *
   * This does not catches for errors thrown by the suspense itself or async fallback
   * components. Please use {@linkcode ErrorBoundary} to catch them instead.
   */
  catch?: JSX.Element | ((error: unknown) => JSX.Element);
}

export interface SuspenseGeneratorProps<T> {
  /** The request id is used to identify the request for this suspense. */
  rid: number | string;

  /** The request id is used to identify the request for this suspense. */
  source: PipelineSource<T>;
}

export interface SuspenseObjectGeneratorProps<T> extends SuspenseGeneratorProps<T> {
  /** The map function to render each component as soon as a new value is yielded. */
  map: (value: T, encoding?: unknown) => JSX.Element | PromiseLike<JSX.Element>;
}

/**
 * Internal function used to pipe the HTML to the stream. Users should not use this
 * function directly. This function assumes that the stream is available and the request
 * id is valid.
 *
 * This is helpful when integrating @kitajs/html suspense support into your own runtime.
 *
 * @internal
 */
export function pipeHtml(html: JSX.Element, stream: Writable, rid: number | string): void;
