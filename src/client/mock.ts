import type {App} from '../app.js';
import type {ClientOptions} from '../types.js';
import {Client} from '../client.js';
import {Server} from '../server.js';

export class MockClient extends Client {
  server: Server | undefined;

  constructor (options?: ClientOptions) {
    super(options);

    this.server = undefined;
  }

  static async newMockClient (app: App, options?: ClientOptions): Promise<MockClient> {
    return await new MockClient(options).start(app);
  }

  async start (app: App): Promise<this> {
    const server = this.server = new Server(app, {listen: ['http://*'], quiet: true});
    await server.start();
    if (this.baseURL === undefined) this.baseURL = server.urls[0];
    return this;
  }

  async stop (): Promise<void> {
    if (this.server === undefined) return;
    return await this.server.stop();
  }
}
