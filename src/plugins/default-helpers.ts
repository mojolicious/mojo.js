import type {MojoApp, MojoContext} from '../types.js';
import type {InspectOptions} from 'util';
import {inspect} from 'util';

/**
 * Default helper plugin.
 */
export default function defaultHelpersPlugin(app: MojoApp): void {
  app.addHelper('currentRoute', currentRoute);
  app.decorateContext('inspect', (object: Record<string, any>, options: InspectOptions) => inspect(object, options));
}

function currentRoute(ctx: MojoContext): string | null {
  const plan = ctx.plan;
  if (plan === null) return null;
  const endpoint = plan.endpoint;
  if (endpoint === undefined) return null;
  return endpoint.customName ?? endpoint.defaultName ?? null;
}
