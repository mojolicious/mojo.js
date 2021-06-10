import cluster from 'cluster';
import File from './file.js';
import http from 'http';
import https from 'https';
import os from 'os';
import WebSocket from './websocket.js';
import WS from 'ws';

/** Class representing an HTTP/WebSocket server. */
export default class Server {
  /**
   * Create HTTP/WebSocket server.
   * @param {App} app - Application this server handles.
   * @param {object} [options] - Optional settings.
   * @param {boolean} [options.cluster]
   * @param {string[]} [options.listen]
   * @param {boolean} [options.quiet]
   * @param {boolean} [options.reverseProxy]
   * @param {number} [options.workers]
   */
  constructor (app, options = {}) {
    app.server = this;

    this.app = app;
    this.reverseProxy = options.reverseProxy ?? false;
    this.urls = [];

    this._cluster = options.cluster ?? false;
    this._listen = options.listen || ['http://*:3000'];
    this._servers = [];
    this._quiet = options.quiet ?? false;
    this._workers = options.workers || os.cpus().length;
  }

  static listenArgsForURL (url) {
    const listen = [];

    const hostname = url.hostname;
    const port = url.port;
    const params = url.searchParams;

    if (port !== '' && hostname !== '') {
      listen.push(parseInt(port));
      listen.push(hostname === '*' ? '0.0.0.0' : hostname.replace(/^\[/, '').replace(/]$/, ''));
    } else if (params.has('fd')) {
      listen.push({fd: parseInt(params.get('fd'))});
    } else {
      listen.push(null, '0.0.0.0');
    }

    return listen;
  }

  async start () {
    await this.app.hooks.runHook('start', this.app);
    if (this._cluster === true && cluster.isPrimary === true) {
      for (let i = 0; i < this._workers; i++) {
        cluster.fork();
      }
    } else {
      for (const location of this._listen) {
        await this._createServer(location);
      }
    }
  }

  async stop () {
    await Promise.all(this._servers.map(server => new Promise(resolve => server.close(resolve))));
    await this.app.hooks.runHook('stop', this.app);
  }

  async _createServer (location) {
    const url = new URL(location);

    let proto = http;
    const options = {};
    if (url.protocol === 'https:') {
      const params = url.searchParams;
      options.cert = await new File(params.get('cert')).readFile();
      options.key = await new File(params.get('key')).readFile();
      proto = https;
    }

    await this.app.warmup();

    const wss = new WS.Server({noServer: true});
    const server = this.server = proto.createServer(options, this._handleRequest.bind(this));
    this._servers.push(server);

    server.on('upgrade', this._handleUpgrade.bind(this, wss));

    if (process.env.MOJO_SERVER_DEBUG) {
      server.on('connection', socket => {
        const stderr = process.stderr;
        socket.on('data', chunk => stderr.write(`-- Server <<< Client\n${chunk}`));
        const write = socket.write;
        socket.write = (chunk, ...args) => {
          stderr.write(`-- Server >>> Client\n${chunk}`);
          return write.apply(socket, [chunk, ...args]);
        };
      });
    }

    return new Promise(resolve => {
      server.listen(...Server.listenArgsForURL(url), () => {
        const address = server.address();
        const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
        const realLocation = new URL(`${url.protocol}//${host}:${address.port}`);
        this.urls.push(realLocation);
        if (this._quiet === false) console.log(`[${process.pid}] Web application available at ${realLocation}`);
        resolve();
      });
    });
  }

  _handleRequest (req, res) {
    const app = this.app;
    app.handleRequest(app.newHTTPContext(req, res, {reverseProxy: this.reverseProxy}));
  }

  async _handleUpgrade (wss, req, socket, head) {
    const app = this.app;
    const ctx = app.newWebSocketContext(req, {reverseProxy: this.reverseProxy});

    try {
      await app.handleRequest(ctx);

      if (ctx.isAccepted === true) {
        wss.handleUpgrade(req, socket, head, ws => {
          ctx.handleUpgrade(new WebSocket(ws, null, {jsonMode: ctx.jsonMode}));
        });
      } else {
        socket.destroy();
      }
    } catch (error) {
      await ctx.exception(error);
    }
  }
}
