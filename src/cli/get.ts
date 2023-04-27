import type {MojoApp} from '../types.js';
import chalk from 'chalk';
import nopt from 'nopt';

/**
 * Get command.
 */
export default async function getCommand(app: MojoApp, args: string[]): Promise<void> {
  const parsed = nopt(
    {
      body: String,
      header: [String, Array],
      insecure: Boolean,
      method: String,
      redirect: Boolean,
      'socket-path': String,
      verbose: Boolean
    },
    {b: '--body', H: '--header', k: '--insecure', X: '--method', P: '--socket-path', r: '--redirect', v: '--verbose'},
    args,
    1
  );

  const argv = parsed.argv;
  const request = {
    body: parsed.body,
    headers: parseHeaders(parsed.header),
    insecure: parsed.insecure,
    method: parsed.method ?? 'GET',
    socketPath: parsed['socket-path'],
    url: argv.remain[0] ?? '/'
  };

  const ua = await app.newMockUserAgent({maxRedirects: parsed.redirect === true ? 10 : 0});
  const res = await ua.request(request);

  if (parsed.verbose === true) {
    const stderr = process.stderr;

    const resVersion = chalk.blue('HTTP') + '/' + chalk.blue(res.httpVersion);
    const statusCode = res.statusCode;
    const statusMessage = chalk.blue(res.statusMessage);
    stderr.write(`${resVersion} ${statusCode} ${statusMessage}\n`);
    writeHeaders(res.headers.toArray());
  }

  if (argv.remain[1] !== undefined) {
    const html = await res.html();
    process.stdout.write(
      html
        .find(argv.remain[1])
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
    stderr.write(chalk.cyan(headers[i]) + `: ${headers[i + 1]}\n`);
  }
  stderr.write('\n');
}
