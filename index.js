/*!
 * mojo.js
 * Copyright (C) 2021 Sebastian Riedel
 * MIT Licensed
 */
import App from './lib/app.js';

export default function mojo (...args) {
  return new App(...args);
}
