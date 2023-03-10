import type {App} from '../app.js';
import type {MojoContext} from '../types.js';

/**
 * Default condition plugin.
 */
export default function defaultConditionsPlugin(app: App): void {
  const {router} = app;
  router.addCondition('headers', headerCondition);
  router.addCondition('host', hostCondition);
}

async function headerCondition(ctx: MojoContext, requirement: Record<string, RegExp>): Promise<boolean> {
  for (const [name, regex] of Object.entries(requirement)) {
    const value = ctx.req.get(name);
    if (typeof value !== 'string') return false;
    if (regex.test(value) === false) return false;
  }

  return true;
}

async function hostCondition(ctx: MojoContext, requirement: RegExp): Promise<boolean> {
  return headerCondition(ctx, {Host: requirement});
}
