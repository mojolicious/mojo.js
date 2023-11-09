import type {App} from '../app.js';
import type {ServerOptions, UserAgentOptions} from '../types.js';
import {Server} from '../server.js';
import {UserAgent} from '../user-agent.js';

/**
 * Mock user-agent class.
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

  async [Symbol.asyncDispose]() {
    await this.stop();
  }

  /**
   * Create a new mock user-agent.
   */
  static async newMockUserAgent(
    app: App,
    options?: UserAgentOptions,
    serverOptions?: ServerOptions
  ): Promise<MockUserAgent> {
    return await new MockUserAgent(options).start(app, serverOptions);
  }

  /**
   * Start mock server.
   */
  async start(app: App, options: ServerOptions & {https?: boolean} = {}): Promise<this> {
    const listen = [options.https === true ? 'https://*' : 'http://*'];
    const server = (this.server = new Server(app, {...options, listen, quiet: true}));
    await server.start();
    if (this.baseURL === undefined) this.baseURL = server.urls[0];
    return this;
  }

  /**
   * Stop mock server.
   */
  async stop(): Promise<void> {
    await this.destroy();
    if (this.server !== undefined) return await this.server.stop();
  }
}
