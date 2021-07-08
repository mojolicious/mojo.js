import type {App} from './app.js';
import type {Context} from './context.js';
import type {Agent} from 'http';
import type {CookieJar} from 'tough-cookie';
import type {URL} from 'url';

// Helper types for debugging
export type Expand<T> = T extends infer O ? {[K in keyof O]: O[K]} : never;
export type ExpandRecursive<T> = T extends infer O ? {[K in keyof O]: ExpandRecursive<O[K]>} : never;

// Plain JSON
export type JSONValue = string | number | boolean | null | JSONValue[] | {[key: string]: JSONValue};

export type MojoApp = App;

export interface MojoContext extends Context { [key: string]: any }

export type MojoAction = (ctx: MojoContext, ...args: any[]) => any;

export type AnyArguments = Array<string | string[] | MojoAction | Record<string, string[] | RegExp>>;
export type RouteArguments = Array<string | MojoAction | Record<string, string[] | RegExp>>;
export type PlaceholderType = RegExp | string | string[];

export interface ClientOptions {
  baseURL?: string | URL,
  cookieJar?: CookieJar,
  maxRedirects?: number,
  name?: string
}
interface SharedClientRequestOptions {
  auth?: string,
  headers?: Record<string, string>,
  query?: Record<string, string>,
  url?: string | URL
}
export interface MojoClientRequestOptions extends SharedClientRequestOptions {
  agent?: Agent,
  body?: string | Buffer | NodeJS.ReadableStream,
  form?: Record<string, string>,
  formData?: Record<string, string> | FormData,
  indecure?: boolean,
  method?: string,
  json?: JSONValue
}
export interface MojoClientWebSocketOptions extends SharedClientRequestOptions {
  json?: boolean,
  protocols?: string[]
}

export type TestClientOptions = ClientOptions & {tap?: Tap.Tap};

export interface ServerRequestOptions { isWebSocket: boolean, reverseProxy: boolean }

interface DefaultRenderOptions {
  engine?: string,
  format?: string,
  inline?: string,
  inlineLayout?: string,
  json?: JSONValue,
  layout?: string,
  maybe?: boolean,
  pretty?: boolean,
  status?: number,
  text?: string,
  view?: string
}

export interface MojoRenderOptions extends DefaultRenderOptions { [key: string]: any }

export interface AppOptions {
  config?: Record<string, any>,
  exceptionFormat?: string,
  detectImport?: boolean,
  mode?: string,
  secrets?: string[]
}
