import type {App} from '../app.js';
import type {UserAgentOptions} from '../types.js';
import {Server} from '../server.js';
import {UserAgent} from '../user-agent.js';

/**
 * Mock user agent class.
 */
export class MockUserAgent extends UserAgent {
  /**
   * Server to use for mock requests.
   */
  server: Server | undefined = undefined;

  constructor(options?: UserAgentOptions) {
    super(options);

    this.server = undefined;
  }

  /**
   * Create a new mock user agent.
   */
  static async newMockUserAgent(app: App, options?: UserAgentOptions): Promise<MockUserAgent> {
    return await new MockUserAgent(options).start(app);
  }

  /**
   * Start mock server.
   */
  async start(app: App): Promise<this> {
    const server = (this.server = new Server(app, {listen: ['http://*'], quiet: true}));
    await server.start();
    if (this.baseURL === undefined) this.baseURL = server.urls[0];
    return this;
  }

  /**
   * Stop mock server.
   */
  async stop(): Promise<void> {
    this.destroy();
    if (this.server === undefined) return;
    return await this.server.stop();
  }
}
