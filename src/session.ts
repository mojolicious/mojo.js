import type App from './app.js';
import type Context from './context.js';
import type {MojoStash} from './types.js';
import crypto from 'crypto';
import {promisify} from 'util';

const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

export default class Session {
  cookieName = 'mojo';
  cookiePath = '/';
  expiration = 3600;
  httpOnly = true;
  sameSite: 'lax' | 'strict' | 'none' = 'lax';
  secure = false;
  _app: WeakRef<App>;

  constructor (app: App) {
    this._app = new WeakRef(app);
  }

  static async decrypt (secrets: string[], encrypted: string): Promise<string | null> {
    const match = encrypted.match(/^([^-]+)--([^-]+)--([^-]+)$/);
    if (match === null) return null;

    const value = match[1];
    const iv = Buffer.from(match[2], 'base64');
    const authTag = Buffer.from(match[3], 'base64');

    for (const secret of secrets) {
      try {
        const key = await scrypt(secret, 'salt', 32);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key as crypto.CipherKey, iv);
        decipher.setAuthTag(authTag);
        const decrypted = decipher.update(value, 'base64', 'utf8');
        return decrypted + decipher.final('utf8');
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  static async encrypt (secret: string, value: string): Promise<string> {
    const key = await scrypt(secret, 'salt', 32);
    const iv = await randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key as crypto.CipherKey, iv);
    const encrypted = cipher.update(value, 'utf8', 'base64') + cipher.final('base64');
    return encrypted + '--' + iv.toString('base64') + '--' + cipher.getAuthTag().toString('base64');
  }

  async load (ctx: Context): Promise<MojoStash | null> {
    const cookie = ctx.req.getCookie(this.cookieName);
    if (cookie === null) return null;

    const app = this._app.deref();
    if (app === undefined) return null;
    const decrypted = await Session.decrypt(app.secrets, cookie);
    if (decrypted === null) return null;

    const data = JSON.parse(decrypted);
    const expires = data.expires;
    delete data.expires;
    if (expires <= Math.round(Date.now() / 1000)) return null;

    return data;
  }

  async store (ctx: Context, data: MojoStash): Promise<void> {
    if (typeof data.expires !== 'number') data.expires = Math.round(Date.now() / 1000) + this.expiration;

    const app = this._app.deref();
    if (app === undefined) return;
    const encrypted = await Session.encrypt(app.secrets[0], JSON.stringify(data));

    ctx.res.setCookie(this.cookieName, encrypted, {
      expires: new Date(data.expires * 1000),
      httpOnly: this.httpOnly,
      path: this.cookiePath,
      sameSite: this.sameSite,
      secure: this.secure
    });
  }
}
