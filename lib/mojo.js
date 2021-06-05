/*!
 * mojo.js
 * Copyright (C) 2021 Sebastian Riedel
 * MIT Licensed
 */
'use strict';

const App = require('./app');
const Client = require('./client');
const File = require('./file');
const jsonConfigPlugin = require('./plugins/json-config');
const Logger = require('./logger');
const Server = require('./server');
const Session = require('./session');
const TestClient = require('./client/test');
const util = require('./util');

function mojo (options) {
  const app = new App(options);
  app.mojo = mojo;
  const home = app.home = File.callerFile().dirname();
  app.cli.commandPaths.push(home.child('cli').toString());
  app.renderer.viewPaths.push(home.child('views').toString());
  app.router.controllerPaths.push(home.child('controllers').toString());
  app.static.publicPaths.push(home.child('public').toString());
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

module.exports = mojo;
