export class Controller {
  hello (ctx) {
    ctx.render({text: ctx.stash.msg});
  }

  async jsonReturn (ctx) {
    const data = await ctx.req.json();
    ctx.render({json: data});
  }
}
