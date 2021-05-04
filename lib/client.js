import EventEmitter from 'events';
import http from 'http';
import https from 'https';
import Stream from 'stream';
import WebSocket from 'ws';
import ClientResponse from './client/response.js';

export default class Client extends EventEmitter {
  constructor (options = {}) {
    super();
    this.baseURL = options.baseURL;
    this.name = options.name;
  }

  delete (url, options) {
    return this._configRequest('DELETE', url, options);
  }

  get (url, options) {
    return this._configRequest('GET', url, options);
  }

  head (url, options) {
    return this._configRequest('HEAD', url, options);
  }

  options (url, options) {
    return this._configRequest('OPTIONS', url, options);
  }

  patch (url, options) {
    return this._configRequest('PATCH', url, options);
  }

  post (url, options) {
    return this._configRequest('POST', url, options);
  }

  put (url, options) {
    return this._configRequest('PUT', url, options);
  }

  async request (config) {
    this._filterConfig(config);

    if (config.websocket) {
      this.emit('websocket', config);
      return new WebSocket(config.url, config.protocols, {headers: config.headers});
    }
    this.emit('request', config);

    if (typeof config.body === 'string') config.body = Buffer.from(config.body);
    if (config.body instanceof Buffer) config.headers['Content-Length'] = Buffer.byteLength(config.body);

    const options = {method: config.method.toUpperCase(), headers: config.headers};
    if (config.insecure === true) options.rejectUnauthorized = false;
    const proto = config.url.protocol === 'https:' ? https : http;

    return await new Promise((resolve, reject) => {
      const req = proto.request(config.url, options, res => resolve(new ClientResponse(res)));
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
    return this._configRequest('WEBSOCKET', url, options);
  }

  _configRequest (method, url = '/', options = {}) {
    const config = {url: url, ...options};
    if (method === 'WEBSOCKET') {
      config.websocket = true;
    } else {
      config.method = method;
    }
    return this.request(config);
  }

  _filterConfig (config) {
    if (config.method === undefined) config.method = 'GET';
    if (!(config.url instanceof URL)) config.url = new URL('' + config.url, this.baseURL);
    if (config.headers === undefined) config.headers = {};
    if (config.websocket && !config.protocols) config.protocols = [];
    if (config.json) config.body = JSON.stringify(config.json);
    if (this.name) config.headers['User-Agent'] = this.name;
  }
}
