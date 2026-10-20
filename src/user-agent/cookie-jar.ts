import {format, type URL} from 'node:url';
import {Cookie, CookieJar as ToughCookieJar} from 'tough-cookie';

/**
 * Cookie jar class.
 */
export class CookieJar {
  /**
   * Cookie storage.
   */
  storage = new ToughCookieJar();

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
  async storeCookies(url: URL, headers: string[]): Promise<void> {
    const cookieURL = this._cookieURL(url);
    for (const cookie of headers.map(value => Cookie.parse(value))) {
      if (cookie !== undefined) await this.storage.setCookie(cookie, cookieURL);
    }
  }

  _cookieURL(currentURL: URL): string {
    return format(currentURL, {auth: false, fragment: false, search: false});
  }
}
