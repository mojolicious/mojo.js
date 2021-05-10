import mojo from '../index.js';
import t from 'tap';

t.test('Plugin app', async t => {
  const app = mojo();

  app.get('/tag_helpers', ctx => ctx.render({inline: tagHelperPlugin}));

  const client = await app.newTestClient({tap: t});

  await t.test('Tag helpers', async t => {
    const baseURL = client.server.urls[0] + app.static.prefix.substring(1);
    (await client.getOk('/tag_helpers')).statusIs(200).bodyIs(tagHelperPluginResult(baseURL));
  });

  await client.stop();
});

const tagHelperPlugin = `
Favicon: <%- ctx.mojoFaviconTag() %>
Relative script: <%- ctx.scriptTag('/foo/bar.js') %>
Relative style: <%- ctx.styleTag('/foo/bar.css') %>
Absolute script: <%- ctx.scriptTag('https://mojojs.org/public/foo/bar.js') %>
Absolute style: <%- ctx.styleTag('https://mojojs.org/public/foo/bar.css') %>
`;

function tagHelperPluginResult (baseURL) {
  return `
Favicon: <link rel="icon" href="${baseURL}mojo/favicon.ico"></link>
Relative script: <script src="${baseURL}foo/bar.js"></script>
Relative style: <link rel="stylesheet" href="${baseURL}foo/bar.css">
Absolute script: <script src="https://mojojs.org/public/foo/bar.js"></script>
Absolute style: <link rel="stylesheet" href="https://mojojs.org/public/foo/bar.css">
`;
}
