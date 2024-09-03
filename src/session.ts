import type {App} from './app.js';
import type {Context} from './context.js';
import type {SessionData} from './types.js';
import crypto from 'node:crypto';
import {promisify} from 'node:util';

const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

/**
 * Session manager class.
 */
export class Session {
  /**
   * Name for session cookies, defaults to `mojo`.
   */
  cookieName = 'mojo';
  /**
   * Path for session cookies, defaults to `/`.
   */
  cookiePath = '/';
  /**
   * Default time for sessions to expire in seconds from now, defaults to `3600`. The expiration timeout gets refreshed
   * for every request. Setting the value to `0` will allow sessions to persist until the browser window is closed,
   * this can have security implications though.
   */
  expiration = 3600;
  /**
   * Set the `HttpOnly` value on all session cookies.
   */
  httpOnly = true;
  /**
   * Set the `SameSite` value on all session cookies, defaults to `lax`.
   */
  sameSite: 'lax' | 'strict' | 'none' = 'lax';
  /**
   * Set the secure flag on all session cookies, so that browsers send them only over HTTPS connections.
   */
  secure = false;

  _app: WeakRef<App>;

  constructor(app: App) {
    this._app = new WeakRef(app);
  }

  /**
   * Decrypt cookie.
   */
  static async decrypt(secrets: string[], encrypted: string): Promise<string | null> {
    const match = encrypted.match(/^([^-]+)--([^-]+)--([^-]+)$/);
    if (match === null) return null;

    const value = match[1];
    const iv = Buffer.from(match[2], 'base64');
    const authTag = Buffer.from(match[3], 'base64');

    for (const secret of secrets) {
      try {
        const key = await scrypt(secret, 'salt', 32);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key as crypto.CipherKey, iv, {authTagLength: 16});
        decipher.setAuthTag(authTag);
        const decrypted = decipher.update(value, 'base64', 'utf8');
        return decrypted + decipher.final('utf8');
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Encrypt cookie.
   */
  static async encrypt(secret: string, value: string): Promise<string> {
    const key = await scrypt(secret, 'salt', 32);
    const iv = await randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key as crypto.CipherKey, iv);
    const encrypted = cipher.update(value, 'utf8', 'base64') + cipher.final('base64');
    return encrypted + '--' + iv.toString('base64') + '--' + cipher.getAuthTag().toString('base64');
  }

  /**
   * Load session data from encrypted cookie.
   */
  async load(ctx: Context): Promise<SessionData | null> {
    const cookie = ctx.req.getCookie(this.cookieName);
    if (cookie === null) return null;

    const app = this._app.deref();
    if (app === undefined) return null;
    const decrypted = await Session.decrypt(app.secrets, cookie);
    if (decrypted === null) return null;

    const data = JSON.parse(decrypted);
    const {expires} = data;
    delete data.expires;
    if (expires <= Math.round(Date.now() / 1000)) return null;

    if (data.nextFlash !== undefined) {
      data.flash = data.nextFlash;
      delete data.nextFlash;
    }

    return data;
  }

  /**
   * Store session data in encrypted cookie.
   */
  async store(ctx: Context, data: SessionData): Promise<void> {
    if (typeof data.expires !== 'number') {
      const expiration = data.expiration ?? this.expiration;
      if (expiration > 0) data.expires = Math.round(Date.now() / 1000) + expiration;
    }

    const app = this._app.deref();
    if (app === undefined) return;

    delete data.flash;
    const encrypted = await Session.encrypt(app.secrets[0], JSON.stringify(data));

    const {expires} = data;
    ctx.res.setCookie(this.cookieName, encrypted, {
      expires: expires === undefined ? undefined : new Date(expires * 1000),
      httpOnly: this.httpOnly,
      path: this.cookiePath,
      sameSite: this.sameSite,
      secure: this.secure
    });
  }
}
