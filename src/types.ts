import type App from './app.js';
import type {CookieJar} from 'tough-cookie';
import type HTTPContext from './context/http.js';
import type WebSocketContext from './context/websocket.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface HTTPContextWithHelpers extends HTTPContext { [key: string]: any }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface WebSocketContextWithHelpers extends WebSocketContext { [key: string]: any }

export type MojoContext = HTTPContextWithHelpers | WebSocketContextWithHelpers;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MojoAction = (ctx: MojoContext, ...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MojoDecoration = ((...args: any[]) => any) & {get?: () => any, set?: (value: any) => any};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MojoHook = ((app: App, ...args: any[]) => any) | MojoAction;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MojoStash {[key: string]: any}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MojoPlugin = (app: App, options: MojoStash) => any;

// Route arguments
export type AnyArguments = Array<string | string[] | MojoAction | {[key: string]: string[] | RegExp}>;
export type RouteArguments = Array<string | MojoAction | {[key: string]: string[] | RegExp}>;

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
