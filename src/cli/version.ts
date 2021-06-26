import type {Command} from '../types.js';
import {version} from '../core.js';
import {tablify} from '../util.js';

const versionCommand: Command = Object.assign(
  async () => {
    const table = [['node', `(${process.version}, ${process.platform})`], ['mojo.js', `(${version})`]];
    process.stdout.write(tablify(table));
  },
  {
    description: 'Show version',
    usage: `Usage: APPLICATION version [OPTIONS]

  node index.js version

Options:
  -h, --help   Show this summary of available options
    `
  }
);

export default versionCommand;
