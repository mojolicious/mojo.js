'use strict';

import cluster from 'cluster';
import http from 'http';
import os from 'os';
import WebSocket from 'ws';

export default class Server {
  constructor (app, options = {}) {
    this._app = app;
    this._cluster = options.cluster;
    this._listen = options.listen || ['http://*:3000'];
  }

  start () {
    if (this._cluster && cluster.isPrimary) {
      const numCPUs = os.cpus().length;
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
    } else {
      for (const location of this._listen) {
        this._createServer(location);
      }
    }
  }

  _createServer (location) {
    const url = new URL(location);
    const port = url.port || null;

    const wss = new WebSocket.Server({noServer: true});
    const server = this.server = http.createServer((req, res) => {
      const ctx = this._app.newHTTPContext(req, res);
      this._app.handle(ctx);
    });

    server.on('upgrade', (req, socket, head) => {
      const ctx = this._app.newWebSocketContext(req);
      this._app.handle(ctx);
      wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    });

    server.listen(port, () => {
      const realPort = server.address().port;
      console.log(`[${process.pid}] Web application available at http://127.0.0.1:${realPort}`);
    });
  }
}
