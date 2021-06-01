import crypto from 'crypto';
import {promisify} from 'util';

const scrypt = promisify(crypto.scrypt);

const IV = crypto.randomBytes(12);

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

  static async decrypt (secrets, encrypted) {
    const match = encrypted.match(/^([^-]+)--([^-]+)--([^-]+)$/);
    if (match === null) return null;

    const value = match[1];
    const iv = Buffer.from(match[2], 'base64');
    const authTag = Buffer.from(match[3], 'base64');

    for (const secret of secrets) {
      try {
        const key = await scrypt(secret, 'salt', 32);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = decipher.update(value, 'base64', 'utf8');
        return decrypted + decipher.final('utf8');
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  static async encrypt (secret, value) {
    const key = await scrypt(secret, 'salt', 32);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, IV);
    const encrypted = cipher.update(value, 'utf8', 'base64');
    return [encrypted + cipher.final('base64'), IV.toString('base64'), cipher.getAuthTag().toString('base64')]
      .join('--');
  }

  async load (ctx) {
    const cookie = ctx.req.getCookie(this.cookieName);
    if (cookie === null) return null;

    const secrets = this._app.deref().secrets;
    const decrypted = await Session.decrypt(secrets, cookie);
    if (decrypted === null) return null;

    const data = JSON.parse(decrypted);
    const expires = data.expires;
    delete data.expires;
    if (expires <= Math.round(Date.now() / 1000)) return null;

    return data;
  }

  async store (ctx, data) {
    if (typeof data.expires !== 'number') data.expires = Math.round(Date.now() / 1000) + this.expiration;

    const secret = this._app.deref().secrets[0];
    const encrypted = await Session.encrypt(secret, JSON.stringify(data));

    ctx.res.setCookie(this.cookieName, encrypted, {
      expires: new Date(data.expires * 1000),
      httpOnly: this.httpOnly,
      path: this.cookiePath,
      sameSite: this.sameSite,
      secure: this.secure
    });
  }
}
