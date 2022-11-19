import {Hooks} from '../lib/hooks.js';
import t from 'tap';

t.test('Hooks', async t => {
  await t.test('Special application lifecycle hooks', async t => {
    const hooks = new Hooks();

    hooks.addHook('command:before', async () => results.push('command:before'));
    hooks.addHook('server:start', async () => results.push('server:start'));
    hooks.addHook('app:start', async () => results.push('app:start'));
    hooks.addHook('app:stop', async () => results.push('app:stop'));
    hooks.addHook('server:stop', async () => results.push('server:stop'));
    hooks.addHook('command:after', async () => results.push('command:after'));

    // Realistic order for "get" command
    let results = [];
    await hooks.commandBefore();
    await hooks.serverStart();
    await hooks.serverStop();
    await hooks.commandAfter();
    t.same(results, ['command:before', 'app:start', 'server:start', 'server:stop', 'command:after', 'app:stop']);

    // Realistic order for "server" command
    results = [];
    await hooks.commandBefore();
    await hooks.serverStart();
    await hooks.commandAfter();
    await hooks.serverStop();
    t.same(results, ['command:before', 'app:start', 'server:start', 'command:after', 'server:stop', 'app:stop']);

    // Realistic order for "eval" command
    results = [];
    await hooks.commandBefore();
    await hooks.commandAfter();
    t.same(results, ['command:before', 'app:start', 'command:after', 'app:stop']);

    // Realistic order for tests
    results = [];
    await hooks.serverStart();
    await hooks.serverStop();
    t.same(results, ['server:start', 'app:start', 'server:stop', 'app:stop']);
  });
});
