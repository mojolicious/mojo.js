import cluster from 'cluster';
import http from 'http';
import os from 'os';
import WebSocket from 'ws';

export default class Server {
  constructor (app, options = {}) {
    this.urls = [];
    this._app = app;
    this._cluster = options.cluster;
    this._listen = options.listen || ['http://*:3000'];
    this._servers = [];
    this._quiet = options.quiet;
  }

  async start () {
    if (this._cluster && cluster.isPrimary) {
      const numCPUs = os.cpus().length;
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
    } else {
      for (const location of this._listen) {
        await this._createServer(location);
      }
    }
  }

  async stop () {
    for (const server of this._servers) {
      await new Promise(resolve => server.close(resolve));
    }
  }

  _createServer (location) {
    const url = new URL(location);

    const wss = new WebSocket.Server({noServer: true});
    const server = this.server = http.createServer((req, res) => {
      const ctx = this._app.newHTTPContext(req, res);
      this._app.handleRequest(ctx);
    });
    this._servers.push(server);

    server.on('upgrade', (req, socket, head) => {
      const ctx = this._app.newWebSocketContext(req);
      this._app.handleRequest(ctx);
      wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    });

    return new Promise(resolve => {
      server.listen(url.port || null, () => {
        const realPort = server.address().port;
        const url = new URL(`http://127.0.0.1:${realPort}`);
        this.urls.push(url);
        if (!this._quiet) console.log(`[${process.pid}] Web application available at ${url}`);
        resolve();
      });
    });
  }
}
