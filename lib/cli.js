'use strict';

const File = require('./file');
const nopt = require('nopt');
const util = require('./util');

class CLI {
  constructor (app) {
    this.commandPaths = [File.currentFile().sibling('cli').toString()];
    this.commands = {};

    this._app = new WeakRef(app);
    this._loaded = undefined;
  }

  addCommand (name, command) {
    this.commands[name] = command;
  }

  async start (command, ...options) {
    if (this._loaded === undefined) await this._loadCommands();

    const args = command === undefined ? process.argv : [null, null, command, ...options];
    const parsed = nopt({help: Boolean}, {h: '--help'}, args);
    const argv = parsed.argv;
    if (argv.remain.length > 0) {
      const name = argv.original[0];
      const command = this.commands[name];
      if (command === undefined) {
        process.stdout.write(`Unknown command "${name}", maybe you need to install it?\n`);
        return;
      }
      if (parsed.help) return process.stdout.write(command.usage);
      return await command(this._app.deref(), argv.original);
    }
    this._listCommands();
  }

  async _listCommands () {
    const commands = Object.keys(this.commands).sort().map(name => [` ${name}`, this.commands[name].description]);
    process.stdout.write(header + util.tablify(commands) + footer);
  }

  async _loadCommands () {
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

module.exports = CLI;
