import type App from './app.js';
import type Context from './context.js';
import type WebSocket from './websocket.js';
import type {CookieJar} from 'tough-cookie';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MojoContext extends Context { [key: string]: any }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MojoAction = (ctx: MojoContext, ...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MojoStash = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Decoration = ((...args: any[]) => any) & {get?: () => any, set?: (value: any) => any};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Hook = ((app: App, ...args: any[]) => any) | MojoAction;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Condition = (ctx: MojoContext, requirements: any) => boolean;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Plugin = (app: App, options: MojoStash) => any;

// Route arguments
export type AnyArguments = Array<string | string[] | MojoAction | Record<string, string[] | RegExp>>;
export type RouteArguments = Array<string | MojoAction | Record<string, string[] | RegExp>>;

export type PlaceholderType = RegExp | string | string[];

export interface AppOptions {
  config?: MojoStash,
  exceptionFormat?: string,
  detectImport?: boolean,
  mode?: string,
  secrets?: string[]
}

export interface ClientOptions {
  baseURL?: string,
  cookieJar?: CookieJar,
  maxRedirects?: number,
  name?: string
}

export type TestClientOptions = ClientOptions & {tap?: Tap.Tap};

export interface MojoRenderOptions {
  engine?: string,
  format?: string,
  inline?: string,
  inlineLayout?: string,
  json?: any,
  maybe?: boolean,
  pretty?: boolean,
  status?: number,
  text?: string,
  view?: string,
  [key: string]: any
}

export type MojoWebSocketHandler = (ws: WebSocket) => void | Promise<void>;

export interface ServerOptions {
  cluster?: boolean,
  listen?: string[],
  quiet?: boolean,
  reverseProxy?: boolean,
  workers?: number
}

export interface ServerRequestOptions { isWebSocket: boolean, reverseProxy: boolean }
