import fs from 'fs/promises';
import {tablify} from '../util.js';

export default async function versionCommand () {
  const data = JSON.parse(await fs.readFile(new URL('../../package.json', import.meta.url)));
  const table = [['node', `(${process.version}, ${process.platform})`], ['mojo.js', `(${data.version})`]];
  process.stdout.write(tablify(table));
}

versionCommand.description = 'Show version';
versionCommand.usage = `Usage: APPLICATION version [OPTIONS]

  ./myapp.js version

Options:
  -h, --help   Show this summary of available options
`;
