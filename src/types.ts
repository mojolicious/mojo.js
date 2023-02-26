import type {App} from './app.js';
import type {Context} from './context.js';
import type {Route} from './router/route.js';
import type {SafeString} from './util.js';
import type {ValidatorResult} from './validator/result.js';
import type {Agent} from 'node:http';
import type {Readable} from 'node:stream';
import type {Stream} from 'node:stream';
import type {URL} from 'node:url';
import type {InspectOptions} from 'node:util';
import type {CookieJar} from 'tough-cookie';

export type {JSONValue} from '@mojojs/util';

export interface JSONSchema {
  $id?: string;
  [key: string]: any;
}

export type MojoApp = App;
export type MojoRoute = Route;

// With default helpers from plugins
export interface MojoContext extends Context {
  assetTag: (path: string, attrs?: TagAttrs) => Promise<SafeString>;
  buttonTo: (target: URLTarget, attrs: TagAttrs, text: string) => Promise<SafeString>;
  checkBoxTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  colorFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  currentRoute: () => string | null;
  dateFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  datetimeFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  emailFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  exception: (error: Error) => Promise<boolean>;
  faviconTag: (file?: string) => Promise<SafeString>;
  fileFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  formFor: (target: URLTarget, attrs: TagAttrs, content: TagContent) => Promise<SafeString>;
  hiddenFieldTag: (name: string, value: string, attrs?: TagAttrs) => Promise<SafeString>;
  htmlException: (error: Error) => Promise<boolean>;
  htmlNotFound: () => Promise<boolean>;
  httpException: (error: any) => Promise<boolean>;
  imageTag: (target: string, attrs?: TagAttrs) => Promise<SafeString>;
  include: (options: MojoRenderOptions, stash: Record<string, any>) => Promise<SafeString | null>;
  inspect: (object: Record<string, any>, options: InspectOptions) => string;
  inputTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  jsonException: (error: Error) => Promise<boolean>;
  jsonNotFound: () => Promise<boolean>;
  labelFor: (ctx: MojoContext, name: string, value: TagContent, attrs?: TagAttrs) => Promise<SafeString>;
  linkTo: (target: URLTarget, attrs: TagAttrs, content: TagContent) => Promise<SafeString>;
  monthFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  notFound: () => Promise<boolean>;
  numberFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  passwordFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  proxyGet: (url: string | URL, config: UserAgentRequestOptions) => Promise<void>;
  proxyPost: (url: string | URL, config: UserAgentRequestOptions) => Promise<void>;
  proxyRequest: (config: UserAgentRequestOptions) => Promise<void>;
  radioButtonTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  rangeFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  scriptTag: (target: string, attrs?: TagAttrs) => Promise<SafeString>;
  searchFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  styleTag: (target: string, attrs?: TagAttrs) => Promise<SafeString>;
  submitButtonTag: (text?: string, attrs?: TagAttrs) => Promise<SafeString>;
  tag: (name: string, attrs?: TagAttrs, content?: TagContent) => Promise<SafeString>;
  telFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  textAreaTag: (name: string, attrs?: TagAttrs, content?: TagContent) => Promise<SafeString>;
  textFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  timeFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  txtException: (error: Error) => Promise<boolean>;
  txtNotFound: () => Promise<boolean>;
  urlFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  websocketException: (error: any) => Promise<boolean>;
  weekFieldTag: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  [key: string]: any;
}

export type MojoAction = (ctx: MojoContext, ...args: any[]) => any;

export interface MojoModels {
  [key: string]: any;
}

export type AnyArguments = Array<string | string[] | MojoAction | Record<string, string[] | RegExp>>;
export type RouteArguments = Array<string | MojoAction | Record<string, string[] | RegExp>>;
export type PlaceholderType = RegExp | string | string[];

export type TagAttrs = Record<string, string | boolean | Record<string, string>>;
export type TagContent = string | SafeString | Promise<string | SafeString> | (() => Promise<string | SafeString>);

export interface BackendInfo {
  name: string;
  [key: string]: any;
}

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

export type MojoURLOptions = {
  absolute?: boolean;
  query?: Record<string, string | string[]>;
  values?: Record<string, string>;
};

export interface MojoRenderOptions {
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
  formData?: Record<string, any>;
  insecure?: boolean;
  json?: any;
  method?: string;
  servername?: string;
  yaml?: any;
}
export interface UserAgentWebSocketOptions extends SharedUserAgentRequestOptions {
  json?: boolean;
  protocols?: string[];
}

export type URLTarget = string | [string, MojoURLOptions];

export type TestUserAgentOptions = UserAgentOptions & {tap?: Tap.Test};

export interface ValidationError {
  instancePath: string;
  message?: string;
  schemaPath: string;
}

export type ValidatorFunction = (data: any) => ValidatorResult;

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
