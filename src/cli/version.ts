import {version} from '../core.js';
import {tablify} from '@mojojs/util';

/**
 * Version command.
 */
export default async function versionCommand(): Promise<void> {
  const table = [
    ['node', `(${process.version}, ${process.platform})`],
    ['mojo.js', `(${version as string})`]
  ];
  process.stdout.write(tablify(table));
}

versionCommand.description = 'Show version';
versionCommand.usage = `Usage: APPLICATION version [OPTIONS]

  node index.js version

Options:
  -h, --help   Show this summary of available options
`;
