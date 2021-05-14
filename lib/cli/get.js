import chalk from 'chalk';
import nopt from 'nopt';

export default async function getCommand (app, args) {
  const parsed = nopt({header: [String, Array], insecure: Boolean, method: String, verbose: Boolean},
    {H: '--header', k: '--insecure', X: '--method', v: '--verbose'}, args, 1);

  const request = {
    method: parsed.method || 'GET',
    url: parsed.argv.remain[0] || '/',
    headers: parseHeaders(parsed.header),
    insecure: parsed.insecure
  };

  const client = await app.newMockClient();
  const res = await client.request(request);

  if (parsed.verbose) {
    const req = res.raw.req;
    const method = chalk.blue(req.method);
    const reqVersion = chalk.blue('HTTP') + '/' + chalk.blue('1.1');
    process.stderr.write(`${method} ${req.path} ${reqVersion}\n`);
    writeHeaders(getHeaders(req));

    const resVersion = chalk.blue('HTTP') + '/' + chalk.blue(res.raw.httpVersion);
    const status = chalk.blue(res.status);
    const statusMessage = chalk.cyan(res.statusMessage);
    process.stderr.write(`${resVersion} ${status} ${statusMessage}\n`);
    writeHeaders(res.raw.rawHeaders);
  }

  await res.pipe(process.stdout);
  await client.stop();
}

getCommand.description = 'Perform HTTP request';
getCommand.usage = `Usage: APPLICATION get [OPTIONS] URL

  node index.js get /
  node index.js get -X POST /hello
  node index.js get -H 'Accept: application/json' /api/test
  node index.js get https://mojojs.org

Options:
  -H, --header <name:value>            One or more additional HTTP headers
  -h, --help              Show this summary of available options
  -k, --insecure          Do not require a valid TLS certificate to access
                          HTTPS sites
  -X, --method <method>   HTTP method to use, defaults to "GET"
  -v, --verbose           Print response headers to STDERR
`;

function getHeaders (req) {
  const headers = [];
  for (const name of req.getRawHeaderNames()) {
    headers.push(name, req.getHeader(name));
  }
  return headers;
}

function parseHeaders (list = []) {
  const headers = {};
  for (const pair of list) {
    const header = pair.split(/:\s+/);
    headers[header[0]] = header[1];
  }
  return headers;
}

function writeHeaders (headers) {
  for (let i = 0; i < headers.length; i += 2) {
    process.stderr.write(chalk.cyan(headers[i]) + `: ${headers[i + 1]}\n`);
  }
  process.stderr.write('\n');
}
