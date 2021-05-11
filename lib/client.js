import ClientResponse from './client/response.js';
import EventEmitter from 'events';
import http from 'http';
import https from 'https';
import Stream from 'stream';
import tough from 'tough-cookie';
import url from 'url';
import WebSocket from 'ws';

export default class Client extends EventEmitter {
  constructor (options = {}) {
    super();
    this.baseURL = options.baseURL;
    this.cookiejar = new tough.CookieJar();
    this.name = options.name;
  }

  delete (url, options) {
    return this._requestConfig('DELETE', url, options);
  }

  get (url, options) {
    return this._requestConfig('GET', url, options);
  }

  head (url, options) {
    return this._requestConfig('HEAD', url, options);
  }

  options (url, options) {
    return this._requestConfig('OPTIONS', url, options);
  }

  patch (url, options) {
    return this._requestConfig('PATCH', url, options);
  }

  post (url, options) {
    return this._requestConfig('POST', url, options);
  }

  put (url, options) {
    return this._requestConfig('PUT', url, options);
  }

  async request (config) {
    this._filterConfig(config);
    await this._loadCookies(config.url, config);

    if (config.websocket) {
      this.emit('websocket', config);
      return new WebSocket(config.url, config.protocols, {headers: config.headers});
    }
    this.emit('request', config);

    if (typeof config.body === 'string') config.body = Buffer.from(config.body);
    if (config.body instanceof Buffer) config.headers['Content-Length'] = Buffer.byteLength(config.body);

    const options = {
      method: config.method.toUpperCase(),
      headers: config.headers,
      auth: config.auth,
      agent: config.agent
    };
    if (config.insecure === true) options.rejectUnauthorized = false;
    const proto = config.url.protocol === 'https:' ? https : http;

    return await new Promise((resolve, reject) => {
      const req = proto.request(config.url, options, res => resolve(this._handleResponse(config.url, res)));
      req.on('error', reject);
      req.on('abort', reject);

      if (config.body instanceof Buffer) {
        req.end(config.body);
      } else if (config.body instanceof Stream) {
        config.body.pipe(req);
      } else {
        req.end();
      }
    });
  }

  websocket (url, options) {
    return this._requestConfig('WEBSOCKET', url, options);
  }

  _cookieURL (currentURL) {
    return url.format(currentURL, {auth: false, fragment: false, search: false});
  }

  _filterConfig (config) {
    if (config.method === undefined) config.method = 'GET';
    if (!(config.url instanceof URL)) config.url = new URL('' + config.url, this.baseURL);
    if (config.headers === undefined) config.headers = {};
    if (config.websocket === true && config.protocols === undefined) config.protocols = [];
    if (this.name !== undefined) config.headers['User-Agent'] = this.name;

    if (config.json !== undefined) {
      if (config.headers['Content-Type'] === undefined) config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.json);
    } else if (config.form !== undefined) {
      if (config.headers['Content-Type'] === undefined) {
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      config.body = new URLSearchParams(config.form).toString();
    }
  }

  async _handleResponse (url, raw) {
    const res = new ClientResponse(raw);
    await this._storeCookies(url, res);
    return res;
  }

  async _loadCookies (url, config) {
    const cookies = await this.cookiejar.getCookies(this._cookieURL(url));
    if (cookies.length > 0) config.headers.Cookie = cookies.join('; ');
  }

  _requestConfig (method, url = '/', options = {}) {
    const config = {url, ...options};
    if (method === 'WEBSOCKET') {
      config.websocket = true;
    } else {
      config.method = method;
    }
    return this.request(config);
  }

  async _storeCookies (url, res) {
    const header = res.get('Set-Cookie');
    if (header === undefined) return;

    const cookieURL = this._cookieURL(url);
    for (const cookie of header.map(tough.Cookie.parse)) {
      await this.cookiejar.setCookie(cookie, cookieURL);
    }
  }
}
