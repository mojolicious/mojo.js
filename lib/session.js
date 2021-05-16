import crypto from 'crypto';

export default class Session {
  constructor (app) {
    this.cookieName = 'mojo';
    this.cookiePath = '/';
    this.expiration = 3600;
    this.httpOnly = true;
    this.sameSite = 'Lax';
    this.secure = false;
    this._app = new WeakRef(app);
  }

  getSignedCookie (ctx, name) {
    const cookie = ctx.req.getCookie(name);
    if (cookie === null) return null;

    const match = cookie.match(/--([^-]+)$/);
    if (match === null) return null;
    const hash = match[1];
    const value = cookie.substring(0, match.index);

    for (const secret of this._app.deref().secrets) {
      const hmac = crypto.createHmac('sha1', secret);
      hmac.update(value);
      if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac.digest('hex')))) return value;
    }

    return null;
  }

  load (ctx) {
    const cookie = this.getSignedCookie(ctx, this.cookieName);
    if (cookie === null) return null;
    const data = JSON.parse(Buffer.from(cookie.replaceAll('-', '='), 'base64'));

    const expires = data.expires;
    delete data.expires;
    if (expires <= Math.round(Date.now() / 1000)) return null;

    return data;
  }

  setSignedCookie (ctx, name, value, options) {
    const hmac = crypto.createHmac('sha1', this._app.deref().secrets[0]);
    hmac.update(value);
    const sum = hmac.digest('hex');
    ctx.res.setCookie(name, `${value}--${sum}`, options);
  }

  store (ctx, data) {
    if (typeof data.expires !== 'number') data.expires = Math.round(Date.now() / 1000) + this.expiration;
    const serialized = Buffer.from(JSON.stringify(data)).toString('base64').replaceAll('=', '-');

    this.setSignedCookie(ctx, this.cookieName, serialized, {
      expires: new Date(data.expires * 1000),
      httpOnly: this.httpOnly,
      path: this.cookiePath,
      sameSite: this.sameSite,
      secure: this.secure
    });
  }
}
