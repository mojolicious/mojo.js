import type {App} from './app.js';
import * as util from './util.js';
import Path from '@mojojs/path';
import nopt from 'nopt';

interface Command {
  (app: App, args: string[]): Promise<void>;
  description: string;
  usage: string;
}

export class CLI {
  commandPaths: string[] = [Path.currentFile().sibling('cli').toString()];
  commands: Record<string, Command> = {};
  _app: WeakRef<App>;
  _loaded: boolean | undefined = undefined;

  constructor(app: App) {
    this._app = new WeakRef(app);
  }

  addCommand(name: string, command: Command): void {
    this.commands[name] = command;
  }

  async start(command?: string, ...args: string[]): Promise<void> {
    if (this._loaded === undefined) await this._loadCommands();

    const commandArgs = command === undefined ? process.argv : ['', '', command, ...args];
    const app = this._app.deref();
    if (app === undefined) return;
    await app.hooks.runHook('command:before', app, commandArgs);

    const parsed = nopt({help: Boolean}, {h: '--help'}, commandArgs);
    const argv = parsed.argv;

    if (argv.remain.length > 0) {
      const name: string = argv.original[0];
      const command = this.commands[name];
      if (command === undefined) {
        process.stdout.write(`Unknown command "${name}", maybe you need to install it?\n`);
      } else if (parsed.help === true) {
        process.stdout.write(command.usage);
      } else {
        await command(app, argv.original);
      }
    } else {
      await this._listCommands();
    }

    await app.hooks.runHook('command:after', app, commandArgs);
  }

  async _listCommands(): Promise<void> {
    const commands = Object.keys(this.commands)
      .sort()
      .map(name => [` ${name}`, this.commands[name].description]);
    process.stdout.write(header + util.tablify(commands) + footer);
  }

  async _loadCommands(): Promise<void> {
    this._loaded = true;
    for (const [name, command] of Object.entries(await util.loadModules(this.commandPaths))) {
      this.addCommand(name, command);
    }
  }
}

const header = `Usage: APPLICATION COMMAND [OPTIONS]

  node index.js server -l http://*:8080
  node index.js get /foo

Commands:
`;

const footer = `
See 'APPLICATION COMMAND --help' for more information on a specific command.
`;
