export class Controller {
  async jsonReturn (ctx) {
    const data = await ctx.req.json();
    ctx.render({json: data});
  }
}
