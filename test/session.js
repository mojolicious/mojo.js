import crypto from 'node:crypto';
import t from 'tap';

t.test('Session', async t => {
  let calls = 0;
  let fail = false;
  const scrypt = (...args) => {
    calls++;
    if (fail === true) {
      fail = false;
      return args[args.length - 1](new Error('Temporary failure'));
    }
    return crypto.scrypt(...args);
  };
  const {Session} = await t.mockImport('../src/session.ts', {'node:crypto': {...crypto, default: {...crypto, scrypt}}});

  await t.test('Keys are only derived once per secret', async t => {
    const encrypted = await Promise.all([1, 2, 3].map(n => Session.encrypt('s3cret', `value ${n}`)));
    t.equal(await Session.decrypt(['s3cret'], encrypted[0]), 'value 1');
    t.equal(await Session.decrypt(['s3cret'], encrypted[2]), 'value 3');
    t.equal(calls, 1);

    t.equal(await Session.decrypt(['other', 's3cret'], encrypted[1]), 'value 2');
    t.equal(await Session.decrypt(['other'], encrypted[1]), null);
    t.equal(calls, 2);
  });

  await t.test('Failures are not cached', async t => {
    fail = true;
    await t.rejects(Session.encrypt('another', 'value'), /Temporary failure/);
    const encrypted = await Session.encrypt('another', 'value');
    t.equal(await Session.decrypt(['another'], encrypted), 'value');
    t.equal(calls, 4);
  });
});
