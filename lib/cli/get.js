import nopt from 'nopt';

export default async function getCommand (app, args) {
  const parsed = nopt({method: String, verbose: Boolean}, {X: '--method', v: '--verbose'}, args, 1);

  const client = await app.newMockClient();
  const res = await client.request({method: parsed.method || 'GET', url: parsed.argv.remain[0] || '/'});

  if (parsed.verbose) {
    process.stderr.write(`HTTP/${res.raw.httpVersion} ${res.status} ${res.statusMessage}\n`);
    const headers = res.raw.rawHeaders;
    for (let i = 0; i < headers.length; i += 2) {
      process.stderr.write(`${headers[i]}: ${headers[i + 1]}\n`);
    }
    process.stderr.write('\n');
  }
  await res.pipe(process.stdout);

  await client.stop();
}

getCommand.description = 'Perform HTTP request';
getCommand.usage = `Usage: APPLICATION get [OPTIONS] URL

  ./myapp.js get /
  ./myapp.js get -X POST /hello
  ./myapp.js get https://mojojs.org

Options:
  -h, --help              Show this summary of available options
  -X, --method <method>   HTTP method to use, defaults to "GET"
  -v, --verbose           Print response headers to STDERR
`;
