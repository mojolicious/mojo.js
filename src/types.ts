import HTTPContext from './context/http.js';
import WebSocketContext from './context/websocket.js';

// Route arguments
export type AnyArguments = (string | string[] | Function | {[name: string]: string[] | RegExp})[];
export type RouteArguments = (string | Function | {[name: string]: string[] | RegExp})[];

// Context variants
export interface HTTPContextWithHelpers extends HTTPContext { [key: string]: any }
export interface WebSocketContextWithHelpers extends WebSocketContext { [key: string]: any }
export type MojoContext = HTTPContextWithHelpers | WebSocketContextWithHelpers;

export interface AppOptions {
  config?: object,
  exceptionFormat?: string,
  detectImport?: boolean,
  mode?: string,
  secrets?: string[]
}
