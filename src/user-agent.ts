import type {UserAgentOptions, UserAgentRequestOptions, UserAgentWebSocketOptions} from './types.js';
import type {UserAgentResponse} from './user-agent/response.js';
import type {WebSocket} from './websocket.js';
import {URL} from 'node:url';
import {CookieJar} from './user-agent/cookie-jar.js';
import {HTTPTransport} from './user-agent/transport/http.js';
import {HTTPSTransport} from './user-agent/transport/https.js';
import {WSTransport} from './user-agent/transport/ws.js';
import {AsyncHooks} from '@mojojs/util';
import FormData from 'form-data';
import yaml from 'js-yaml';

interface Upload {
  content: string;
  filename: string;
  type: string;
}

type UserAgentHook = (ua: UserAgent, ...args: any[]) => any;

/**
 * HTTP and WebSocket user-agent.
 */
class UserAgent {
  /**
   * Base URL to be used to resolve all relative request URLs with.
   */
  baseURL: string | URL | undefined;
  /**
   * Cookie jar to use.
   */
  cookieJar: CookieJar | null = new CookieJar();
  /**
   * User-agent hooks.
   */
  hooks = new AsyncHooks();
  /**
   * Transport backend to perform HTTP requests with.
   */
  httpTransport = new HTTPTransport();
  /**
   * Transport backend to perform HTTPS requests with.
   */
  httpsTransport = new HTTPSTransport();
  /**
   * Maximum number of redirects to follow, default to `0`.
   */
  maxRedirects: number;
  /**
   * Name of user-agent to send with `User-Agent` header.
   */
  name: string | undefined;
  /**
   * Transport backend to use for WebSocket connections.
   */
  wsTransport = new WSTransport();

