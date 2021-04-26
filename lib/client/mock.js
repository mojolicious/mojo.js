import Client from '../client.js';
import Server from '../server.js';

class MockClient extends Client {
  constructor (server, options) {
    super(options);
    this._server = server;
  }

  stop () {
    return this._server.stop();
  }
}

export default async function mock (app, options = {}) {
  const server = new Server(app, {listen: ['http://*'], quiet: true});
  await server.start();
  return new MockClient(server, {...options, baseURL: server.urls[0]});
}
