import type {App} from './app.js';
import {loadModules} from './util.js';
import Path from '@mojojs/path';
import {tablify} from '@mojojs/util';
import nopt from 'nopt';

interface Command {
  (app: App, args: string[]): Promise<void>;
  description: string;
  hidden?: boolean;
  usage: string;
}

/**
 * Command line interface class.
 */
export class CLI {
  /**
   * Paths to search for commands.
   */
  commandPaths: string[] = [Path.currentFile().sibling('cli').toString()];
  /**
   * Registered commands.
   */
  commands: Record<string, Command> = {};

  _app: WeakRef<App>;
  _loaded: boolean | undefined = undefined;

  constructor(app: App) {
    this._app = new WeakRef(app);
  }

  /**
   * Add a command.
   */
  addCommand(name: string, command: Command): void {
    this.commands[name] = command;
  }

  /**
   * Detect command from environment.
   */
  detectCommand(): string | null {
    const env = process.env;
    if (env.MOJO_NO_DETECT === '1') return null;

    // CGI detection
    if (env.PATH_INFO !== undefined || env.GATEWAY_INTERFACE !== undefined) return 'cgi';

    return null;
  }

  /**
   * Start command line interface.
   */
  async start(command?: string, ...args: string[]): Promise<void> {
    const detected = this.detectCommand();
    const commandArgs =
      detected !== null ? ['', '', detected] : command === undefined ? process.argv : ['', '', command, ...args];

    const app = this._app.deref();
    if (app === undefined) return;
    if ((await app.hooks.commandBefore(app, commandArgs)) === true) return;

    if (this._loaded === undefined) await this._loadCommands();
    if ((await app.hooks.runHook('command:init', app, commandArgs)) === true) return;

    const parsed = nopt({help: Boolean, 'show-all': Boolean}, {h: '--help'}, commandArgs);
    const {argv} = parsed;

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
      await this._listCommands(parsed['show-all']);
    }

    await app.hooks.commandAfter(app, commandArgs);
  }

  async _listCommands(showAll = false): Promise<void> {
    const commands = Object.keys(this.commands)
      .sort()
      .filter(name => showAll === true || this.commands[name].hidden !== true)
      .map(name => [` ${name}`, this.commands[name].description]);
    process.stdout.write(header + tablify(commands) + footer);
  }

  async _loadCommands(): Promise<void> {
    this._loaded = true;
    for (const [name, command] of Object.entries(await loadModules(this.commandPaths))) {
      this.addCommand(name, command);
    }
  }
}

const header = `Usage: APPLICATION COMMAND [OPTIONS]

  node index.js server -l http://*:8080
  node index.js get /foo

Options:
  -h, --help       Get more information on a specific command
      --show-all   Include developer commands in the list

Commands:
`;

const footer = `
See 'APPLICATION COMMAND --help' for more information on a specific command.
`;
