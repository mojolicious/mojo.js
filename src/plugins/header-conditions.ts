import type {App} from '../app.js';
import type {MojoContext} from '../types.js';

export default function headerConditionsPlugin (app: App): void {
  const router = app.router;
  router.addCondition('headers', headerCondition);
  router.addCondition('host', hostCondition);
}

function headerCondition (ctx: MojoContext, requirement: Record<string, RegExp>): boolean {
  for (const [name, regex] of Object.entries(requirement)) {
    const value = ctx.req.get(name);
    if (typeof value !== 'string') return false;
    if (!regex.test(value)) return false;
  }

  return true;
}

function hostCondition (ctx: MojoContext, requirement: RegExp): boolean {
  return headerCondition(ctx, {Host: requirement});
}
