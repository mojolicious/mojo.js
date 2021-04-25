'use strict';

import nopt from 'nopt';
import * as util from './util.js';

// This file is excluded from eslint for now since eslint does not support top level await yet
const BUILTIN = [];
for (const name of ['eval', 'server', 'version']) {
  BUILTIN.push([name, (await import(`./cli/${name}.js`)).default]);
}

export default class CLI {
  constructor (app) {
    this._app = new WeakRef(app);
    this.commands = {};
    BUILTIN.forEach(pair => this.addCommand(...pair));
  }

  addCommand (name, command) {
    this.commands[name] = command;
  }

  async start () {
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
