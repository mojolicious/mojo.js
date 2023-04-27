import type {MojoApp} from '../types.js';
import nopt from 'nopt';

/**
 * Eval command.
 */
export default async function evalCommand(app: MojoApp, args: string[]): Promise<void> {
  const parsed = nopt({verbose: Boolean}, {v: '--verbose'}, args, 1);
  const output = await eval('(async () => (' + parsed.argv.remain[0] + '))()');
  if (parsed.verbose === true) console.log(output);
}

evalCommand.description = 'Run code against application';
evalCommand.usage = `Usage: APPLICATION eval [OPTIONS] CODE

  node index.js eval -v '(await app.ua.get("https://mojojs.org")).status'
  node index.js eval -v 'app.home.toString()'
  node index.js eval -v 'app.renderer.viewPaths'

Options:
  -h, --help      Show this summary of available options
  -v, --verbose   Print return value to stdout
`;
