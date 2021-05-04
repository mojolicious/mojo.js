/*!
 * mojo.js
 * Copyright (C) 2021 Sebastian Riedel
 * MIT Licensed
 */
import App from './lib/app.js';
import {callerFile} from './lib/file.js';

export default function mojo (...args) {
  const app = new App(...args);
  app.home = callerFile().dirname();
  app.cli.commandPaths.push(app.home.child('cli').toString());
  app.renderer.viewPaths.push(app.home.child('views').toString());
  app.router.controllerPaths.push(app.home.child('controllers').toString());
  app.static.publicPaths.push(app.home.child('public').toString());
  return app;
}
