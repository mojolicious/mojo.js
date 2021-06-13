import Client from '../client.js';
import Server from '../server.js';

/**
 * Class representing an HTTP/WebSocket mock client.
 * @extends Client
 */
export default class MockClient extends Client {
  /**
   * Create HTTP/WebSocket mock client.
   * @param {{baseURL?: string, maxRedirects?: number, name?: string}} [options] - Optional settings.
   */
  constructor (options) {
    super(options);

    /** @type {Server} - Server to use for requests with relative URLs. */
    this.server = undefined;
  }

  /**
   * Mock client factory.
   * @param {App} app - Application to use for requests with relative URLs.
   * @param {{baseURL?: string, maxRedirects?: number, name?: string, tap?: object}} [options] - Optional settings.
   * @returns {Promise<MockClient>} Mock client.
   */
  static newMockClient (app, options) {
    return new MockClient(options).start(app);
  }

  /**
   * Start server used for requests with relative URLs.
   * @param {App} app - Application to use for requests with relative URLs.
   * @returns {Promise<this>} Mock client.
   */
  async start (app) {
    const server = this.server = new Server(app, {listen: ['http://*'], quiet: true});
    await server.start();
    if (this.baseURL === undefined) this.baseURL = server.urls[0];
    return this;
  }

  /**
   * Stop server used for requests with relative URLs.
   * @returns {Promise} Promise that resolves when the server has been stopped.
   */
  stop () {
    return this.server.stop();
  }
}
