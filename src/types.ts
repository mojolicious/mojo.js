import type {App} from './app.js';
import type {Context} from './context.js';
import type {SafeString} from './util.js';
import type {ValidatorResult} from './validator/result.js';
import type {Agent} from 'http';
import type {Readable} from 'stream';
import type {Stream} from 'stream';
import type {CookieJar} from 'tough-cookie';
import type {URL} from 'url';
import type {InspectOptions} from 'util';

// Plain JSON
export type JSONValue = string | number | boolean | null | JSONValue[] | {[key: string]: JSONValue};
export type JSONObject = {[key: string]: JSONValue};

export type MojoApp = App;

// With default helpers from plugins
export interface MojoContext extends Context {
  buttonTo(target: URLTarget, attrs: Record<string, string>, text: string): SafeString;
  currentRoute: () => string | null;
  exception: (error: Error) => Promise<boolean>;
  faviconTag: (file?: string) => SafeString;
  formFor(target: URLTarget, attrs: Record<string, string>, content: string | SafeString): SafeString;
  htmlException: (error: Error) => Promise<boolean>;
  htmlNotFound: () => Promise<boolean>;
  httpException: (error: any) => Promise<boolean>;
  imageTag: (target: string, attrs?: Record<string, string>) => SafeString;
  include: (options: RenderOptions, stash: Record<string, any>) => Promise<SafeString | null>;
  inpsect: (object: Record<string, any>, options: InspectOptions) => string;
  inputTag: (ctx: MojoContext, name: string, attrs: Record<string, string>) => Promise<SafeString>;
  jsonException: (error: Error) => Promise<boolean>;
  jsonNotFound: () => Promise<boolean>;
  linkTo: (target: URLTarget, attrs: Record<string, string>, content: string | SafeString) => SafeString;
  scriptTag: (target: string) => SafeString;
  styleTag: (target: string) => SafeString;
  submitButtonTag(text?: string, attrs?: Record<string, string>): SafeString;
  tag: (name: string, attrs?: Record<string, string>, content?: string | SafeString) => SafeString;
  txtException: (error: Error) => Promise<boolean>;
  txtNotFound: () => Promise<boolean>;
  notFound: () => Promise<boolean>;
  websocketException: (error: any) => Promise<boolean>;
  [key: string]: any;
}

export type MojoAction = (ctx: MojoContext, ...args: any[]) => any;

export interface MojoModels {
  [key: string]: any;
}

export type AnyArguments = Array<string | string[] | MojoAction | Record<string, string[] | RegExp>>;
export type RouteArguments = Array<string | MojoAction | Record<string, string[] | RegExp>>;
export type PlaceholderType = RegExp | string | string[];

export interface SessionData {
  expiration?: number;
  expires?: number;
  flash?: {[key: string]: any};
  nextFlash?: {[key: string]: any};
  [key: string]: any;
}

export interface AppOptions {
  config?: Record<string, any>;
  exceptionFormat?: string;
  detectImport?: boolean;
  mode?: string;
  secrets?: string[];
}

export interface ConfigOptions {
  ext?: string;
  file?: string;
}

export interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
}

export interface RenderOptions {
  engine?: string;
  format?: string;
  inline?: string;
  inlineLayout?: string;
  json?: any;
  layout?: string;
  maybe?: boolean;
  pretty?: boolean;
  status?: number;
  text?: string;
  variant?: string;
  view?: string;
  yaml?: any;
  [key: string]: any;
}

export interface ServerOptions {
  cluster?: boolean;
  headersTimeout?: number;
  keepAliveTimeout?: number;
  listen?: string[];
  maxRequestsPerSocket?: number;
  quiet?: boolean;
  requestTimeout?: number;
  reverseProxy?: boolean;
  workers?: number;
}

export interface ServerRequestOptions {
  body: Readable;
  headers: string[];
  isSecure: boolean;
  isWebSocket: boolean;
  method?: string;
  remoteAddress?: string;
  reverseProxy: boolean;
  url?: string;
}

export type ServerResponseBody = string | Buffer | Stream | undefined;

export interface UserAgentOptions {
  baseURL?: string | URL;
  cookieJar?: CookieJar;
  maxRedirects?: number;
  name?: string;
}
interface SharedUserAgentRequestOptions {
  auth?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  socketPath?: string;
  url?: string | URL;
}
export interface UserAgentRequestOptions extends SharedUserAgentRequestOptions {
  agent?: Agent;
  ca?: string | string[] | Buffer | Buffer[];
  body?: string | Buffer | NodeJS.ReadableStream;
  form?: Record<string, string>;
  formData?: Record<string, string> | FormData;
  insecure?: boolean;
  json?: JSONValue;
  method?: string;
  servername?: string;
  yaml?: any;
}
export interface UserAgentWebSocketOptions extends SharedUserAgentRequestOptions {
  json?: boolean;
  protocols?: string[];
}

export type URLOptions = {absolute?: boolean; query?: Record<string, string>; values?: Record<string, string>};

export type URLTarget = string | [string, URLOptions];

export type TestUserAgentOptions = UserAgentOptions & {tap?: Tap.Test};

export interface ValidationError {
  instancePath: string;
  message?: string;
  schemaPath: string;
}

export type ValidatorFunction = (data: JSONObject) => ValidatorResult;

interface WebSocketBackendEvents {
  close: () => void;
  error: (this: WebSocketBackend, error: Error) => void;
  message: (this: WebSocketBackend, message: Buffer, isBinary: boolean) => void;
  ping: () => void;
  pong: () => void;
}

export interface WebSocketBackend {
  close: (code?: number, reason?: string | Buffer) => void;
  on: <T extends keyof WebSocketBackendEvents>(event: T, listener: WebSocketBackendEvents[T]) => this;
  ping: (data?: any, mask?: boolean, cb?: (err: Error) => void) => void;
  send: (data: any, cb?: (err?: Error) => void) => void;
}
