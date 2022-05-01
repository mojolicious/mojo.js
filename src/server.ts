import type {App} from './app.js';
import type {Socket} from 'net';
import cluster from 'cluster';
import http from 'http';
import https from 'https';
import os from 'os';
import {Stream} from 'stream';
import {URL} from 'url';
import {ServerRequest} from './server/request.js';
import {ServerResponse} from './server/response.js';
import {WebSocket} from './websocket.js';
import Path from '@mojojs/path';
import {WebSocketServer} from 'ws';

type ListenArgs = any[];

type ResponseBody = string | Buffer | Stream | undefined;

interface ServerOptions {
  cluster?: boolean;
  headersTimeout?: number;
  keepAliveTimeout?: number;
  listen?: string[];
  quiet?: boolean;
  requestTimeout?: number;
  reverseProxy?: boolean;
  workers?: number;
}

/**
 * Server class.
 */
export class Server {
  /**
   * Application this server handles.
   */
  app: App;
  /**
   * Limit the amount of time the parser will wait to receive the complete HTTP headers.
   */
  headersTimeout: number | undefined;
  /**
   * Limit the amount of time of inactivity a server needs to wait for additional incoming data, after it has finished
   * writing the last response, before a socket will be destroyed.
   */
  keepAliveTimeout: number | undefined;
  /**
   * Limit the amount of time for receiving the entire request from the client.
   */
  requestTimeout: number | undefined;
  /**
   * Reverse proxy mode.
   */
  reverseProxy: boolean;
  /**
   * Server URLs.
   */
  urls: URL[] = [];

  _cluster: boolean;
  _listen: string[];
  _servers: Array<http.Server | https.Server> = [];
  _quiet: boolean;
  _workers: number;

  constructor(app: App, options: ServerOptions = {}) {
    this.app = app;
    this.headersTimeout = options.headersTimeout;
    this.keepAliveTimeout = options.keepAliveTimeout;
    this.requestTimeout = options.requestTimeout;
    this.reverseProxy = options.reverseProxy ?? false;

    this._cluster = options.cluster ?? false;
    this._listen = options.listen ?? ['http://*:3000'];
    this._servers = [];
    this._quiet = options.quiet ?? false;
    this._workers = options.workers ?? os.cpus().length;
  }

  /**
   * Turn URL into listen arguments.
   */
  static listenArgsForURL(url: URL): ListenArgs {
    const listen = [];

    const hostname = url.hostname;
    const port = url.port;
    const params = url.searchParams;

    if (port !== '' && hostname !== '') {
      listen.push(parseInt(port));
      listen.push(hostname === '*' ? '0.0.0.0' : hostname.replace(/^\[/, '').replace(/]$/, ''));
    } else if (params.has('fd') === true) {
      listen.push({fd: parseInt(params.get('fd') ?? '')});
    } else {
      listen.push(undefined, '0.0.0.0');
    }

    return listen;
  }

  /**
   * Start server.
   */
  async start(): Promise<void> {
    await this.app.hooks.runHook('server:start', this.app);
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

  /**
   * Stop server.
   */
  async stop(): Promise<void> {
    await Promise.all(this._servers.map(async server => await new Promise(resolve => server.close(resolve))));
    await this.app.hooks.runHook('server:stop', this.app);
  }

  async _createServer(location: string): Promise<void> {
    const url = new URL(location);

    let isHttps = false;
    const options: https.ServerOptions = {};
    if (url.protocol === 'https:') {
      const params = url.searchParams;
      options.cert = await new Path(params.get('cert') ?? '').readFile();
      options.key = await new Path(params.get('key') ?? '').readFile();
      isHttps = true;
    }

    await this.app.warmup();

    const wss = new WebSocketServer({noServer: true});
    const server = (isHttps ? https : http).createServer(options, this._handleRequest.bind(this));
    this._servers.push(server);

    if (this.headersTimeout !== undefined) server.headersTimeout = this.headersTimeout;
    if (this.keepAliveTimeout !== undefined) server.keepAliveTimeout = this.keepAliveTimeout;
    if (this.requestTimeout !== undefined) server.requestTimeout = this.requestTimeout;

    server.on('upgrade', this._handleUpgrade.bind(this, wss));

    if (process.env.MOJO_SERVER_DEBUG === '1') {
      server.on('connection', socket => {
        const stderr = process.stderr;
        socket.on('data', (chunk: string) => stderr.write(`-- Server <<< Client\n${chunk}`));
        const write = socket.write;
        socket.write = (chunk: any, cb: any) => {
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

        if (this._quiet === false) {
          if (this._cluster === true) {
            console.log(`[${process.pid}] Web application available at ${realLocation}`);
          } else {
            console.log(`Web application available at ${realLocation}`);
          }
        }

        resolve();
      });
    });
  }

  _handleRequest(req: http.IncomingMessage, raw: http.ServerResponse): void {
    const app = this.app;
    const socket = req.socket;
    const ctx = app.newContext(
      this._prepareRequest(req, socket, false),
      new ServerResponse(function (res: ServerResponse, body: ResponseBody) {
        _sendResponse(res, body, raw);
      })
    );
    raw.on('finish', () => ctx.emit('finish'));
    app.handleRequest(ctx).catch(error => ctx.exception(error));
  }

  _handleUpgrade(wss: WebSocketServer, req: http.IncomingMessage, socket: Socket, head: Buffer): void {
    const app = this.app;
    const ctx = app.newContext(
      this._prepareRequest(req, socket, true),
      new ServerResponse(function (res: ServerResponse, body: ResponseBody) {
        _sendResponse(res, body, new http.ServerResponse(req));
      })
    );

    app
      .handleRequest(ctx)
      .then(() => {
        if (ctx.isAccepted === true) {
          wss.handleUpgrade(req, socket, head, ws => {
            ctx.handleUpgrade(new WebSocket(ws, null, {jsonMode: ctx.jsonMode}));
          });
        } else {
          socket.destroy();
        }
      })
      .catch(error => {
        if (ctx.isAccepted === false) socket.destroy();
        return ctx.exception(error);
      });
  }

  _prepareRequest(req: http.IncomingMessage, socket: Socket, isWebSocket: boolean): ServerRequest {
    return new ServerRequest({
      body: req,
      headers: req.rawHeaders,
      isSecure: (socket as any).encrypted ?? false,
      isWebSocket: isWebSocket,
      method: req.method,
      remoteAddress: socket.remoteAddress,
      reverseProxy: this.reverseProxy,
      url: req.url
    });
  }
}

function _sendHeaders(res: ServerResponse, raw: http.ServerResponse): void {
  const statusCode = res.statusCode;
  const statusMessage = res.statusMessage;
  const headers = res.headers.toArray();

  if (statusMessage === null) {
    raw.writeHead(statusCode, headers);
  } else {
    raw.writeHead(statusCode, statusMessage, headers);
  }
}

function _sendResponse(res: ServerResponse, body: ResponseBody, raw: http.ServerResponse): void {
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    res.length(Buffer.byteLength(body));
    _sendHeaders(res, raw);
    raw.end(body);
  } else if (body instanceof Stream) {
    _sendHeaders(res, raw);
    body.pipe(raw);
  } else {
    _sendHeaders(res, raw);
    raw.end();
  }
}
