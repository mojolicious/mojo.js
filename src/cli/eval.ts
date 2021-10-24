import type {MojoApp} from '../types.js';

export default async function evalCommand(app: MojoApp, args: string[]): Promise<void> {
  console.log(eval(args[1]));
}

evalCommand.description = 'Run code against application';
evalCommand.usage = `Usage: APPLICATION eval [OPTIONS] CODE

  node index.js eval 'app.home.toString()'

Options:
  -h, --help   Show this summary of available options
`;
