import type {MojoApp, MojoRoute, ConfigOptions} from '../types.js';

interface MountOptions extends ConfigOptions {
  app: MojoApp;
  path: string;
}

/**
 * Mount plugin.
 */
export default function mountPlugin(app: MojoApp, options: MountOptions): MojoRoute {
  const mountApp = options.app;
  mountApp.secrets = app.secrets;
  mountApp.log = app.log;
  app.addAppHook('app:warmup', () => mountApp.warmup());
  app.addAppHook('app:start', () => mountApp.hooks.serverStart(mountApp));
  app.addAppHook('app:stop', () => mountApp.hooks.serverStop(mountApp));

  const path = options.path;
  return app
    .any(`${path}/*mountPath`, async ctx => {
      const req = ctx.req;
      const res = ctx.res;

      // The embedded application does not use the path prefix
      const originalPath = req.path;
      const stash = ctx.stash;
      req.path = '/' + stash.mountPath;

      const mountContext = mountApp.newContext(req, res);
      Object.assign(mountContext.stash, stash);

      try {
        await mountApp.handleRequest(mountContext);

        // WebSockets require the contexts to be linked
        if (mountContext.isAccepted === true) {
          ctx.jsonMode = mountContext.jsonMode;
          ctx.on('connection', ws => mountContext.handleUpgrade(ws));
        }
      } finally {
        // Application specific information needs to be reset
        req.path = originalPath;
        res.bindContext(ctx);
      }
    })
    .to({mountPath: ''});
}
