import type {MojoApp} from '../types.js';
import type {ClientRequest, IncomingMessage} from 'http';
import chalk from 'chalk';
import nopt from 'nopt';

type IntrospectedRequest = ClientRequest & {getRawHeaderNames: () => string[]; getHeader: (name: string) => string};
type IntrospectedResponse = IncomingMessage & {req: IntrospectedRequest};

export default async function getCommand(app: MojoApp, args: string[]): Promise<void> {
  const parsed = nopt(
    {body: String, header: [String, Array], insecure: Boolean, method: String, redirect: Boolean, verbose: Boolean},
    {b: '--body', H: '--header', k: '--insecure', X: '--method', r: '--redirect', v: '--verbose'},
    args,
    1
  );

  const argv = parsed.argv;
  const request = {
    body: parsed.body,
    headers: parseHeaders(parsed.header),
    insecure: parsed.insecure,
    method: parsed.method ?? 'GET',
    url: argv.remain[0] ?? '/'
  };

  const ua = await app.newMockUserAgent({maxRedirects: parsed.redirect === true ? 10 : 0});
  const res = await ua.request(request);

  if (parsed.verbose === true) {
    const stderr = process.stderr;
    const raw = res.raw as IntrospectedResponse;
    const req = raw.req;
    const method = chalk.blue(req.method);
    const reqVersion = chalk.blue('HTTP') + '/' + chalk.blue('1.1');
    stderr.write(`${method} ${req.path} ${reqVersion}\n`);
    writeHeaders(getHeaders(req));

    const resVersion = chalk.blue('HTTP') + '/' + chalk.blue(raw.httpVersion);
    const status = res.status;
    const statusMessage = chalk.blue(res.statusMessage);
    stderr.write(`${resVersion} ${status} ${statusMessage}\n`);
    writeHeaders(raw.rawHeaders);
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
  -r, --redirect              Follow up to 10 redirects
  -X, --method <method>       HTTP method to use, defaults to "GET"
  -v, --verbose               Print response headers to STDERR
`;

function getHeaders(req: IntrospectedRequest): string[] {
  const headers = [];

  for (const name of req.getRawHeaderNames()) {
    const header = req.getHeader(name);
    if (typeof header === 'string') {
      headers.push(name, header);
    } else if (typeof header === 'number') {
      headers.push(name, header.toString());
    } else if (Array.isArray(header)) {
      header.forEach(value => headers.push(name, value));
    }
  }

  return headers;
}

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
