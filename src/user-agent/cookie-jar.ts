import type {URL} from 'url';
import {format} from 'url';
import tough from 'tough-cookie';

/**
 * Cookie jar class.
 */
export class CookieJar {
  /**
   * Cookie storage.
   */
  storage = new tough.CookieJar();

  /**
   * Load cookies from storage.
   */
  async loadCookies(url: URL): Promise<string | null> {
    const cookies = await this.storage.getCookies(this._cookieURL(url));
    if (cookies.length > 0) return cookies.map(cookie => cookie.cookieString()).join('; ');
    return null;
  }

  /**
   * Store cookies.
   */
  async storeCookies(url: URL, header?: string[]): Promise<void> {
    if (header === undefined) return;

    const cookieURL = this._cookieURL(url);
    for (const cookie of header.map(value => tough.Cookie.parse(value ?? ''))) {
      if (cookie === undefined) continue;
      await this.storage.setCookie(cookie, cookieURL);
    }
  }

  _cookieURL(currentURL: URL): string {
    return format(currentURL, {auth: false, fragment: false, search: false});
  }
}
