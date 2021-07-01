import type {ClientOptions, MojoClientRequestOptions, MojoClientWebSocketOptions} from './types.js';
import EventEmitter from 'events';
import http from 'http';
import https from 'https';
import Stream from 'stream';
import {format, URL} from 'url';
import ClientResponse from './client/response.js';
import WebSocket from './websocket.js';
import FormData from 'form-data';
import tough from 'tough-cookie';
import WS from 'ws';

interface Upload { content: string, filename: string, type: string }

interface ClientEvents {
  request: (config: MojoClientRequestOptions) => void,
  websocket: (config: MojoClientWebSocketOptions) => void
}

declare interface Client {
  on: <T extends keyof ClientEvents>(event: T, listener: ClientEvents[T]) => this,
  emit: <T extends keyof ClientEvents>(event: T, ...args: Parameters<ClientEvents[T]>) => boolean
}

class Client extends EventEmitter {
  baseURL: string | URL | undefined;
  cookieJar: tough.CookieJar | null = new tough.CookieJar();
  maxRedirects: number;
  name: string | undefined;

  constructor (options: ClientOptions = {}) {
    super();

    this.baseURL = options.baseURL;
    this.maxRedirects = options.maxRedirects ?? 0;
    this.name = options.name;
  }

  async delete (url: string | URL, options: MojoClientRequestOptions): Promise<ClientResponse> {
    return await this._requestConfig('DELETE', url, options);
  }

  async get (url: string | URL, options: MojoClientRequestOptions): Promise<ClientResponse> {
    return await this._requestConfig('GET', url, options);
  }

  async head (url: string | URL, options: MojoClientRequestOptions): Promise<ClientResponse> {
    return await this._requestConfig('HEAD', url, options);
  }

  async options (url: string | URL, options: MojoClientRequestOptions): Promise<ClientResponse> {
    return await this._requestConfig('OPTIONS', url, options);
  }

  async patch (url: string | URL, options: MojoClientRequestOptions): Promise<ClientResponse> {
    return await this._requestConfig('PATCH', url, options);
  }

  async post (url: string | URL, options: MojoClientRequestOptions): Promise<ClientResponse> {
    return await this._requestConfig('POST', url, options);
  }

  async put (url: string | URL, options: MojoClientRequestOptions): Promise<ClientResponse> {
    return await this._requestConfig('PUT', url, options);
  }

  async request (config: MojoClientRequestOptions): Promise<ClientResponse> {
    const filtered = this._filterConfig(config);
    await this._loadCookies(filtered.url, filtered);

    this.emit('request', filtered);

    if (typeof filtered.body === 'string') filtered.body = Buffer.from(filtered.body);
    if (filtered.body instanceof Buffer) filtered.headers['Content-Length'] = Buffer.byteLength(filtered.body);

    const options = {
      method: filtered.method.toUpperCase(),
      headers: filtered.headers,
      auth: filtered.auth,
      agent: filtered.agent,
      rejectUnauthorized: filtered.insecure !== true
    };
    const proto = filtered.url.protocol === 'https:' ? https : http;

    return await new Promise((resolve, reject) => {
      const req = proto.request(filtered.url, options, res => resolve(this._handleResponse(filtered, res)));
      req.once('error', reject);
      req.once('abort', reject);

      if (filtered.body instanceof Buffer) {
        req.end(filtered.body);
      } else if (filtered.body instanceof Stream) {
        filtered.body.pipe(req);
      } else {
        req.end();
      }
    });
  }

  async websocket (url: string | URL, options: MojoClientWebSocketOptions = {}): Promise<WebSocket> {
    options.url = url;
    const filtered = this._filterSharedConfig(options);
    await this._loadCookies(filtered.url, filtered);

    this.emit('websocket', filtered);

    const ws = new WS(filtered.url, filtered.protocols, {headers: filtered.headers});
    return await new Promise((resolve, reject) => {
      let handshake: ClientResponse;
      ws.on('upgrade', res => (handshake = new ClientResponse(res)));
      ws.on('error', reject);

      ws.on('open', () => {
        // Workaround for a race condition where the first message arrives before the promise resolves
        const socket = handshake.raw.socket;
        socket.pause();
        queueMicrotask(() => socket.resume());
        resolve(new WebSocket(ws, handshake, {jsonMode: filtered.json}));
      });
    });
  }

  _cookieURL (currentURL: URL): string {
    return format(currentURL, {auth: false, fragment: false, search: false});
  }

  _filterConfig (config: Record<string, any>): Record<string, any> {
    const filtered = this._filterSharedConfig(config);
    if (filtered.method === undefined) filtered.method = 'GET';

    // Body
    if (filtered.json !== undefined) {
      if (filtered.headers['Content-Type'] === undefined) filtered.headers['Content-Type'] = 'application/json';
      filtered.body = JSON.stringify(filtered.json);
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

  _filterSharedConfig (config: Record<string, any>): Record<string, any> {
    if (!(config.url instanceof URL)) config.url = new URL(config.url, this.baseURL);

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

    return config;
  }

  _formData (values: Record<string, string | Upload> = {}): FormData {
    const form = new FormData();
    for (const [name, value] of Object.entries(values)) {
      if (typeof value === 'string') {
        form.append(name, value);
      } else if (typeof value === 'object') {
        form.append(name, value.content, {filename: value.filename, contentType: value.type});
      }
    }
    return form;
  }

  async _handleRedirect (config: Record<string, any>, res: ClientResponse): Promise<ClientResponse> {
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
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      remove.forEach(name => delete newConfig.headers[name]);

      return this.request(newConfig);

    // Same request again
    } else if (res.status === 307 || res.status === 308) {
      config.url = url;
      config.redirected = redirected + 1;
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      remove.forEach(name => delete config.headers[name]);

      return this.request(config);
    }

    return res;
  }

  async _handleResponse (config: Record<string, any>, raw: http.IncomingMessage): Promise<ClientResponse> {
    const res = new ClientResponse(raw);
    await this._storeCookies(config.url, res);
    return this.maxRedirects > 0 ? await this._handleRedirect(config, res) : res;
  }

  async _loadCookies (url: URL, config: Record<string, any>): Promise<void> {
    if (this.cookieJar === null) return;
    const cookies = await this.cookieJar.getCookies(this._cookieURL(url));
    if (cookies.length > 0) config.headers.Cookie = cookies.map(cookie => cookie.cookieString()).join('; ');
  }

  async _requestConfig (
    method: string, url: string | URL = '/', options?: MojoClientRequestOptions
  ): Promise<ClientResponse> {
    return await this.request({url, method, ...options});
  }

  async _storeCookies (url: URL, res: ClientResponse): Promise<void> {
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

export default Client;
