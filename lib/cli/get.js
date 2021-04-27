import nopt from 'nopt';

export default async function getCommand (app) {
  const parsed = nopt({}, {}, process.argv);
  const client = await app.newMockClient();

  const res = await client.get(parsed.argv.remain[1] || '/');
  await res.pipe(process.stdout);

  await client.stop();
}
getCommand.description = 'Perform HTTP request';
getCommand.usage = `Usage: APPLICATION get [OPTIONS]

  ./myapp.js get /
  ./myapp.js get https://mojolicious.org

Options:
  -h, --help   Show this summary of available options
`;
