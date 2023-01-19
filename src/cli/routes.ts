import type {Route} from '../router/route.js';
import type {Router} from '../router.js';
import type {MojoApp} from '../types.js';
import {tablify} from '@mojojs/util';
import chalk from 'chalk';
import nopt from 'nopt';

/**
 * Routes command.
 */
export default async function routesCommand(app: MojoApp, args: string[]): Promise<void> {
  const parsed = nopt({verbose: Boolean}, {v: '--verbose'}, args, 1);
  const table: string[][] = [];
  app.router.children.map(route => walk(route, 0, table, parsed.verbose));
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
  row.push(chalk.cyan(methods.length === 0 ? '*' : methods.map(method => method.toUpperCase()).join(',')));

  // Name
  row.push(route.customName !== undefined ? chalk.green(route.customName) : chalk.red(route.defaultName ?? 'n/a'));

  // Regex (verbose)
  const pattern = route.pattern;
  pattern.match('/', {isEndpoint: route.isEndpoint()});
  if (verbose) row.push(pattern.regex?.toString() ?? '');

  // Children
  depth++;
  route.children.map(child => walk(child, depth, rows, verbose));
  depth--;
}
