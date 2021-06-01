import crypto from 'crypto';
import {promisify} from 'util';

const scrypt = promisify(crypto.scrypt);

const ALGORITHM = 'aes-256-cbc';
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

  async load (ctx) {
    const cookie = await this._getCookie(ctx, this.cookieName);
    if (cookie === null) return null;

    const data = JSON.parse(cookie);
    const expires = data.expires;
    delete data.expires;
    if (expires <= Math.round(Date.now() / 1000)) return null;

    return data;
  }

  async store (ctx, data) {
    if (typeof data.expires !== 'number') data.expires = Math.round(Date.now() / 1000) + this.expiration;

    await this._setCookie(ctx, this.cookieName, JSON.stringify(data), {
      expires: new Date(data.expires * 1000),
      httpOnly: this.httpOnly,
      path: this.cookiePath,
      sameSite: this.sameSite,
      secure: this.secure
    });
  }

  async _decrypt (secret, iv, value) {
    const key = await scrypt(secret, 'salt', 32);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = decipher.update(value, 'base64', 'utf8');
    return decrypted + decipher.final('utf8');
  }

  async _encrypt (secret, value) {
    const key = await scrypt(secret, 'salt', 32);

    const cipher = crypto.createCipheriv(ALGORITHM, key, IV);
    const encrypted = cipher.update(value, 'utf8', 'base64');
    return encrypted + cipher.final('base64') + '--' + IV.toString('base64');
  }

  async _getCookie (ctx, name) {
    const cookie = ctx.req.getCookie(name);
    if (cookie === null || cookie.includes('--') === false) return null;

    const [value, ivEncoded] = cookie.split('--');
    const iv = Buffer.from(ivEncoded, 'base64');

    for (const secret of this._app.deref().secrets) {
      try {
        return await this._decrypt(secret, iv, value);
      } catch (error) {
        if (error.code !== 'ERR_OSSL_EVP_BAD_DECRYPT' && error.code !== 'ERR_CRYPTO_INVALID_IV') throw error;
      }
    }

    return null;
  }

  async _setCookie (ctx, name, value, options) {
    const encrypted = await this._encrypt(this._app.deref().secrets[0], value);
    ctx.res.setCookie(name, encrypted, options);
  }
}
