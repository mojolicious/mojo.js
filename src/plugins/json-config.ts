import type {ConfigOptions, MojoApp} from '../types.js';
import Path from '@mojojs/path';

/**
 * JSON config plugin.
 */
export default function jsonConfigPlugin(app: MojoApp, options: ConfigOptions): void {
  if (options.ext === undefined) options.ext = 'json';
  loadConfig(app, options, JSON.parse);
}

export function loadConfig(app: MojoApp, options: ConfigOptions, parser: (config: string) => any): void {
  const filename = new Path(options.file ?? `config.${options.ext}`);
  const filePath = filename.isAbsolute() ? filename : app.home.child(filename.toString());

  const log = app.log;
  if (filePath.existsSync() === true) {
    Object.assign(app.config, parser(filePath.readFileSync().toString()));
    log.trace(`Config file "${filePath.toString()}" loaded`);
  } else {
    log.trace(`Config file "${filePath.toString()}" does not exist`);
  }

  const fileParts = filePath.toString().split('.');
  fileParts.splice(-1, 0, app.mode);
  const modeFilePath = new Path(fileParts.join('.'));
  if (modeFilePath.existsSync() === true) {
    Object.assign(app.config, parser(modeFilePath.readFileSync().toString()));
    log.trace(`Mode specific config file "${filePath.toString()}" loaded`);
  }
}
