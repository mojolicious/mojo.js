export default class Renderer {
  constructor () {
    this.templatePaths = [];
  }

  render (ctx) {
    if (ctx.stash.json !== undefined) {
      return {output: Buffer.from(JSON.stringify(ctx.stash.json)), format: 'json'};
    }
    if (ctx.stash.text !== undefined) return {output: Buffer.from(ctx.stash.text), format: 'txt'};
    return null;
  }
}
