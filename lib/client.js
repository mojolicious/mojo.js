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
    return this.request(this._config('DELETE', ...args));
  }

  get (...args) {
    return this.request(this._config('GET', ...args));
  }

  head (...args) {
    return this.request(this._config('HEAD', ...args));
  }

  options (...args) {
    return this.request(this._config('OPTIONS', ...args));
  }

  patch (...args) {
    return this.request(this._config('PATCH', ...args));
  }

  post (...args) {
    return this.request(this._config('POST', ...args));
  }

  put (...args) {
    return this.request(this._config('PUT', ...args));
  }

  request (config) {
    if (!config.method) config.method = 'GET';
    if (!(config.url instanceof URL)) config.url = new URL('' + config.url, this.baseURL);
    if (!config.headers) config.headers = {};
    if (config.websocket && !config.protocols) config.protocols = [];
    if (this.name) config.headers['User-Agent'] = this.name;

    if (config.websocket) {
      this.emit('websocket', config);
      return new WebSocket(config.url, config.protocols, {headers: config.headers});
    }
    this.emit('request', config);

    const options = {method: config.method, headers: config.headers};
    const proto = config.url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = proto.request(config.url, options, res => {
        resolve(new ClientResponse(res));
      });
      req.on('abort', reject);

      if (typeof config.body === 'string') {
        req.end(config.body);
      } else if (config.body instanceof Stream) {
        config.body.pipe(req);
      } else {
        req.end();
      }
    });
  }

  websocket (...args) {
    return this.request(this._config('WEBSOCKET', ...args));
  }

  _config (method, url = '/', options = {}) {
    const config = {url: url, ...options};
    if (method === 'WEBSOCKET') {
      config.websocket = true;
    } else {
      config.method = method;
    }
    return config;
  }
}
