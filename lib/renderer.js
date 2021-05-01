import LRU from 'lru-cache';
import File from './file.js';

export default class Renderer {
  constructor () {
    this.cache = new LRU(100);
    this.defaultEngine = 'ejs';
    this.defaultFormat = 'html';
    this.engines = {};
    this.templatePaths = [];
    this._templateIndex = undefined;
  }

  addEngine (name, engine) {
    this.engines[name] = engine;
    return this;
  }

  findTemplate (name) {
    if (this._templateIndex[name] === undefined) return null;
    return this._templateIndex[name][0];
  }

  async render (ctx) {
    if (ctx.stash.json !== undefined) return {output: Buffer.from(JSON.stringify(ctx.stash.json)), format: 'json'};
    if (ctx.stash.text !== undefined) return {output: Buffer.from(ctx.stash.text), format: 'txt'};

    if (ctx.stash.template !== undefined) {
      const template = this.findTemplate(ctx.stash.template);
      if (template === null) return null;
      const engine = this.engines[template.engine];
      if (engine === undefined) return null;

      return {output: await engine(ctx, {templatePath: template.path}), format: template.format};
    }

    if (ctx.stash.inline !== undefined) {
      const engine = this.engines[ctx.stash.engine ?? this.defaultEngine];
      if (engine === undefined) return null;
      return {output: await engine(ctx, {inline: ctx.stash.inline}), format: ctx.stash.format ?? this.defaultFormat};
    }

    return null;
  }

  async warmup () {
    this._templateIndex = {};
    for (const dir of this.templatePaths.map(path => new File(path))) {
      if (!(await dir.exists())) continue;

      for await (const file of dir.list({recursive: true})) {
        const name = dir.relative(file).toArray().join('/');

        const match = name.match(/^(.+)\.([^.]+)\.([^.]+)$/);
        if (match === null) continue;

        if (this._templateIndex[match[1]] === undefined) this._templateIndex[match[1]] = [];
        this._templateIndex[match[1]].push({format: match[2], engine: match[3], path: file.toString()});
      }
    }
  }
}
