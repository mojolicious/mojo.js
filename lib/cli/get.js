import chalk from 'chalk';
import nopt from 'nopt';

export default async function getCommand (app, args) {
  const parsed = nopt({insecure: Boolean, method: String, verbose: Boolean},
    {k: '--insecure', X: '--method', v: '--verbose'}, args, 1);

  const request = {method: parsed.method || 'GET', url: parsed.argv.remain[0] || '/', insecure: parsed.insecure};

  const client = await app.newMockClient();
  const res = await client.request(request);

  if (parsed.verbose) {
    const httpVersion = chalk.blue('HTTP') + '/' + chalk.blue(res.raw.httpVersion);
    const status = chalk.blue(res.status);
    const statusMessage = chalk.cyan(res.statusMessage);
    process.stderr.write(`${httpVersion} ${status} ${statusMessage}\n`);
    const headers = res.raw.rawHeaders;
    for (let i = 0; i < headers.length; i += 2) {
      process.stderr.write(chalk.cyan(headers[i]) + `: ${headers[i + 1]}\n`);
    }
    process.stderr.write('\n');
  }
  await res.pipe(process.stdout);

  await client.stop();
}

getCommand.description = 'Perform HTTP request';
getCommand.usage = `Usage: APPLICATION get [OPTIONS] URL

  node index.js get /
  node index.js get -X POST /hello
  node index.js get https://mojojs.org

Options:
  -h, --help              Show this summary of available options
  -k, --insecure          Do not require a valid TLS certificate to access
                          HTTPS sites
  -X, --method <method>   HTTP method to use, defaults to "GET"
  -v, --verbose           Print response headers to STDERR
`;
