/*!
 * mojo.js
 * Copyright (C) 2021 Sebastian Riedel
 * MIT Licensed
 */
import App from './lib/app.js';
import {callerFile} from './lib/file.js';

export default function mojo (...args) {
  const app = new App(...args);
  const caller = callerFile();
  app.home = caller.dirname();
  app.moniker = caller.basename('.js');
  app.renderer.viewPaths = [app.home.child('views').toString()];
  app.router.controllerPaths = [app.home.child('controllers').toString()];
  app.static.publicPaths = [app.home.child('public').toString()];
  return app;
}
