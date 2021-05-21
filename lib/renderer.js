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
    if (options.text !== undefined) {
      ctx.log.trace('Rendering text response');
      return {output: options.text, format: options.format ?? 'txt'};
    }

    if (options.json !== undefined) {
      ctx.log.trace('Rendering JSON response');
      if (options.pretty === true) {
        return {output: Buffer.from(JSON.stringify(options.json, null, 2)), format: options.format ?? 'json'};
      }
      return {output: Buffer.from(JSON.stringify(options.json)), format: options.format ?? 'json'};
    }

    if (options.engine !== undefined) {
      const engine = this.engines[options.engine];
      if (engine === undefined) return null;
      ctx.log.trace(`Rendering response with "${options.engine}" engine`);
      return {output: await engine(ctx, options), format: options.format ?? this.defaultFormat};
    }

    if (options.inline !== undefined) {
      ctx.log.trace('Rendering inline view');
      const result = await this._renderInline(ctx, options);
      if (result === null) return null;

      if (options.inlineLayout !== undefined) {
        options.inline = options.inlineLayout;
        options.content = result.output;
        ctx.log.trace('Rendering inline layout');
        return await this._renderInline(ctx, options);
      }

      return result;
    }

    if (options.view === undefined && ctx.stash.controller !== undefined && ctx.stash.action !== undefined) {
      options.view = `${ctx.stash.controller}/${ctx.stash.action}`;
    }
    if (options.view !== undefined) {
      ctx.log.trace(`Rendering view "${options.view}"`);
      const result = await this._renderView(ctx, options);
      if (result === null) return null;

      if (options.layout !== undefined) {
        options.view = `layouts/${options.layout}`;
        options.content = result.output;
        ctx.log.trace(`Rendering layout "${options.view}"`);
        return await this._renderView(ctx, options);
      }

      return result;
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

  async _renderInline (ctx, options) {
    const engine = this.engines[options.engine ?? this.defaultEngine];
    if (engine === undefined) return null;
    return {output: await engine(ctx, options), format: options.format ?? this.defaultFormat};
  }

  async _renderView (ctx, options) {
    const view = this.findView(options.view);
    if (view === null) return null;

    const engine = this.engines[view.engine];
    if (engine === undefined) return null;

    options.viewPath = view.path;
    return {output: await engine(ctx, options), format: view.format};
  }
}
