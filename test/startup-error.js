import {spawn} from 'node:child_process';
import Path from '@mojojs/path';
import t from 'tap';

t.test('Startup error exit code', async t => {
  await t.test('onStart error exits with code 1', t => {
    return new Promise(resolve => {
      const testScript = Path.currentFile().sibling('support', 'js', 'startup-error-app.js').toString();
      const child = spawn('node', [testScript, 'server'], {
        stdio: 'pipe'
      });

      let stderr = '';
      child.stderr.on('data', data => {
        stderr += data.toString();
      });

      // Kill after 2 seconds if it doesn't exit on its own
      const timeout = setTimeout(() => {
        child.kill();
        t.fail('Process did not exit within timeout');
        resolve();
      }, 2000);

      child.on('close', code => {
        clearTimeout(timeout);
        t.equal(code, 1, 'Process should exit with code 1');
        t.match(stderr, /Intentional startup error/, 'Error message should be logged');
        resolve();
      });
    });
  });

  await t.test('server:start hook error exits with code 1', t => {
    return new Promise(resolve => {
      const testScript = Path.currentFile().sibling('support', 'js', 'server-start-error-app.js').toString();
      const child = spawn('node', [testScript, 'server'], {
        stdio: 'pipe'
      });

      let stderr = '';
      child.stderr.on('data', data => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill();
        t.fail('Process did not exit within timeout');
        resolve();
      }, 2000);

      child.on('close', code => {
        clearTimeout(timeout);
        t.equal(code, 1, 'Process should exit with code 1');
        t.match(stderr, /server:start hook error/, 'Error message should be logged');
        resolve();
      });
    });
  });
});
