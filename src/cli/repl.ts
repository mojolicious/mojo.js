import type {MojoApp} from '../types.js';
import repl from 'node:repl';

/**
 * Repl command.
 */
export default async function replCommand(app: MojoApp): Promise<void> {
  repl.start().context.app = app;
}

replCommand.description = 'Start a repl for application';
replCommand.usage = `Usage: APPLICATION repl [OPTIONS]

  node index.js repl

Options:
  -h, --help   Show this summary of available options
`;
