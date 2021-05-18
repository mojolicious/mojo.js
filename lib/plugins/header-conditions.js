export default function headerConditionsPlugin (app) {
  app.router.addCondition('headers', headerCondition);
  app.router.addCondition('host', hostCondition);
}

function headerCondition (ctx, requirement) {
  for (const name of Object.keys(requirement)) {
    const value = ctx.req.get(name);
    if (typeof value !== 'string') return false;
    if (requirement[name].test(value) !== true) return false;
  }

  return true;
}

function hostCondition (ctx, requirement) {
  return headerCondition(ctx, {Host: requirement});
}
