import type {MojoContext, MojoRenderOptions} from './types.js';
import {promisify} from 'node:util';
import {gzip} from 'node:zlib';
import Path from '@mojojs/path';
import yaml from 'js-yaml';

interface EngineResult {
  format: string;
  output: string | Buffer;
}
interface ViewSuggestion {
  engine: string;
  format: string;
  path: string;
  variant?: string;
}
type ViewIndex = Record<string, ViewSuggestion[]>;
interface ViewEngine {
  render: (ctx: MojoContext, options: MojoRenderOptions) => Promise<Buffer>;
}

const gzipPromise = promisify(gzip);

/**
 * Renderer class.
 */
export class Renderer {
  /**
   * Try to negotiate compression for dynamically generated response content and gzip compress it automatically.
   */
  autoCompress = true;
  /**
   * The default template engine to use for rendering in cases where auto-detection doesn't work, like for inline
   * templates, defaults to `tmpl`.
   */
  defaultEngine = 'tmpl';
  /**
   * The default format to render if format is not set, defaults to `html`. Note that changing the default away from
   * `html` is not recommended, as it has the potential to break, for example, plugins with bundled templates.
   */
  defaultFormat = 'html';
  /**
   * Template engines.
   */
  engines: Record<string, ViewEngine> = {};
  /**
   * Minimum output size in bytes required for compression to be used if enabled, defaults to `860`.
   */
  minCompressSize = 860;
  /**
   * Directories to look for templates in, first one has the highest precedence.
   */
  viewPaths: string[] = [Path.currentFile().sibling('..', 'vendor', 'views').toString()];

  _viewIndex: ViewIndex | undefined = undefined;

  /**
   * Register a template engine.
   */
  addEngine(name: string, engine: ViewEngine): this {
    this.engines[name] = engine;
    return this;
  }

  /**
   * Find a view for render parameters.
   * @example
   * // Find path to JSON view
   * const suggestion = renderer.findView({view: 'foo', 'format': 'json'});
   * const {path} = suggestion;
   */
  findView(options: MojoRenderOptions): ViewSuggestion | null {
    const {engine, format, variant, view} = options;
    const index = this._viewIndex;
    if (view === undefined || index === undefined || index[view] === undefined) return null;

    // Format and engine
    let views = index[view];
    if (format !== undefined) views = views.filter(view => view.format === format);
    if (engine !== undefined) views = views.filter(view => view.engine === engine);

    // Variants
    let fallback;
    if (views.length > 1) {
      for (const suggestion of views) {
        if (suggestion.variant === variant) return suggestion;
        if (fallback === undefined && suggestion.variant === undefined) fallback = suggestion;
      }
    }

    return fallback ?? views[0];
  }

  /**
   * Render output through one of the template engines.
   */
  async render(ctx: MojoContext, options: MojoRenderOptions): Promise<EngineResult | null> {
    const {log} = ctx;
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

    if (options.yaml !== undefined) {
      log.trace('Rendering YAML response');
      return {output: Buffer.from(yaml.dump(options.yaml)), format: options.format ?? 'yaml'};
    }

    if (options.inline !== undefined) {
      log.trace('Rendering inline view');
      const result = await this._renderInline(ctx, options);
      if (result === null) return null;

      if (options.inlineLayout !== undefined) {
        options.inline = options.inlineLayout;
        ctx.content.main = result.output.toString();
        log.trace('Rendering inline layout');
        return await this._renderInline(ctx, options);
      }

      return result;
    }

    if (options.view === undefined && options.engine !== undefined) {
      const engine = this.engines[options.engine];
      if (engine === undefined) return null;
      log.trace(`Rendering response with "${options.engine}" engine`);
      return {output: await engine.render(ctx, options), format: options.format ?? this.defaultFormat};
    }

    const {stash} = ctx;
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
        ctx.content.main = result.output.toString();
        log.trace(`Rendering layout "${options.view}"`);
        return await this._renderView(ctx, options);
      }

      return result;
    }

    return null;
  }

  /**
   * Finalize dynamically generated response content and compress it if possible.
   */
  async respond(ctx: MojoContext, result: EngineResult, options: {status?: number}): Promise<boolean> {
    const {res} = ctx;
    if (res.isSent) return false;

    let {output} = result;
    if (this.autoCompress === true && Buffer.byteLength(output) >= this.minCompressSize) {
      res.append('Vary', 'Accept-Encoding');
      const accept = ctx.req.get('accept-encoding');
      if (accept !== null && /gzip/i.test(accept)) {
        res.set('Content-Encoding', 'gzip');
        output = await gzipPromise(output);
      }
    }

    if (options.status !== undefined) res.status(options.status);
    const type = ctx.app.mime.extType(result.format);
    if (type !== null) res.type(type);
    await res.send(output);

    return true;
  }

  /**
   * Prepare views for rendering.
   */
  async warmup(): Promise<void> {
    const viewIndex: ViewIndex = (this._viewIndex = {});
    for (const dir of this.viewPaths.map(path => new Path(path))) {
      if ((await dir.exists()) === false) continue;

      for await (const file of dir.list({recursive: true})) {
        const name = dir.relative(file).toArray().join('/');

        const match = name.match(/^(.+)\.([^.]+?)(?:\+([^.]+))?\.([^.]+)$/);
        if (match === null) continue;

        if (viewIndex[match[1]] === undefined) viewIndex[match[1]] = [];
        viewIndex[match[1]].push({format: match[2], variant: match[3], engine: match[4], path: file.toString()});
      }
    }
  }

  async _renderInline(ctx: MojoContext, options: MojoRenderOptions): Promise<EngineResult | null> {
    const engine = this.engines[options.engine ?? this.defaultEngine];
    if (engine === undefined) return null;
    return {output: await engine.render(ctx, options), format: options.format ?? this.defaultFormat};
  }

  async _renderView(ctx: MojoContext, options: MojoRenderOptions): Promise<EngineResult | null> {
    const view = this.findView(options);
    if (view === null) return null;

    const engine = this.engines[view.engine];
    if (engine === undefined) return null;

    options.viewPath = view.path;
    return {output: await engine.render(ctx, options), format: view.format};
  }
}
