import type {MojoContext, RenderOptions} from './types.js';
import Path from '@mojojs/path';

interface EngineResult {
  output: string | Buffer;
  format: string;
}
interface ViewSuggestion {
  format: string;
  engine: string;
  path: string;
}
type ViewIndex = Record<string, ViewSuggestion[]>;
interface ViewEngine {
  render: (ctx: MojoContext, options: RenderOptions) => Promise<Buffer>;
}

export class Renderer {
  defaultEngine = 'ejs';
  defaultFormat = 'html';
  engines: Record<string, ViewEngine> = {};
  viewPaths: string[] = [Path.currentFile().sibling('..', 'vendor', 'views').toString()];
  _viewIndex: ViewIndex | undefined = undefined;

  addEngine(name: string, engine: ViewEngine): this {
    this.engines[name] = engine;
    return this;
  }

  findView(name: string): ViewSuggestion | null {
    if (this._viewIndex === undefined || this._viewIndex[name] === undefined) return null;
    return this._viewIndex[name][0];
  }

  async render(ctx: MojoContext, options: RenderOptions): Promise<EngineResult | null> {
    const log = ctx.log;
    if (options.text !== undefined) {
      log.trace('Rendering text response');
      return {output: options.text, format: options.format ?? 'txt'};
    }

    if (options.json !== undefined) {
      log.trace('Rendering JSON response');
      if (options.pretty === true) {
        return {output: Buffer.from(JSON.stringify(options.json, null, 2)), format: options.format ?? 'json'};
      }
      return {output: Buffer.from(JSON.stringify(options.json)), format: options.format ?? 'json'};
    }

    if (options.engine !== undefined) {
      const engine = this.engines[options.engine];
      if (engine === undefined) return null;
      log.trace(`Rendering response with "${options.engine}" engine`);
      return {output: await engine.render(ctx, options), format: options.format ?? this.defaultFormat};
    }

    if (options.inline !== undefined) {
      log.trace('Rendering inline view');
      const result = await this._renderInline(ctx, options);
      if (result === null) return null;

      if (options.inlineLayout !== undefined) {
        options.inline = options.inlineLayout;
        options.content = result.output;
        log.trace('Rendering inline layout');
        return await this._renderInline(ctx, options);
      }

      return result;
    }

    const stash = ctx.stash;
    const controller: string = stash.controller;
    const action: string = stash.action;
    if (options.view === undefined && controller !== undefined && action !== undefined) {
      options.view = `${controller}/${action}`;
    }
    if (options.view !== undefined) {
      log.trace(`Rendering view "${options.view}"`);
      const result = await this._renderView(ctx, options);
      if (result === null) return null;

      if (options.layout !== undefined) {
        options.view = `layouts/${options.layout}`;
        options.content = result.output;
        log.trace(`Rendering layout "${options.view}"`);
        return await this._renderView(ctx, options);
      }

      return result;
    }

    return null;
  }

  async warmup(): Promise<void> {
    const viewIndex: ViewIndex = (this._viewIndex = {});
    for (const dir of this.viewPaths.map(path => new Path(path))) {
      if (!(await dir.exists())) continue;

      for await (const file of dir.list({recursive: true})) {
        const name = dir.relative(file).toArray().join('/');

        const match = name.match(/^(.+)\.([^.]+)\.([^.]+)$/);
        if (match === null) continue;

        if (viewIndex[match[1]] === undefined) viewIndex[match[1]] = [];
        viewIndex[match[1]].push({format: match[2], engine: match[3], path: file.toString()});
      }
    }
  }

  async _renderInline(ctx: MojoContext, options: RenderOptions): Promise<EngineResult | null> {
    const engine = this.engines[options.engine ?? this.defaultEngine];
    if (engine === undefined) return null;
    return {output: await engine.render(ctx, options), format: options.format ?? this.defaultFormat};
  }

  async _renderView(ctx: MojoContext, options: RenderOptions): Promise<EngineResult | null> {
    const view = this.findView(options.view ?? '');
    if (view === null) return null;

    const engine = this.engines[view.engine];
    if (engine === undefined) return null;

    options.viewPath = view.path;
    return {output: await engine.render(ctx, options), format: view.format};
  }
}
