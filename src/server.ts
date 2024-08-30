import type {MojoApp, ServerOptions, ServerResponseBody} from './types.js';
import type {Socket} from 'node:net';
import cluster from 'node:cluster';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import {Stream} from 'node:stream';
import {URL} from 'node:url';
import {ServerRequest} from './server/request.js';
import {ServerResponse} from './server/response.js';
import {WebSocket} from './websocket.js';
import Path from '@mojojs/path';
import {termEscape} from '@mojojs/util';
import {WebSocketServer} from 'ws';

type ListenArgs = any[];

/*
To regenerate the certificate run this command:
openssl req -x509 -newkey rsa:4096 -nodes -sha256 -out development.crt -keyout development.key -days 7300
  -subj '/CN=localhost'
*/
const certs = Path.currentFile().dirname().sibling('vendor', 'certs');
const devCert = certs.child('development.crt').toString();
const devKey = certs.child('development.key').toString();

/**
 * HTTP and WebSocket server class.
 */
export class Server {
  /**
   * Application this server handles.
   */
  app: MojoApp;
  /**
   * Limit the amount of time the parser will wait to receive the complete HTTP headers, defaults to `60000`
   * (60 seconds).
   */
  headersTimeout: number | undefined;
  /**
   * Limit the amount of time of inactivity a server needs to wait for additional incoming data, after it has finished
   * writing the last response, before a socket will be destroyed, defaults to `5000` (5 seconds).
   */
  keepAliveTimeout: number | undefined;
  /**
   * Maximum number of requests socket can handle before closing keep alive connection, defaults to `0`.
   */
  maxRequestsPerSocket: number | undefined;
  /**
   * Limit the amount of time for receiving the entire request from the client, defaults to `300000` (300 seconds).
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
  _servers: (http.Server | https.Server)[] = [];
  _quiet: boolean;
  _workers: number;

  constructor(app: MojoApp, options: ServerOptions = {}) {
    this.app = app;
    this.headersTimeout = options.headersTimeout;
    this.keepAliveTimeout = options.keepAliveTimeout;
    this.maxRequestsPerSocket = options.maxRequestsPerSocket;
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

    const {hostname, port, protocol, searchParams} = url;

    if (protocol === 'http+unix:') {
      listen.push({path: urlToSocketPath(url)});
    } else if (port !== '' && hostname !== '') {
      listen.push(parseInt(port));
      listen.push(hostname === '*' ? '0.0.0.0' : hostname.replace(/^\[/, '').replace(/]$/, ''));
    } else if (searchParams.has('fd') === true) {
      listen.push({fd: parseInt(searchParams.get('fd') ?? '')});
    } else {
      listen.push(undefined, '0.0.0.0');
    }

    return listen;
  }

  /**
   * Start server.
   */
  async start(): Promise<void> {
    const {app} = this;
    await app.hooks.serverStart(app);
    if (this._cluster === true && cluster.isPrimary === true) {
      for (let i = 0; i < this._workers; i++) cluster.fork();
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

    // Clean up UNIX domain sockets
    for (const url of this.urls) {
      if (url.protocol === 'http+unix') await new Path(urlToSocketPath(url)).rm();
    }

    const {app} = this;
    await app.hooks.serverStop(app);
  }

  async _createServer(location: string): Promise<void> {
    const url = new URL(location);

    let isHttps = false;
    const options: https.ServerOptions = {};
    if (url.protocol === 'https:') {
      const {searchParams} = url;
      options.cert = await new Path(searchParams.get('cert') ?? devCert).readFile();
      options.key = await new Path(searchParams.get('key') ?? devKey).readFile();
      isHttps = true;
    }

    await this.app.warmup();

    const wss = new WebSocketServer({noServer: true});
    const server = ((isHttps ? https : http) as any).createServer(options, this._handleRequest.bind(this));
    this._servers.push(server);

    if (this.maxRequestsPerSocket !== undefined) server.maxRequestsPerSocket = this.maxRequestsPerSocket;
    if (this.headersTimeout !== undefined) server.headersTimeout = this.headersTimeout;
    if (this.keepAliveTimeout !== undefined) server.keepAliveTimeout = this.keepAliveTimeout;
    if (this.requestTimeout !== undefined) server.requestTimeout = this.requestTimeout;

    server.on('upgrade', this._handleUpgrade.bind(this, wss));

    if (process.env.MOJO_SERVER_DEBUG === '1') {
      server.on('connection', (socket: Socket) => {
        const stderr = process.stderr;
        socket.on('data', (chunk: string) => stderr.write(termEscape(`-- Server <<< Client\n${chunk}`)));
        const write = socket.write;
        socket.write = (chunk: string | Uint8Array, cb: any) => {
          stderr.write(termEscape(`-- Server >>> Client\n${chunk}`));
          return write.apply(socket, [chunk, cb]);
        };
      });
    }

    return new Promise(resolve => {
      server.listen(...Server.listenArgsForURL(url), () => {
        const address = server.address();

        // UNIX domain socket
        let realLocation: URL | undefined;
        if (typeof address === 'string') {
          realLocation = new URL(`http+unix://${address}`);
        }

        // TCP socket
        else if (address !== null && typeof address === 'object') {
          const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
          realLocation = new URL(`${url.protocol}//${host}:${address.port}`);
        } else {
          throw new Error('Unknown server address');
        }

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
    const {app} = this;
    const {socket} = req;
    const ctx = app.newContext(
      this._prepareRequest(req, socket, false),
      new ServerResponse((res: ServerResponse, body: ServerResponseBody) => {
        sendResponse(res, body, raw);
      }),
      {name: 'server', req, res: raw}
    );
    raw.on('finish', () => ctx.emit('finish'));
    app.handleRequest(ctx).catch(error => ctx.exception(error));
  }

  _handleUpgrade(wss: WebSocketServer, req: http.IncomingMessage, socket: Socket, head: Buffer): void {
    const {app} = this;
    const ctx = app.newContext(
      this._prepareRequest(req, socket, true),
      new ServerResponse((res: ServerResponse, body: ServerResponseBody) => {
        sendResponse(res, body, new http.ServerResponse(req));
      }),
      {name: 'server'}
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

function sendHeaders(res: ServerResponse, raw: http.ServerResponse): void {
  const statusCode = res.statusCode;
  const statusMessage = res.statusMessage;
  const headers = res.headers.toArray();

  if (statusMessage === null) {
    raw.writeHead(statusCode, headers);
  } else {
    raw.writeHead(statusCode, statusMessage, headers);
  }
}

function sendResponse(res: ServerResponse, body: ServerResponseBody, raw: http.ServerResponse): void {
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    res.length(Buffer.byteLength(body));
    sendHeaders(res, raw);
    raw.end(body);
  } else if (body instanceof Stream) {
    sendHeaders(res, raw);
    body.pipe(raw);
  } else {
    sendHeaders(res, raw);
    raw.end();
  }
}

function urlToSocketPath(url: URL): string {
  return url.host + url.pathname;
}
