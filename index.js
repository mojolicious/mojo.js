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
  return app;
}
