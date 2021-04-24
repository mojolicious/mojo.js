'use strict';

import Context from '../context.js';
import ServerResponse from '../server/response.js';

export default class HTTPContext extends Context {
  constructor (app, req, res) {
    super(app, req);
    this.res = new ServerResponse(res);
  }

  render (values) {
    Object.assign(this.stash, values);
    const result = this.app.renderer.render(this);
    if (result === null) throw new Error('Nothing could be rendered!');
    this.res.raw.writeHead(200, {'Content-Type': 'text/plain'});
    this.res.raw.end(result.output);
  }
}
