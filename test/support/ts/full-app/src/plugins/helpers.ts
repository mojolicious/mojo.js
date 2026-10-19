import type {MojoApp, MojoContext} from '../../../../../../src/types.ts';

export default function helpersPlugin(app: MojoApp): void {
  app.addHelper('testHelper', testHelper);
}

async function testHelper(ctx: MojoContext, partial: string): Promise<string> {
  const language: string = ctx.models.bar.language();
  return `${language} ${partial}`;
}
