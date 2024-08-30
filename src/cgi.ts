import type {MojoApp, ServerResponseBody} from './types.js';
import {Stream, type Readable} from 'node:stream';
import {ServerRequest} from './server/request.js';
import {ServerResponse} from './server/response.js';
import {httpStatusMessages} from './util.js';

/**
 * CGI class. Is this a joke? Yes. Could you use it in production anyway? Probably.
 */
export class CGI {
  app: MojoApp;

  constructor(app: MojoApp) {
    this.app = app;
  }

  /**
   * Create a request object for a CGI environment.
   */
  static envToRequest(env: NodeJS.ProcessEnv, body: Readable): ServerRequest {
    // Method
    const method = env.REQUEST_METHOD ?? 'GET';

    // URL
    let url = env.PATH_INFO ?? '/';
    const name = env.SCRIPT_NAME;
    if (name !== undefined && url.startsWith(name) === true) url = url.replace(name, '');
    const query = env.QUERY_STRING;
    if (query !== undefined && query !== '') url += `?${query}`;

    // Headers
    const headers: string[] = [];
    for (const [name, value] of Object.entries(env)) {
      const nameMatch = name.match(/^HTTP_(.+)$/);
      if (nameMatch === null || value === undefined) continue;
      headers.push(nameMatch[1].replaceAll('_', '-'), value);
    }

    // Special headers
    if (env.CONTENT_LENGTH !== undefined) headers.push('Content-Length', env.CONTENT_LENGTH);
    if (env.CONTENT_TYPE !== undefined) headers.push('Content-Type', env.CONTENT_TYPE);

    // HTTPS
    const isSecure = (env.HTTPS ?? '').toUpperCase() === 'ON';

    return new ServerRequest({
      body,
      headers,
      isSecure,
      isWebSocket: false,
      method,
      reverseProxy: false,
      url
    });
  }

  /**
   * Run CGI application.
   */
  async run(): Promise<void> {
    const {app} = this;
    await app.hooks.serverStart(app);
    await app.warmup();

    const ctx = app.newContext(
      CGI.envToRequest(process.env, process.stdin),
      new ServerResponse(async (res: ServerResponse, body: ServerResponseBody) => {
        this._sendResponse(res, body);
      }),
      {name: 'cgi'}
    );
    await app.handleRequest(ctx).catch(error => ctx.exception(error));

    await app.hooks.serverStop(app);
  }

  _sendResponse(res: ServerResponse, body: ServerResponseBody): void {
    const code = res.statusCode;
    res.headers.set('Status', `${code} ${httpStatusMessages[code]}`);

    const stdout = process.stdout;
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      res.length(Buffer.byteLength(body));
      stdout.write(res.headers.toString());
      stdout.write(body);
    } else if (body instanceof Stream) {
      stdout.write(res.headers.toString());
      body.pipe(stdout);
    }
  }
}
