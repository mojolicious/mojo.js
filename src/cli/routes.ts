import type {Route} from '../router/route.ts';
import type {Router} from '../router.ts';
import type {MojoApp} from '../types.ts';
import {parseArgs, styleText} from 'node:util';
import {tablify} from '@mojojs/util';

/**
 * Routes command.
 */
export default async function routesCommand(app: MojoApp, args: string[]): Promise<void> {
  const {values} = parseArgs({
    args: args.slice(1),
    options: {verbose: {type: 'boolean', short: 'v'}},
    allowPositionals: true,
    allowNegative: true
  });
  const table: string[][] = [];
  app.router.children.map(route => walk(route, 0, table, values.verbose === true));
  process.stdout.write(tablify(table));
}

routesCommand.description = 'Show available routes';
routesCommand.usage = `Usage: APPLICATION routes [OPTIONS]

  node index.js routes
  node index.js routes -v

Options:
  -h, --help      Show this summary of available options
  -v, --verbose   Print additional details about routes
`;

function walk(route: Route | Router, depth: number, rows: string[][], verbose: boolean): void {
  const prefix = ' '.repeat(depth * 2) + (depth === 0 ? '' : '+');
  const unparsed = route.pattern.unparsed;
  const row = [prefix + (unparsed === '' ? '/' : unparsed)];
  rows.push(row);

  // Methods
  const methods = route.methods;
  row.push(styleText('cyan', methods.length === 0 ? '*' : methods.map(method => method.toUpperCase()).join(',')));

  // Name
  row.push(
    route.customName !== undefined ? styleText('green', route.customName) : styleText('red', route.defaultName ?? 'n/a')
  );

  // Regex (verbose)
  const pattern = route.pattern;
  pattern.match('/', {isEndpoint: route.isEndpoint()});
  if (verbose) row.push(pattern.regex?.toString() ?? '');

  // Children
  depth++;
  route.children.map(child => walk(child, depth, rows, verbose));
  depth--;
}
