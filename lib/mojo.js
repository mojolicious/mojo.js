/*!
 * mojo.js
 * Copyright (C) 2021 Sebastian Riedel
 * MIT Licensed
 */
import App from './app.js';
import File from './file.js';
import Logger from './logger.js';
import * as util from './util.js';

export default function mojo (options) {
  const app = new App(options);
  app.mojo = mojo;
  app.home = File.callerFile().dirname();
  app.cli.commandPaths.push(app.home.child('cli').toString());
  app.renderer.viewPaths.push(app.home.child('views').toString());
  app.router.controllerPaths.push(app.home.child('controllers').toString());
  app.static.publicPaths.push(app.home.child('public').toString());
  return app;
}

// "Professor: These old Doomsday devices are dangerously unstable. I'll rest easier not knowing where they are."
mojo.File = File;
mojo.Logger = Logger;
mojo.util = util;
