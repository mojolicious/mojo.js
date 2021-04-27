import http from 'http';
import https from 'https';
import EventEmitter from 'events';
import Stream from 'stream';
import WebSocket from 'ws';
import ClientResponse from './client/response.js';

export default class Client extends EventEmitter {
  constructor (options = {}) {
    super();
    this.baseURL = options.baseURL;
    this.name = options.name;
  }

  delete (...args) {
    return this._configRequest('DELETE', ...args);
  }

  get (...args) {
    return this._configRequest('GET', ...args);
  }

  head (...args) {
    return this._configRequest('HEAD', ...args);
  }

  options (...args) {
    return this._configRequest('OPTIONS', ...args);
  }

  patch (...args) {
    return this._configRequest('PATCH', ...args);
  }

  post (...args) {
    return this._configRequest('POST', ...args);
  }

  put (...args) {
    return this._configRequest('PUT', ...args);
  }

  request (config) {
    this._filterConfig(config);

    if (config.websocket) {
      this.emit('websocket', config);
      return new WebSocket(config.url, config.protocols, {headers: config.headers});
    }
    this.emit('request', config);

    if (typeof config.body === 'string') config.body = Buffer.from(config.body);
    if (config.body instanceof Buffer) config.headers['Content-Length'] = Buffer.byteLength(config.body);

    const options = {method: config.method.toUpperCase(), headers: config.headers};
    const proto = config.url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = proto.request(config.url, options, res => resolve(new ClientResponse(res)));
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

  websocket (...args) {
    return this._configRequest('WEBSOCKET', ...args);
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
    if (!config.method) config.method = 'GET';
    if (!(config.url instanceof URL)) config.url = new URL('' + config.url, this.baseURL);
    if (!config.headers) config.headers = {};
    if (config.websocket && !config.protocols) config.protocols = [];
    if (this.name) config.headers['User-Agent'] = this.name;
  }
}