  constructor(options: UserAgentOptions = {}) {
    this.baseURL = options.baseURL;
    this.maxRedirects = options.maxRedirects ?? 0;
    this.name = options.name;
  }

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }

  /**
   * Add a hook to extend the user-agent.
   */
  addHook(name: string, fn: UserAgentHook): this {
    this.hooks.addHook(name, fn);
    return this;
  }

  /**
   * Destroy all active keep-alive connections.
   */
  async destroy(): Promise<void> {
    await this.httpTransport.destroy();
    await this.httpsTransport.destroy();
  }

  /**
   * Perform `DELETE` request.
   */
  async delete(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('DELETE', url, options);
  }

  /**
   * Perform `GET` request.
   */
  async get(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('GET', url, options);
  }

  /**
   * Perform `HEAD` request.
   */
  async head(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('HEAD', url, options);
  }

  /**
   * Perform `OPTIONS` request.
   */
  async options(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('OPTIONS', url, options);
  }

  /**
   * Perform `PATCH` request.
   */
  async patch(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('PATCH', url, options);
  }

  /**
   * Perform `POST` request.
   */
  async post(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('POST', url, options);
  }

  /**
   * Perform `PUT` request.
   */
  async put(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('PUT', url, options);
  }

  /**
   * Perform HTTP request.
   */
  async request(config: UserAgentRequestOptions): Promise<UserAgentResponse> {
    const filtered = await this._filterConfig(config);

    await this.hooks.runHook('request', this, filtered);

    if (typeof filtered.body === 'string') filtered.body = Buffer.from(filtered.body);
    if (filtered.body instanceof Buffer) filtered.headers['Content-Length'] = Buffer.byteLength(filtered.body);

    const transport = filtered.url.protocol === 'https:' ? this.httpsTransport : this.httpTransport;
    let res = await transport.request(filtered);

    if (this.cookieJar !== null) await this.cookieJar.storeCookies(filtered.url, res.headers.getAll('Set-Cookie'));
    if (this.maxRedirects > 0) res = await this._handleRedirect(config, res);
    return res;
  }

  /**
   * Open WebSocket connection.
   */
  async websocket(url: string | URL, options: UserAgentWebSocketOptions = {}): Promise<WebSocket> {
    options.url = url;
    const filtered = await this._filterSharedConfig(options);

    await this.hooks.runHook('websocket', this, filtered);

    filtered.url.protocol = filtered.url.protocol === 'https:' ? 'wss:' : 'ws:';
    return await this.wsTransport.connect(filtered);
  }

  async _filterConfig(config: UserAgentRequestOptions): Promise<Record<string, any>> {
    const filtered = await this._filterSharedConfig(config);

    // Body
    if (filtered.json !== undefined) {
      if (filtered.headers['Content-Type'] === undefined) filtered.headers['Content-Type'] = 'application/json';
      filtered.body = JSON.stringify(filtered.json);
    } else if (filtered.yaml !== undefined) {
      if (filtered.headers['Content-Type'] === undefined) filtered.headers['Content-Type'] = 'text/yaml';
      filtered.body = yaml.dump(filtered.yaml);
    } else if (filtered.form !== undefined) {
      if (filtered.headers['Content-Type'] === undefined) {
        filtered.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      filtered.body = new URLSearchParams(filtered.form).toString();
    } else if (filtered.formData !== undefined) {
      const form = this._formData(filtered.formData);
      Object.assign(filtered.headers, form.getHeaders());
      filtered.body = form;
    }

    return filtered;
  }

  async _filterSharedConfig(config: UserAgentRequestOptions | UserAgentWebSocketOptions): Promise<Record<string, any>> {
    if (!(config.url instanceof URL)) config.url = new URL(config.url ?? '/', this.baseURL);

    // Auth
    const url: URL = config.url;
    if ((url.username !== '' || url.password !== '') && config.auth === undefined) {
      config.auth = decodeURIComponent(`${url.username}:${url.password}`);
    }

    // Query
    if (config.query !== undefined) {
      const params = url.searchParams;
      for (const [name, value] of Object.entries(config.query)) {
        params.append(name, value as string);
      }
    }

    // Headers
    if (config.headers === undefined) config.headers = {};
    if (this.name !== undefined) config.headers['User-Agent'] = this.name;
    if (config.headers['Accept-Encoding'] === undefined) config.headers['Accept-Encoding'] = 'gzip';
    if (this.cookieJar !== null) {
      const cookies = await this.cookieJar.loadCookies(config.url);
      if (cookies !== null) config.headers.Cookie = cookies;
    }

    return config;
  }

  _formData(values: Record<string, string | Upload> = {}): FormData {
    const form = new FormData();
    for (const [name, value] of Object.entries(values)) {
      if (typeof value === 'string') {
        form.append(name, value);
      } else if (typeof value === 'object' && value !== null) {
        form.append(name, value.content, {filename: value.filename, contentType: value.type});
      }
    }
    return form;
  }

  async _handleRedirect(config: Record<string, any>, res: UserAgentResponse): Promise<UserAgentResponse> {
    const redirected: number = config.redirected ?? 0;
    if (redirected >= this.maxRedirects) return res;

    const location = res.get('Location');
    if (location === null) return res;
    const url = new URL(location, config.url);

    // New followup request
    const remove = ['Authorization', 'Cookie', 'Host', 'Referer'];
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
      const newConfig = {
        headers: config.headers,
        insecure: config.insecure,
        method: res.statusCode === 303 || config.method === 'POST' ? 'GET' : config.method,
        redirected: redirected + 1,
        url
      };

      remove.push(...Object.keys(newConfig.headers).filter(name => name.toLowerCase().startsWith('content-')));
      remove.forEach(name => delete newConfig.headers[name]);

      return this.request(newConfig);

      // Same request again
    } else if (res.statusCode === 307 || res.statusCode === 308) {
      config.url = url;
      config.redirected = redirected + 1;
      remove.forEach(name => delete config.headers[name]);

      return this.request(config);
    }

    return res;
  }

  async _requestConfig(
    method: string,
    url: string | URL = '/',
    options?: UserAgentRequestOptions
  ): Promise<UserAgentResponse> {
    return await this.request({url, method, ...options});
  }
}

export {UserAgent};
