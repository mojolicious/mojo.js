export default class AuthController {
  async login(ctx) {
    const session = await ctx.session();
    session.user = ctx.stash.name;
    return ctx.render({text: `Login: ${ctx.stash.name}`});
  }

  async logout(ctx) {
    const session = await ctx.session();
    session.expires = 1;
    return ctx.render({text: `Logout: ${session.user}`});
  }
}
