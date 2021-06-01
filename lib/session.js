import crypto from 'crypto';
import {promisify} from 'util';

const scrypt = promisify(crypto.scrypt);

const IV = crypto.randomBytes(16);

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

  static async decrypt (secrets, value) {
    if (value.includes('--') === false) return null;

    const [realValue, ivEncoded] = value.split('--');
    const iv = Buffer.from(ivEncoded, 'base64');

    for (const secret of secrets) {
      try {
        const key = await scrypt(secret, 'salt', 32);

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = decipher.update(realValue, 'base64', 'utf8');
        return decrypted + decipher.final('utf8');
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  static async encrypt (secret, value) {
    const key = await scrypt(secret, 'salt', 32);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, IV);
    const encrypted = cipher.update(value, 'utf8', 'base64');
    return encrypted + cipher.final('base64') + '--' + IV.toString('base64');
  }

  async load (ctx) {
    const cookie = await this._getCookie(ctx, this.cookieName);
    if (cookie === null) return null;

    const data = JSON.parse(cookie);
    const expires = data.expires;
    delete data.expires;
    if (expires <= Math.round(Date.now() / 1000)) return null;

    return data;
  }

  static sign (secret, value) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(value);
    const sum = hmac.digest('hex');
    return `${value}--${sum}`;
  }

  async store (ctx, data) {
    if (typeof data.expires !== 'number') data.expires = Math.round(Date.now() / 1000) + this.expiration;

    const secret = this._app.deref().secrets[0];
    const encrypted = await Session.encrypt(secret, JSON.stringify(data));
    this._setCookie(ctx, secret, this.cookieName, encrypted, {
      expires: new Date(data.expires * 1000),
      httpOnly: this.httpOnly,
      path: this.cookiePath,
      sameSite: this.sameSite,
      secure: this.secure
    });
  }

  static verify (secrets, value) {
    const match = value.match(/--([^-]+)$/);
    if (match === null) return null;
    const hash = match[1];
    const realValue = value.substring(0, match.index);

    for (const secret of secrets) {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(realValue);
      if (hash === hmac.digest('hex')) return realValue;
    }

    return null;
  }

  async _getCookie (ctx, name) {
    const cookie = ctx.req.getCookie(name);
    if (cookie === null) return null;

    const secrets = this._app.deref().secrets;
    const value = Session.verify(secrets, cookie);
    if (value === null) return null;

    return await Session.decrypt(secrets, value);
  }

  _setCookie (ctx, secret, name, value, options) {
    ctx.res.setCookie(name, Session.sign(secret, value), options);
  }
}
