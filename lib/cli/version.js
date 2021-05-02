import {currentFile} from '../file.js';
import {tablify} from '../util.js';

export default async function versionCommand () {
  const data = JSON.parse(currentFile().child('..', '..', '..', 'package.json').readFileSync());
  const table = [['node', `(${process.version}, ${process.platform})`], ['mojo.js', `(${data.version})`]];
  process.stdout.write(tablify(table));
}

versionCommand.description = 'Show version';
versionCommand.usage = `Usage: APPLICATION version [OPTIONS]

  ./myapp.js version

Options:
  -h, --help   Show this summary of available options
`;
