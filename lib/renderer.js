export default class Renderer {
  render (ctx) {
    if (ctx.stash.json !== undefined) {
      return {output: Buffer.from(JSON.stringify(ctx.stash.json), 'utf8'), format: 'json'};
    }
    if (ctx.stash.text !== undefined) return {output: Buffer.from(ctx.stash.text, 'utf8'), format: 'txt'};
    return null;
  }
}
