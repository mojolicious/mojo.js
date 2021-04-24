'use strict';

import nopt from 'nopt';
import * as util from './util.js';

const DEFAULT = ['eval', 'server', 'version'];

export default class CLI {
  constructor (app) {
    this._app = new WeakRef(app);
    this.commands = {};
  }

  addCommand (name, command) {
    this.commands[name] = command;
  }

  async start () {
    const defautCommands = await Promise.all(DEFAULT.map(name => import(`./cli/${name}.js`)));
    for (let i = 0; i < DEFAULT.length; i++) {
      this.addCommand(DEFAULT[i], defautCommands[i].default);
    }

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
