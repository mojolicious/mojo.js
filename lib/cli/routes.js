import chalk from 'chalk';
import nopt from 'nopt';
import {tablify} from '../util.js';

export default function routesCommand (app, args) {
  const parsed = nopt({verbose: Boolean}, {v: '--verbose'}, args, 1);
  const table = [];
  app.router.children.map(route => _walk(route, 0, table, parsed.verbose));
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

function _walk (route, depth, rows, verbose) {
  const prefix = ' '.repeat(depth * 2) + (depth === 0 ? '' : '+');
  const row = [prefix + (route.pattern.unparsed || '/')];
  rows.push(row);

  // Methods
  row.push(chalk.cyan(route.methods.length === 0 ? '*' : route.methods.map(method => method.toUpperCase()).join(',')));

  // Name
  row.push(route.customName !== undefined ? chalk.green(route.customName) : chalk.red(route.defaultName || 'n/a'));

  // Regex (verbose)
  const pattern = route.pattern;
  pattern.match('/', {isEndpoint: route.isEndpoint()});
  if (verbose === true) row.push(pattern.regex.toString());

  // Children
  depth++;
  route.children.map(child => _walk(child, depth, rows, verbose));
  depth--;
}
