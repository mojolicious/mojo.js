import cluster from 'cluster';
import File from './file.js';
import http from 'http';
import https from 'https';
import os from 'os';
import WebSocket from 'ws';

export default class Server {
  constructor (app, options = {}) {
    this.app = app;
    this.reverseProxy = options.reverseProxy ?? false;
    this.urls = [];
    this._cluster = options.cluster;
    this._listen = options.listen || ['http://*:3000'];
    this._servers = [];
    this._quiet = options.quiet;
    this._workers = options.workers || os.cpus().length;
  }

  async start () {
    await this.app.hooks.runHook('start', this.app);
    if (this._cluster && cluster.isPrimary) {
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
      options.cert = await new File(url.searchParams.get('cert')).readFile();
      options.key = await new File(url.searchParams.get('key')).readFile();
      proto = https;
    }

    await this.app.warmup();

    const wss = new WebSocket.Server({noServer: true});
    const server = this.server = proto.createServer(options, this._handleRequest.bind(this));
    this._servers.push(server);

    server.on('upgrade', this._handleUpgrade.bind(this, wss));

    if (process.env.MOJO_SERVER_DEBUG) {
      server.on('connection', socket => {
        socket.on('data', chunk => process.stderr.write(`-- Server <<< Client\n${chunk}`));
        const write = socket.write;
        socket.write = (chunk, ...args) => {
          process.stderr.write(`-- Server >>> Client\n${chunk}`);
          return write.apply(socket, [chunk, ...args]);
        };
      });
    }

    return new Promise(resolve => {
      server.listen(...this._parseListenURL(url), () => {
        const address = server.address();
        const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
        const realLocation = new URL(`${url.protocol}//${host}:${address.port}`);
        this.urls.push(realLocation);
        if (!this._quiet) console.log(`[${process.pid}] Web application available at ${realLocation}`);
        resolve();
      });
    });
  }

  _handleRequest (req, res) {
    this.app.handleRequest(this.app.newHTTPContext(req, res, {reverseProxy: this.reverseProxy}));
  }

  async _handleUpgrade (wss, req, socket, head) {
    const ctx = this.app.newWebSocketContext(req, {reverseProxy: this.reverseProxy});
    await this.app.handleRequest(ctx);

    if (ctx.listenerCount('connection') > 0) {
      wss.handleUpgrade(req, socket, head, ws => ctx.emit('connection', ws));
    } else {
      socket.destroy();
    }
  }

  _parseListenURL (url) {
    const listen = [];
    if (url.port) {
      listen.push(url.port);
      if (url.hostname !== '*') listen.push(url.hostname);
    } else if (url.searchParams.get('fd')) {
      listen.push({fd: parseInt(url.searchParams.get('fd'))});
    } else {
      listen.push(null);
    }

    return listen;
  }
}
