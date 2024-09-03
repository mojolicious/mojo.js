import type {App} from './app.js';
import type {Context} from './context.js';
import type {Route} from './router/route.js';
import type {SafeString} from './util.js';
import type {ValidatorResult} from './validator/result.js';
import type {Agent} from 'node:http';
import type {Readable, Stream} from 'node:stream';
import type {URL} from 'node:url';
import type {InspectOptions} from 'node:util';
import type {Test} from 'tap';
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
  tags: MojoTags;
  currentRoute: () => string | null;
  exception: (error: Error) => Promise<boolean>;
  htmlException: (error: Error) => Promise<boolean>;
  htmlNotFound: () => Promise<boolean>;
  httpException: (error: any) => Promise<boolean>;
  include: (options: MojoRenderOptions, stash: Record<string, any>) => Promise<SafeString | null>;
  inspect: (object: Record<string, any>, options: InspectOptions) => string;
  jsonException: (error: Error) => Promise<boolean>;
  jsonNotFound: () => Promise<boolean>;
  notFound: () => Promise<boolean>;
  proxyGet: (url: string | URL, config: UserAgentRequestOptions) => Promise<void>;
  proxyPost: (url: string | URL, config: UserAgentRequestOptions) => Promise<void>;
  proxyRequest: (config: UserAgentRequestOptions) => Promise<void>;
  txtException: (error: Error) => Promise<boolean>;
  txtNotFound: () => Promise<boolean>;
  websocketException: (error: any) => Promise<boolean>;
  [key: string]: any;
}

export type MojoAction = (ctx: MojoContext, ...args: any[]) => any;

export type MojoModels = Record<string, any>;

export interface MojoTags {
  asset: (path: string, attrs?: TagAttrs) => Promise<SafeString>;
  buttonTo: (target: URLTarget, attrs: TagAttrs, text: string) => Promise<SafeString>;
  checkBox: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  colorField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  dateField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  datetimeField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  emailField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  favicon: (file?: string) => Promise<SafeString>;
  fileField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  formFor: (target: URLTarget, attrs: TagAttrs, content: TagContent) => Promise<SafeString>;
  hiddenField: (name: string, value: string, attrs?: TagAttrs) => Promise<SafeString>;
  image: (target: string, attrs?: TagAttrs) => Promise<SafeString>;
  input: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  labelFor: (ctx: MojoContext, name: string, value: TagContent, attrs?: TagAttrs) => Promise<SafeString>;
  linkTo: (target: URLTarget, attrs: TagAttrs, content: TagContent) => Promise<SafeString>;
  monthField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  numberField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  passwordField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  radioButton: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  rangeField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  script: (target: string, attrs?: TagAttrs) => Promise<SafeString>;
  searchField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  styleTag: (target: string, attrs?: TagAttrs) => Promise<SafeString>;
  submitButton: (text?: string, attrs?: TagAttrs) => Promise<SafeString>;
  tag: (name: string, attrs?: TagAttrs, content?: TagContent) => Promise<SafeString>;
  telField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  textArea: (name: string, attrs?: TagAttrs, content?: TagContent) => Promise<SafeString>;
  textField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  timeField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  urlField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  weekField: (name: string, attrs?: TagAttrs) => Promise<SafeString>;
  [key: string]: any;
}

export type AnyArguments = (string | string[] | MojoAction | Record<string, string[] | RegExp>)[];
export type RouteArguments = (string | MojoAction | Record<string, string[] | RegExp>)[];
export type PlaceholderType = RegExp | string | string[];

export type TagAttrs = Record<string, string | boolean | Record<string, string>>;
export type TagContent = string | SafeString | Promise<string | SafeString> | (() => Promise<string | SafeString>);

export type NestedHelpers = Record<string, () => MojoAction>;
export type ScopedNestedHelpers = NestedHelpers & {_ctx: MojoContext};

export interface BackendInfo {
  name: string;
  [key: string]: any;
}

export interface SessionData {
  expiration?: number;
  expires?: number;
  flash?: Record<string, any>;
  nextFlash?: Record<string, any>;
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

export interface MojoURLOptions {
  absolute?: boolean;
  fragment?: string;
  query?: Record<string, string | string[]>;
  values?: Record<string, string>;
}

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

export interface UploadOptions {
  limits?: {
    fieldNameSize?: number;
    fieldSize?: number;
    fields?: number;
    fileSize?: number;
    files?: number;
    parts?: number;
    headerPairs?: number;
  };
}

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
  signal?: AbortSignal;
  yaml?: any;
}
export interface UserAgentWebSocketOptions extends SharedUserAgentRequestOptions {
  json?: boolean;
  protocols?: string[];
}

export type URLTarget = string | [string, MojoURLOptions];

export type TestUserAgentOptions = UserAgentOptions & {tap?: Test};

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
