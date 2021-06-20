import type App from './app.js';
import type Context from './context.js';
import type WebSocket from './websocket.js';
import type {CookieJar} from 'tough-cookie';

export type MojoApp = App;

export interface MojoContext extends Context { [key: string]: any }

export type MojoAction = (ctx: MojoContext, ...args: any[]) => any;

export type MojoStash = Record<string, any>;

export type Decoration = ((...args: any[]) => any) & {get?: () => any, set?: (value: any) => any};

export type Hook = ((app: App, ...args: any[]) => any) | MojoAction;

export type Condition = (ctx: MojoContext, requirements: any) => boolean;

export type Plugin = (app: App, options: MojoStash) => any;

// Route arguments
export type AnyArguments = Array<string | string[] | MojoAction | Record<string, string[] | RegExp>>;
export type RouteArguments = Array<string | MojoAction | Record<string, string[] | RegExp>>;

export type PlaceholderType = RegExp | string | string[];

export type MojoViewEngine = (ctx: MojoContext, options: MojoRenderOptions) => Promise<Buffer>;

export interface MojoRenderOptions {
  engine?: string,
  format?: string,
  inline?: string,
  inlineLayout?: string,
  json?: any,
  layout?: string,
  maybe?: boolean,
  pretty?: boolean,
  status?: number,
  text?: string,
  view?: string,
  [key: string]: any
}

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

export type WebSocketHandler = (ws: WebSocket) => void | Promise<void>;

export interface ServerOptions {
  cluster?: boolean,
  listen?: string[],
  quiet?: boolean,
  reverseProxy?: boolean,
  workers?: number
}

export interface ServerRequestOptions { isWebSocket: boolean, reverseProxy: boolean }
