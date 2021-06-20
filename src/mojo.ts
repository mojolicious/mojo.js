/*!
 * mojo.js
 * Copyright (C) 2021 Sebastian Riedel
 * MIT Licensed
 */
import type {AppOptions} from './types.js';
import App from './app.js';
import File from './file.js';

export default function mojo (options?: AppOptions): App {
  const app = new App(options);

  const caller = app.home = File.callerFile().dirname();
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
export {default as Client} from './client.js';
export {default as File} from './file.js';
export {default as jsonConfigPlugin} from './plugins/json-config.js';
export {default as Logger} from './logger.js';
export {default as Server} from './server.js';
export {default as Session} from './session.js';
export {default as TestClient} from './client/test.js';
export * as util from './util.js';

export {MojoAction, MojoApp, MojoContext, MojoRenderOptions, MojoStash} from './types.js';
