'use strict';

class Renderer {
  render (ctx) {
    if (ctx.stash.json !== undefined) return {output: JSON.stringify(ctx.stash.json), format: 'json'};
    if (ctx.stash.text !== undefined) return {output: ctx.stash.text, format: 'txt'};
    return null;
  }
}

module.exports = Renderer;
