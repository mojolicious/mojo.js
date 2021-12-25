import type {UserAgentOptions, UserAgentRequestOptions, UserAgentWebSocketOptions} from './types.js';
import type {UserAgentResponse} from './user-agent/response.js';
import type {WebSocket} from './websocket.js';
import EventEmitter from 'events';
import {format, URL} from 'url';
import {HTTPTransport} from './user-agent/transport/http.js';
import {HTTPSTransport} from './user-agent/transport/https.js';
import {WSTransport} from './user-agent/transport/ws.js';
import FormData from 'form-data';
import yaml from 'js-yaml';
import tough from 'tough-cookie';

interface Upload {
  content: string;
  filename: string;
  type: string;
}

interface UserAgentEvents {
  request: (config: UserAgentRequestOptions) => void;
  websocket: (config: UserAgentWebSocketOptions) => void;
}

declare interface UserAgent {
  on: <T extends keyof UserAgentEvents>(event: T, listener: UserAgentEvents[T]) => this;
  emit: <T extends keyof UserAgentEvents>(event: T, ...args: Parameters<UserAgentEvents[T]>) => boolean;
}

class UserAgent extends EventEmitter {
  baseUrl: string | URL | undefined;
  cookieJar: tough.CookieJar | null = new tough.CookieJar();
  httpTransport = new HTTPTransport();
  httpsTransport = new HTTPSTransport();
  maxRedirects: number;
  name: string | undefined;
  wsTransport = new WSTransport();

  constructor(options: UserAgentOptions = {}) {
    super();

    this.baseUrl = options.baseUrl;
    this.maxRedirects = options.maxRedirects ?? 0;
    this.name = options.name;
  }

  async delete(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('DELETE', url, options);
  }

  async get(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('GET', url, options);
  }

  async head(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('HEAD', url, options);
  }

  async options(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('OPTIONS', url, options);
  }

  async patch(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('PATCH', url, options);
  }

  async post(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('POST', url, options);
  }

  async put(url: string | URL, options: UserAgentRequestOptions): Promise<UserAgentResponse> {
    return await this._requestConfig('PUT', url, options);
  }

  async request(config: UserAgentRequestOptions): Promise<UserAgentResponse> {
    const filtered = this._filterConfig(config);
    await this._loadCookies(filtered.url, filtered);

    this.emit('request', filtered);

    if (typeof filtered.body === 'string') filtered.body = Buffer.from(filtered.body);
    if (filtered.body instanceof Buffer) filtered.headers['Content-Length'] = Buffer.byteLength(filtered.body);

    const transport = filtered.url.protocol === 'https:' ? this.httpsTransport : this.httpTransport;
    let res = await transport.request(filtered);

    await this._storeCookies(filtered.url, res);
    if (this.maxRedirects > 0) res = await this._handleRedirect(config, res);
    return res;
  }

  async websocket(url: string | URL, options: UserAgentWebSocketOptions = {}): Promise<WebSocket> {
    options.url = url;
    const filtered = this._filterSharedConfig(options);
    await this._loadCookies(filtered.url, filtered);

    this.emit('websocket', filtered);

    filtered.url.protocol = filtered.url.protocol === 'https:' ? 'wss:' : 'ws:';
    return await this.wsTransport.connect(filtered);
  }

  _cookieURL(currentURL: URL): string {
    return format(currentURL, {auth: false, fragment: false, search: false});
  }

  _filterConfig(config: UserAgentRequestOptions): Record<string, any> {
    const filtered = this._filterSharedConfig(config);
    if (filtered.method === undefined) filtered.method = 'GET';

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
      const form = filtered.formData instanceof FormData ? filtered.formData : this._formData(filtered.formData);
      Object.assign(filtered.headers, form.getHeaders());
      filtered.body = form;
    }

    return filtered;
  }

  _filterSharedConfig(config: UserAgentRequestOptions | UserAgentWebSocketOptions): Record<string, any> {
    if (!(config.url instanceof URL)) config.url = new URL(config.url ?? '', this.baseUrl);

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

    const location = res.headers.location;
    if (location === undefined) return res;
    const url = new URL(location, config.url);

    // New followup request
    const remove = ['Authorization', 'Cookie', 'Host', 'Referer'];
    if (res.status === 301 || res.status === 302 || res.status === 303) {
      const newConfig = {
        headers: config.headers,
        insecure: config.insecure,
        method: res.status === 303 || config.method === 'POST' ? 'GET' : config.method,
        redirected: redirected + 1,
        url
      };

      remove.push(...Object.keys(newConfig.headers).filter(name => name.toLowerCase().startsWith('content-')));
      remove.forEach(name => delete newConfig.headers[name]);

      return this.request(newConfig);

      // Same request again
    } else if (res.status === 307 || res.status === 308) {
      config.url = url;
      config.redirected = redirected + 1;
      remove.forEach(name => delete config.headers[name]);

      return this.request(config);
    }

    return res;
  }

  async _loadCookies(url: URL, config: Record<string, any>): Promise<void> {
    if (this.cookieJar === null) return;
    const cookies = await this.cookieJar.getCookies(this._cookieURL(url));
    if (cookies.length > 0) config.headers.Cookie = cookies.map(cookie => cookie.cookieString()).join('; ');
  }

  async _requestConfig(
    method: string,
    url: string | URL = '/',
    options?: UserAgentRequestOptions
  ): Promise<UserAgentResponse> {
    return await this.request({url, method, ...options});
  }

  async _storeCookies(url: URL, res: UserAgentResponse): Promise<void> {
    if (this.cookieJar === null) return;

    const header = res.headers['set-cookie'];
    if (header === undefined) return;

    const cookieURL = this._cookieURL(url);
    for (const cookie of header.map(value => tough.Cookie.parse(value ?? ''))) {
      if (cookie === undefined) continue;
      await this.cookieJar.setCookie(cookie, cookieURL);
    }
  }
}

export {UserAgent};
