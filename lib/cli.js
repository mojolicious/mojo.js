import nopt from 'nopt';
import * as util from './util.js';

export default class CLI {
  constructor (app) {
    this._app = new WeakRef(app);
    this.commands = {};
  }

  addCommand (name, command) {
    this.commands[name] = command;
  }

  async start () {
    if (process.env.MOJO_LOADER) return;

    for (const name of ['eval', 'get', 'server', 'version']) {
      this.addCommand(name, (await import(`./cli/${name}.js`)).default);
    }

    const parsed = nopt({help: Boolean}, {h: '--help'}, process.argv);
    if (parsed.argv.remain.length > 0) {
      const name = parsed.argv.original[0];
      const command = this.commands[name];
      if (!command) {
        process.stdout.write(`Unknown command "${name}", maybe you need to install it?\n`);
        process.exit();
      }
      if (parsed.help) return process.stdout.write(command.usage);
      return command(this._app.deref(), parsed.argv.original);
    }
    this._listCommands();
  }

  async _listCommands () {
    const commands = Object.keys(this.commands).sort().map(name => [name, this.commands[name].description]);
    process.stdout.write(util.tablify(commands));
  }
}
