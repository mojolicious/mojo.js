/*!
 * mojo.js
 * Copyright (C) 2021 Sebastian Riedel
 * MIT Licensed
 */
import type {AppOptions} from './types.js';
import {App} from './app.js';
import {Path} from './path.js';

export const version =
  JSON.parse(Path.currentFile().dirname().sibling('package.json').readFileSync().toString()).version;

export default function mojo (options?: AppOptions): App {
  const app = new App(options);

  const caller = app.home = Path.callerFile().dirname();
  const uplevel = caller.dirname();
  const callerExists = caller.child('package.json').existsSync();
  const uplevelExists = uplevel.child('package.json').existsSync();
  const dirName = caller.basename();

  // App in dist/lib/src and "package.json" in parent directory (but not in app directory)
  if (!callerExists && uplevelExists && ['dist', 'lib', 'src'].includes(dirName)) app.home = uplevel;

  app.cli.commandPaths.push(caller.child('cli').toString());
  app.router.controllerPaths.push(caller.child('controllers').toString());
  app.static.publicPaths.push(app.home.child('public').toString());
  app.renderer.viewPaths.push(app.home.child('views').toString());

  return app;
}

// "Professor: These old Doomsday devices are dangerously unstable. I'll rest easier not knowing where they are."
export {Client} from './client.js';
export {default as jsonConfigPlugin} from './plugins/json-config.js';
export {Logger} from './logger.js';
export {Path} from './path.js';
export {Server} from './server.js';
export {Session} from './session.js';
export {TestClient} from './client/test.js';
export * as util from './util.js';

export {
  Expand,
  ExpandRecursive,
  JSONValue,
  MojoAction,
  MojoApp,
  MojoClientRequestOptions,
  MojoClientWebSocketOptions,
  MojoContext,
  MojoRenderOptions,
  MojoStash
} from './types.js';
