import {parseCookie, stringifyCookie} from '../lib/server/cookie.js';
import t from 'tap';

t.test('parseCookie', t => {
  t.same(parseCookie(''), {});
  t.same(parseCookie(',,,'), {});
  t.same(parseCookie(',,,'), {});
  t.same(parseCookie(';,;,'), {});

  t.same(parseCookie('CUSTOMER=WILE_E_COYOTE'), {CUSTOMER: 'WILE_E_COYOTE'});
  t.same(parseCookie('CUSTOMER="WILE_E_COYOTE"'), {CUSTOMER: 'WILE_E_COYOTE'});
  t.same(parseCookie('CUSTOMER = WILE_E_COYOTE'), {CUSTOMER: 'WILE_E_COYOTE'});
  t.same(parseCookie('CUSTOMER = "WILE_E_COYOTE"'), {CUSTOMER: 'WILE_E_COYOTE'});
  t.same(parseCookie('  CUSTOMER  =  WILE_E_COYOTE  '), {CUSTOMER: 'WILE_E_COYOTE'});
  t.same(parseCookie('  CUSTOMER  =  "WILE_E_COYOTE"  '), {CUSTOMER: 'WILE_E_COYOTE'});

  t.same(parseCookie('CUSTOMER=WILE_E_COYOTE; PART_NUMBER=ROCKET_LAUNCHER_0001; SHIPPING=FEDEX'), {
    CUSTOMER: 'WILE_E_COYOTE',
    PART_NUMBER: 'ROCKET_LAUNCHER_0001',
    SHIPPING: 'FEDEX'
  });
  t.same(parseCookie('CUSTOMER=WILE_E_COYOTE; PART_NUMBER=ROCKET_LAUNCHER_0001, SHIPPING=FEDEX'), {
    CUSTOMER: 'WILE_E_COYOTE',
    PART_NUMBER: 'ROCKET_LAUNCHER_0001',
    SHIPPING: 'FEDEX'
  });
  t.same(parseCookie('CUSTOMER=WILE_E_COYOTE, PART_NUMBER=ROCKET_LAUNCHER_0001, SHIPPING=FEDEX'), {
    CUSTOMER: 'WILE_E_COYOTE',
    PART_NUMBER: 'ROCKET_LAUNCHER_0001',
    SHIPPING: 'FEDEX'
  });
  t.same(parseCookie('CUSTOMER=WILE_E_COYOTE; PART_NUMBER="ROCKET_LAUNCHER_0001"; SHIPPING=FEDEX'), {
    CUSTOMER: 'WILE_E_COYOTE',
    PART_NUMBER: 'ROCKET_LAUNCHER_0001',
    SHIPPING: 'FEDEX'
  });

  t.same(parseCookie('CUSTOMER=WILE=E=COYOTE; PART_NUMBER="ROCKET=LAUNCHER=0001"; SHIPPING = FEDEX'), {
    CUSTOMER: 'WILE=E=COYOTE',
    PART_NUMBER: 'ROCKET=LAUNCHER=0001',
    SHIPPING: 'FEDEX'
  });
  t.same(parseCookie('CUSTOMER=WILE_E_COYOTE;;,; PART_NUMBER=ROCKET_LAUNCHER_0001,,, SHIPPING=FEDEX'), {
    CUSTOMER: 'WILE_E_COYOTE',
    PART_NUMBER: 'ROCKET_LAUNCHER_0001',
    SHIPPING: 'FEDEX'
  });

  t.same(parseCookie('CUSTOMER=WILE_%2E%3A_COYOTE'), {CUSTOMER: 'WILE_.:_COYOTE'});

  t.end();
});

t.test('stringifyCookie', t => {
  t.equal(stringifyCookie('CUSTOMER', 'WILE_E_COYOTE'), 'CUSTOMER=WILE_E_COYOTE');
  t.equal(stringifyCookie('CUSTOMER', 'WILE%E:COYOTE'), 'CUSTOMER=WILE%25E%3ACOYOTE');

  t.equal(
    stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {domain: 'example.com'}),
    'CUSTOMER=WILE_E_COYOTE; Domain=example.com'
  );
  t.equal(stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {path: '/'}), 'CUSTOMER=WILE_E_COYOTE; Path=/');
  t.equal(stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {path: '/test'}), 'CUSTOMER=WILE_E_COYOTE; Path=/test');
  t.equal(
    stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {domain: 'example.com', path: '/test'}),
    'CUSTOMER=WILE_E_COYOTE; Domain=example.com; Path=/test'
  );

  t.equal(
    stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {expires: new Date(1635460478000)}),
    'CUSTOMER=WILE_E_COYOTE; Expires=Thu, 28 Oct 2021 22:34:38 GMT'
  );
  t.equal(
    stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {maxAge: 1635460478}),
    'CUSTOMER=WILE_E_COYOTE; Max-Age=1635460478'
  );

  t.equal(stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {sameSite: 'lax'}), 'CUSTOMER=WILE_E_COYOTE; SameSite=Lax');
  t.equal(
    stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {sameSite: 'strict'}),
    'CUSTOMER=WILE_E_COYOTE; SameSite=Strict'
  );
  t.equal(stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {sameSite: 'none'}), 'CUSTOMER=WILE_E_COYOTE; SameSite=None');

  t.equal(stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {httpOnly: true}), 'CUSTOMER=WILE_E_COYOTE; HttpOnly');
  t.equal(stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {secure: true}), 'CUSTOMER=WILE_E_COYOTE; Secure');
  t.equal(
    stringifyCookie('CUSTOMER', 'WILE_E_COYOTE', {httpOnly: true, secure: true}),
    'CUSTOMER=WILE_E_COYOTE; HttpOnly; Secure'
  );

  t.end();
});
