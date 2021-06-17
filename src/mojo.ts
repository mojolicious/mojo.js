/*!
 * mojo.js
 * Copyright (C) 2021 Sebastian Riedel
 * MIT Licensed
 */
import type {AppOptions} from './types.js';
import App from './app.js';
import Client from './client.js';
import File from './file.js';
import jsonConfigPlugin from './plugins/json-config.js';
import Logger from './logger.js';
import Server from './server.js';
import Session from './session.js';
import TestClient from './client/test.js';
import * as util from './util.js';

export default function mojo (options?: AppOptions): App {
  const app = new App(options);
  app.mojo = mojo;

  const caller = app.home = File.callerFile().dirname();
  const uplevel = caller.dirname();
  const callerExists = caller.child('package.json').existsSync();
  const uplevelExists = uplevel.child('package.json').existsSync();
  const dirName = caller.basename();

  // App in dist/lib/src and "package.json" in parent directory (but not in app directory)
  if (!callerExists && uplevelExists && ['dist', 'lib', 'src'].includes(dirName)) app.home = uplevel;

  app.cli.commandPaths.push(caller.child('cli').toString());
  app.router.controllerPaths.push(caller.child('controllers').toString());
  app.static.publicPaths.push(app.home.child('public').toString());
  app.renderer.viewPaths.push(app.home.child('views').toString());

  return app;
}

// "Professor: These old Doomsday devices are dangerously unstable. I'll rest easier not knowing where they are."
mojo.Client = Client;
mojo.File = File;
mojo.jsonConfigPlugin = jsonConfigPlugin;
mojo.Logger = Logger;
mojo.Server = Server;
mojo.Session = Session;
mojo.TestClient = TestClient;
mojo.util = util;
