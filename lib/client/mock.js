import Client from '../client.js';
import Server from '../server.js';

export class MockClient extends Client {
  constructor (options) {
    super(options);
    this.server = undefined;
  }

  async start (app) {
    this.server = new Server(app, {listen: ['http://*'], quiet: true});
    await this.server.start();
    if (this.baseURL === undefined) this.baseURL = this.server.urls[0];
    return this;
  }

  stop () {
    return this.server.stop();
  }
}

export default function mockClient (app, options) {
  return new MockClient(options).start(app);
}
