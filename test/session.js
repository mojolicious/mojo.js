import crypto from 'node:crypto';
import t from 'tap';

t.test('Session', async t => {
  let calls = 0;
  const scrypt = (...args) => {
    calls++;
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
});
