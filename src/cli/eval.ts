import type {MojoApp} from '../types.ts';
import {parseArgs} from 'node:util';

/**
 * Eval command.
 */
export default async function evalCommand(app: MojoApp, args: string[]): Promise<void> {
  const {values, positionals} = parseArgs({
    args: args.slice(1),
    options: {verbose: {type: 'boolean', short: 'v'}},
    allowPositionals: true,
    allowNegative: true
  });
  const output = await eval('(async () => (' + positionals[0] + '))()');
  if (values.verbose === true) console.log(output);
}

evalCommand.description = 'Run code against application';
evalCommand.usage = `Usage: APPLICATION eval [OPTIONS] CODE

  node index.js eval -v '(await app.ua.get("https://mojojs.org")).status'
  node index.js eval -v 'app.home.toString()'
  node index.js eval -v 'app.renderer.viewPaths'

  # Use "--" for code starting with "-"
  node index.js eval -v -- '-1 + 2'

Options:
  -h, --help      Show this summary of available options
  -v, --verbose   Print return value to stdout
`;
