'use strict';

const nopt = require('nopt');
const util = require('./util');

const defautCommands = ['server', 'version'].map(name => [name, require(`./cli/${name}`)]);

class CLI {
  constructor (app) {
    this._app = new WeakRef(app);
    this.commands = {};
    defautCommands.forEach(pair => this.addCommand(...pair));
  }

  addCommand (name, command) {
    this.commands[name] = command;
  }

  start () {
    const parsed = nopt({help: Boolean}, {h: '--help'}, process.argv);
    if (parsed.argv.remain.length > 0) {
      const name = parsed.argv.original[0];
      const command = this.commands[name];
      if (parsed.help) return process.stdout.write(command.usage);
      return command(this._app.deref());
    }
    this._listCommands();
  }

  async _listCommands () {
    const commands = Object.keys(this.commands).sort().map(name => [name, this.commands[name].description]);
    process.stdout.write(util.tablify(commands));
  }
}

module.exports = CLI;
