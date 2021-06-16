import type App from '../app.js';
import File from '../file.js';

export default function jsonConfigPlugin (app: App, options: {file?: string}): void {
  const filename = new File(options.file ?? 'config.json');
  const filePath = filename.isAbsolute() ? filename : app.home.child(filename.toString());

  const log = app.log;
  if (filePath.existsSync()) {
    Object.assign(app.config, JSON.parse(filePath.readFileSync().toString()));
    log.trace(`Config file "${filePath.toString()}" loaded`);
  } else {
    log.trace(`Config file "${filePath.toString()}" does not exist`);
  }

  const fileParts = filePath.toString().split('.');
  fileParts.splice(-1, 0, app.mode);
  const modeFilePath = new File(fileParts.join('.'));
  if (modeFilePath.existsSync()) {
    Object.assign(app.config, JSON.parse(modeFilePath.readFileSync().toString()));
    log.trace(`Mode specific config file "${filePath.toString()}" loaded`);
  }
}
