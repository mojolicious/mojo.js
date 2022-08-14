import mojo, {mountPlugin} from '../../../../lib/core.js';
import {app as fullApp} from '../full-app/index.js';
import {app as configApp} from '../jsonconfig-app/app.js';

export const app = mojo();

app.log.level = 'info';
app.exceptionFormat = 'json';

app.defaults.sharedValue = 'sharing works!';
fullApp.get('/extended', ctx => ctx.render({text: `${ctx.stash.sharedValue}`}));
fullApp.get('/fails', () => {
  throw new Error('Intentional error');
});

app.plugin(mountPlugin, {app: fullApp, host: /^test1\.example\.com$/});
app.plugin(mountPlugin, {app: fullApp, host: /test2\.example\.com$/, path: '/mount/full-three'});
app.plugin(mountPlugin, {app: fullApp, path: '/mount/full'});
app.plugin(mountPlugin, {app: fullApp, path: '/mount/full-two'});
app.plugin(mountPlugin, {app: configApp, path: '/config'});

app.any('/', ctx => ctx.render({text: 'Hello MountApp!'}));

app.get('/session/members', async ctx => {
  const session = await ctx.session();
  const user = session.user ?? 'not logged in';
  return ctx.render({text: `Member: ${user}`});
});

app.start();
