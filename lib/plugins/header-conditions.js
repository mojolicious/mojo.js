export default function headerConditionsPlugin (app) {
  const router = app.router;
  router.addCondition('headers', headerCondition);
  router.addCondition('host', hostCondition);
}

function headerCondition (ctx, requirement) {
  for (const [name, regex] of Object.entries(requirement)) {
    const value = ctx.req.get(name);
    if (typeof value !== 'string') return false;
    if (regex.test(value) !== true) return false;
  }

  return true;
}

function hostCondition (ctx, requirement) {
  return headerCondition(ctx, {Host: requirement});
}
