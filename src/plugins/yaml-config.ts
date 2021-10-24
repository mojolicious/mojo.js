import type {MojoApp, ConfigOptions} from '../types.js';
import {loadConfig} from './json-config.js';
import yaml from 'js-yaml';

export default function jsonConfigPlugin(app: MojoApp, options: ConfigOptions): void {
  if (options.ext === undefined) options.ext = 'yml';
  loadConfig(app, options, yaml.load);
}
