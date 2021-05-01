import LRU from 'lru-cache';
import File from './file.js';

export default class Renderer {
  constructor () {
    this.cache = new LRU(100);
    this.defaultEngine = 'ejs';
    this.defaultFormat = 'html';
    this.engines = {};
    this.viewPaths = [];
    this._viewIndex = undefined;
  }

  addEngine (name, engine) {
    this.engines[name] = engine;
    return this;
  }

  findView (name) {
    if (this._viewIndex[name] === undefined) return null;
    return this._viewIndex[name][0];
  }

  async render (ctx) {
    if (ctx.stash.json !== undefined) return {output: Buffer.from(JSON.stringify(ctx.stash.json)), format: 'json'};
    if (ctx.stash.text !== undefined) return {output: Buffer.from(ctx.stash.text), format: 'txt'};

    if (ctx.stash.view !== undefined) {
      const view = this.findView(ctx.stash.view);
      if (view === null) return null;
      const engine = this.engines[view.engine];
      if (engine === undefined) return null;

      return {output: await engine(ctx, {viewPath: view.path}), format: view.format};
    }

    if (ctx.stash.inline !== undefined) {
      const engine = this.engines[ctx.stash.engine ?? this.defaultEngine];
      if (engine === undefined) return null;
      return {output: await engine(ctx, {inline: ctx.stash.inline}), format: ctx.stash.format ?? this.defaultFormat};
    }

    return null;
  }

  async warmup () {
    this._viewIndex = {};
    for (const dir of this.viewPaths.map(path => new File(path))) {
      if (!(await dir.exists())) continue;

      for await (const file of dir.list({recursive: true})) {
        const name = dir.relative(file).toArray().join('/');

        const match = name.match(/^(.+)\.([^.]+)\.([^.]+)$/);
        if (match === null) continue;

        if (this._viewIndex[match[1]] === undefined) this._viewIndex[match[1]] = [];
        this._viewIndex[match[1]].push({format: match[2], engine: match[3], path: file.toString()});
      }
    }
  }
}
