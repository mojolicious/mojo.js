'use strict';

const File = require('../file');

function jsonConfigPlugin (app, options = {}) {
  const filename = new File(options.file ?? 'config.json');
  const filePath = filename.isAbsolute() === true ? filename : app.home.child(filename.toString());

  const log = app.log;
  if (filePath.existsSync() === true) {
    Object.assign(app.config, JSON.parse(filePath.readFileSync()));
    log.trace(`Config file "${filePath}" loaded`);
  } else {
    log.trace(`Config file "${filePath}" does not exist`);
  }

  const fileParts = filePath.toString().split('.');
  fileParts.splice(-1, 0, app.mode);
  const modeFilePath = new File(fileParts.join('.'));
  if (modeFilePath.existsSync() === true) {
    Object.assign(app.config, JSON.parse(modeFilePath.readFileSync()));
    log.trace(`Mode specific config file "${filePath}" loaded`);
  }
}

module.exports = jsonConfigPlugin;
