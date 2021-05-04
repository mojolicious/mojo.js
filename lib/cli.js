import nopt from 'nopt';
import url from 'url';
import {currentFile, File} from './file.js';
import * as util from './util.js';

export default class CLI {
  constructor (app) {
    this.commandPaths = [currentFile().sibling('cli').toString()];
    this.commands = {};
    this._app = new WeakRef(app);
    this._warmup = undefined;
  }

  addCommand (name, command) {
    this.commands[name] = command;
  }

  async start (command, ...options) {
    if (this._warmup === undefined) await this.warmup();

    const args = command === undefined ? process.argv : [null, null, command, ...options];
    const parsed = nopt({help: Boolean}, {h: '--help'}, args);
    if (parsed.argv.remain.length > 0) {
      const name = parsed.argv.original[0];
      const command = this.commands[name];
      if (command === undefined) {
        process.stdout.write(`Unknown command "${name}", maybe you need to install it?\n`);
        process.exit();
      }
      if (parsed.help) return process.stdout.write(command.usage);
      return await command(this._app.deref(), parsed.argv.original);
    }
    this._listCommands();
  }

  async warmup () {
    this._warmup = true;
    for (const dir of this.commandPaths.map(path => new File(path))) {
      if (!(await dir.exists())) continue;
      for await (const file of dir.list()) {
        const imports = await import(url.pathToFileURL(file.toString()));
        this.addCommand(file.basename('.js'), imports.default);
      }
    }
  }

  async _listCommands () {
    const commands = Object.keys(this.commands).sort().map(name => [name, this.commands[name].description]);
    process.stdout.write(util.tablify(commands));
  }
}
