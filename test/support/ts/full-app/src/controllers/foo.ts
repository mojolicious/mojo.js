import type {MojoContext} from '../../../../../../lib/core.js';

interface EchoData {
  foo: string;
  bar: number;
}

export default class FooController {
  async hello(ctx: MojoContext): Promise<void> {
    const what: string = await ctx.testHelper('controller');
    ctx.stash.what = what;
    await ctx.render();
  }

  async formEcho(ctx: MojoContext): Promise<void> {
    const form = await ctx.req.form();
    const {foo, bar} = form.toObject<EchoData>();
    await ctx.render({json: {foo, bar}});
  }

  async jsonEcho(ctx: MojoContext): Promise<void> {
    const {foo, bar} = await ctx.req.json<EchoData>();
    await ctx.render({json: {foo, bar}});
  }
}
