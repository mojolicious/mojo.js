import type {MojoApp} from '../types.ts';
import {parseArgs, styleText} from 'node:util';

/**
 * Get command.
 */
export default async function getCommand(app: MojoApp, args: string[]): Promise<void> {
  const {values, positionals} = parseArgs({
    args: args.slice(1),
    options: {
      body: {type: 'string', short: 'b'},
      header: {type: 'string', short: 'H', multiple: true},
      insecure: {type: 'boolean', short: 'k'},
      method: {type: 'string', short: 'X'},
      redirect: {type: 'boolean', short: 'r'},
      'socket-path': {type: 'string', short: 'P'},
      verbose: {type: 'boolean', short: 'v'}
    },
    allowPositionals: true,
    allowNegative: true
  });

  const request = {
    body: values.body,
    headers: parseHeaders(values.header),
    insecure: values.insecure,
    method: values.method ?? 'GET',
    socketPath: values['socket-path'],
    url: positionals[0] ?? '/'
  };

  const ua = await app.newMockUserAgent({maxRedirects: values.redirect === true ? 10 : 0});
  const res = await ua.request(request);

  if (values.verbose === true) {
    const stderr = process.stderr;

    const resVersion = styleText('blue', 'HTTP') + '/' + styleText('blue', res.httpVersion);
    const statusCode = res.statusCode;
    const statusMessage = styleText('blue', res.statusMessage);
    stderr.write(`${resVersion} ${statusCode} ${statusMessage}\n`);
    writeHeaders(res.headers.toArray());
  }

  if (positionals[1] !== undefined) {
    const html = await res.html();
    process.stdout.write(
      html
        .find(positionals[1])
        .map(el => el.toString())
        .join('') ?? ''
    );
  } else {
    await res.pipe(process.stdout);
  }

  await ua.stop();
}

getCommand.description = 'Perform HTTP request';
getCommand.usage = `Usage: APPLICATION get [OPTIONS] URL [SELECTOR]

  node index.js get /
  node index.js get -X POST /hello
  node index.js get -H 'Accept: application/json' /api/test
  node index.js get https://mojolicious.org
  node index.js get https://mojolicious.org 'head > title'

Options:
  -b, --body <data>           Content to send with request
  -H, --header <name:value>   One or more additional HTTP headers
  -h, --help                  Show this summary of available options
  -k, --insecure              Do not require a valid TLS certificate to access
                              HTTPS sites
  -P, --socket-path <path>    UNIX domain socket path
  -r, --redirect              Follow up to 10 redirects
  -X, --method <method>       HTTP method to use, defaults to "GET"
  -v, --verbose               Print response headers to stderr
`;

function parseHeaders(list: string[] = []): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const pair of list) {
    const header = pair.split(/:\s+/);
    headers[header[0]] = header[1];
  }
  return headers;
}

function writeHeaders(headers: string[]): void {
  const stderr = process.stderr;
  for (let i = 0; i < headers.length; i += 2) {
    stderr.write(styleText('cyan', headers[i]) + `: ${headers[i + 1]}\n`);
  }
  stderr.write('\n');
}
