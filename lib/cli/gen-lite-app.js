import File from '../file.js';

export default async function genLiteAppCommand (app, args) {
  const name = args[1] ?? 'index.js';

  const file = new File(process.cwd(), name);
  if (await file.exists()) {
    process.stdout.write(`[exist] ${file}\n`);
    return;
  }

  process.stdout.write(`[write] ${file}\n`);
  await file.writeFile(liteApp);
  await file.chmod(0o744);
}

genLiteAppCommand.description = 'Generate single file application';
genLiteAppCommand.usage = `Usage: APPLICATION gen-lite-app [OPTIONS] [NAME]

  node index.js gen-lite-app
  node index.js gen-lite-app myapp.js

Options:
  -h, --help   Show this summary of available options
`;

const liteApp = `#!/usr/bin/env node
import mojo from '@mojojs/mojo';

const app = mojo();

app.any('/', async ctx => {
  await ctx.render({inline: indexTemplate}, {title: 'Welcome'});
});

app.start();

const indexTemplate = \`
<!DOCTYPE html>
<html>
  <head>
    <title><%= title %></title>
  </head>
  <body>
    <h1>Welcome to the Mojolicious real-time web framework!</h1>
  </body>
</html>
\`;`;
