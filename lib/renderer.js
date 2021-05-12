import File from './file.js';
import LRU from 'lru-cache';

export default class Renderer {
  constructor () {
    this.cache = new LRU(100);
    this.defaultEngine = 'ejs';
    this.defaultFormat = 'html';
    this.engines = {};
    this.viewPaths = [File.currentFile().sibling('..', 'vendor', 'views').toString()];
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

  async render (ctx, options) {
    if (options.text !== undefined) return {output: options.text, format: 'txt'};
    if (options.json !== undefined) return {output: Buffer.from(JSON.stringify(options.json)), format: 'json'};

    if (options.engine !== undefined) {
      const engine = this.engines[options.engine];
      if (engine === undefined) return null;
      return {output: await engine(ctx, options), format: options.format ?? this.defaultFormat};
    }

    if (options.view !== undefined) {
      const view = this.findView(options.view);
      if (view === null) return null;
      const engine = this.engines[view.engine];
      if (engine === undefined) return null;

      return {output: await engine(ctx, {...options, viewPath: view.path}), format: view.format};
    }

    if (options.inline !== undefined) {
      const engine = this.engines[options.engine ?? this.defaultEngine];
      if (engine === undefined) return null;
      return {output: await engine(ctx, options), format: options.format ?? this.defaultFormat};
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
