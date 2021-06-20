import type App from './app.js';
import type {Socket} from 'net';
import cluster from 'cluster';
import http from 'http';
import https from 'https';
import os from 'os';
import {URL} from 'url';
import File from './file.js';
import WebSocket from './websocket.js';
import WS from 'ws';

interface ServerOptions {
  cluster?: boolean,
  listen?: string[],
  quiet?: boolean,
  reverseProxy?: boolean,
  workers?: number
}

export default class Server {
  app: App;
  reverseProxy: boolean;
  urls: URL[] = [];
  _cluster: boolean;
  _listen: string[];
  _servers: Array<http.Server | https.Server> = [];
  _quiet: boolean;
  _workers: number;

  constructor (app: App, options: ServerOptions = {}) {
    app.server = this;

    this.app = app;
    this.reverseProxy = options.reverseProxy ?? false;

    this._cluster = options.cluster ?? false;
    this._listen = options.listen ?? ['http://*:3000'];
    this._servers = [];
    this._quiet = options.quiet ?? false;
    this._workers = options.workers ?? os.cpus().length;
  }

  static listenArgsForURL (url: URL): any[] {
    const listen = [];

    const hostname = url.hostname;
    const port = url.port;
    const params = url.searchParams;

    if (port !== '' && hostname !== '') {
      listen.push(parseInt(port));
      listen.push(hostname === '*' ? '0.0.0.0' : hostname.replace(/^\[/, '').replace(/]$/, ''));
    } else if (params.has('fd')) {
      listen.push({fd: parseInt(params.get('fd') ?? '')});
    } else {
      listen.push(undefined, '0.0.0.0');
    }

    return listen;
  }

  async start (): Promise<void> {
    await this.app.hooks.runHook('start', this.app);
    if (this._cluster && cluster.isMaster) {
      for (let i = 0; i < this._workers; i++) {
        cluster.fork();
      }
    } else {
      for (const location of this._listen) {
        await this._createServer(location);
      }
    }
  }

  async stop (): Promise<void> {
    await Promise.all(this._servers.map(async server => await new Promise(resolve => server.close(resolve))));
    await this.app.hooks.runHook('stop', this.app);
  }

  async _createServer (location: string): Promise<void> {
    const url = new URL(location);

    let isHttps = false;
    const options: https.ServerOptions = {};
    if (url.protocol === 'https:') {
      const params = url.searchParams;
      options.cert = await new File(params.get('cert') ?? '').readFile();
      options.key = await new File(params.get('key') ?? '').readFile();
      isHttps = true;
    }

    await this.app.warmup();

    const wss = new WS.Server({noServer: true});
    const server = (isHttps ? https : http).createServer(options, this._handleRequest.bind(this));
    this._servers.push(server);

    server.on('upgrade', this._handleUpgrade.bind(this, wss));

    if (process.env.MOJO_SERVER_DEBUG === '1') {
      server.on('connection', socket => {
        const stderr = process.stderr;
        socket.on('data', (chunk: string) => stderr.write(`-- Server <<< Client\n${chunk}`));
        const write = socket.write;
        socket.write = (chunk: string, cb?: ((err?: Error | undefined) => void) | undefined) => {
          stderr.write(`-- Server >>> Client\n${chunk}`);
          return write.apply(socket, [chunk, cb]);
        };
      });
    }

    return new Promise(resolve => {
      server.listen(...Server.listenArgsForURL(url), () => {
        const address = server.address();
        if (address === null || typeof address !== 'object') throw new Error('Unknown server address');

        const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
        const realLocation = new URL(`${url.protocol}//${host}:${address.port}`);
        this.urls.push(realLocation);
        if (!this._quiet) console.log(`[${process.pid}] Web application available at ${realLocation.toString()}`);
        resolve();
      });
    });
  }

  _handleRequest (req: http.IncomingMessage, res: http.ServerResponse): void {
    const app = this.app;
    const ctx = app.newContext(req, res, {isWebSocket: false, reverseProxy: this.reverseProxy});
    app.handleRequest(ctx).catch(error => ctx.exception(error));
  }

  _handleUpgrade (wss: WS.Server, req: http.IncomingMessage, socket: Socket, head: Buffer): void {
    const app = this.app;
    const ctx = app.newContext(req, new http.ServerResponse(req), {isWebSocket: true, reverseProxy: this.reverseProxy});

    app.handleRequest(ctx).then(() => {
      if (ctx.isAccepted) {
        wss.handleUpgrade(req, socket, head, ws => {
          ctx.handleUpgrade(new WebSocket(ws, null, {jsonMode: ctx.jsonMode}));
        });
      } else {
        socket.destroy();
      }
    }).catch(error => {
      if (!ctx.isAccepted) socket.destroy();
      return ctx.exception(error);
    });
  }
}
