import type {App} from '../app.js';
import type {UserAgentOptions} from '../types.js';
import {Server} from '../server.js';
import {UserAgent} from '../user-agent.js';

export class MockUserAgent extends UserAgent {
  server: Server | undefined;

  constructor(options?: UserAgentOptions) {
    super(options);

    this.server = undefined;
  }

  static async newMockUserAgent(app: App, options?: UserAgentOptions): Promise<MockUserAgent> {
    return await new MockUserAgent(options).start(app);
  }

  async start(app: App): Promise<this> {
    const server = (this.server = new Server(app, {listen: ['http://*'], quiet: true}));
    await server.start();
    if (this.baseUrl === undefined) this.baseUrl = server.urls[0];
    return this;
  }

  async stop(): Promise<void> {
    if (this.server === undefined) return;
    return await this.server.stop();
  }
}
