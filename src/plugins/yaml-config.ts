import type {MojoApp} from '../types.js';
import Path from '@mojojs/path';
import yaml from 'js-yaml';

export default function yamlConfigPlugin(app: MojoApp, options: {file?: string}): void {
  const filename = new Path(options.file ?? 'config.yaml');
  const filePath = filename.isAbsolute() ? filename : app.home.child(filename.toString());

  const log = app.log;
  if (filePath.existsSync()) {
    Object.assign(app.config, yaml.load(filePath.readFileSync().toString()));
    log.trace(`Config file "${filePath.toString()}" loaded`);
  } else {
    log.trace(`Config file "${filePath.toString()}" does not exist`);
  }

  const fileParts = filePath.toString().split('.');
  fileParts.splice(-1, 0, app.mode);
  const modeFilePath = new Path(fileParts.join('.'));
  if (modeFilePath.existsSync()) {
    Object.assign(app.config, yaml.load(modeFilePath.readFileSync().toString()));
    log.trace(`Mode specific config file "${filePath.toString()}" loaded`);
  }
}
