import Client from '../client.js';
import Server from '../server.js';

/**
 * Class representing an HTTP/WebSocket mock client.
 * @extends Client
 */
export default class MockClient extends Client {
  /**
   * Create HTTP/WebSocket mock client.
   * @param {object} [options] - Optional settings.
   * @param {string} [options.baseURL]
   * @param {number} [options.maxRedirects]
   * @param {string} [options.name]
   */
  constructor (options) {
    super(options);
    this.server = undefined;
  }

  static newMockClient (app, options) {
    return new MockClient(options).start(app);
  }

  async start (app) {
    const server = this.server = new Server(app, {listen: ['http://*'], quiet: true});
    await server.start();
    if (this.baseURL === undefined) this.baseURL = server.urls[0];
    return this;
  }

  stop () {
    return this.server.stop();
  }
}
