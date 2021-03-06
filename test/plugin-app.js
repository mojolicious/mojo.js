import mojo from '../lib/core.js';
import t from 'tap';

t.test('Plugin app', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.plugin(mixedPlugin);

  app.get('/tag_helpers', ctx => ctx.render({inline: tagHelperPlugin}));
  app.get('/form_helpers', ctx => ctx.render({inline: formTagHelpers}));

  app.get('/helper', ctx => ctx.render({text: ctx.testHelper('test')}));

  app.get('/getter/setter', ctx => {
    const before = ctx.testProp;
    ctx.testProp = 'also works';
    const after = ctx.testProp;
    ctx.render({text: `before: ${before}, after: ${after}`});
  });

  app.get('/method', ctx => ctx.render({text: ctx.testMethod('test')}));

  app.post('/form/:name').name('form');
  app.patch('/special/form').name('special');

  app
    .websocket('/websocket/mixed')
    .to(ctx => {
      ctx.on('connection', ws => {
        const before = ctx.testProp;
        ctx.testProp = 'works too';
        const after = ctx.testProp;
        const also = ctx.testHelper('test');
        ws.send(`before: ${before}, after: ${after}, also: ${also}`);
        ws.close();
      });
    })
    .name('mix');

  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Tag helpers', async () => {
    const baseURL = ua.server.urls[0].toString();
    const publicPath = app.static.prefix.substring(1) + '/';
    (await ua.getOk('/tag_helpers')).statusIs(200).bodyIs(tagHelperPluginResult(baseURL, publicPath));

    (await ua.getOk('/form_helpers', {form: {}})).statusIs(200).bodyIs(formTagHelpersResult);
    const form = {
      one: 'One',
      two: 'Two',
      three: 'Three',
      four: 'Four',
      five: 'Five',
      six: 'Six',
      seven: 'Sev&en',
      eight: 'Eight&',
      nine: 'Nine&',
      ten: 'Ten',
      eleven: 'on',
      twelve: 'on'
    };
    (await ua.getOk('/form_helpers', {form})).statusIs(200).bodyIs(formTagHelpersFilledResult);
  });

  await t.test('Helper', async () => {
    (await ua.getOk('/helper')).statusIs(200).bodyIs('works');
  });

  await t.test('Decorate with getter and setter', async () => {
    (await ua.getOk('/getter/setter')).statusIs(200).bodyIs('before: works, after: also works');
  });

  await t.test('Decorate with method', async () => {
    (await ua.getOk('/method')).statusIs(200).bodyIs('also works');
  });

  await t.test('WebSocket', async t => {
    await ua.websocketOk('/websocket/mixed');
    t.equal(await ua.messageOk(), 'before: also works, after: works too, also: works too');
    await ua.closedOk(1005);
  });

  await ua.stop();
});

const formTagHelpers = `
Input1: <%= await ctx.inputTag('one') %>
Input2: <%= await ctx.inputTag('two', {class: 'bar'}) %>
Input3: <%= await ctx.inputTag('three', {class: 'bar', value: 'Default'}) %>
Text1: <%= await ctx.textFieldTag('four') %>
Text2: <%= await ctx.textFieldTag('five', {class: 'bar'}) %>
Text3: <%= await ctx.textFieldTag('six', {class: 'bar', value: 'Default'}) %>
Area1: <%= await ctx.textAreaTag('seven') %>
Area2: <%= await ctx.textAreaTag('eight', {class: 'bar'}) %>
Area3: <%= await ctx.textAreaTag('nine', {class: 'bar'}, 'Default&') %>
Check1: <%= await ctx.checkBoxTag('ten', {value: 'Ten'}) %>
Check2: <%= await ctx.checkBoxTag('eleven', {class: 'bar'}) %>
Check3: <%= await ctx.checkBoxTag('twelve') %>
Radio1: <%= await ctx.radioButtonTag('ten', {value: 'Ten'}) %>
Radio2: <%= await ctx.radioButtonTag('eleven', {class: 'bar'}) %>
Radio3: <%= await ctx.radioButtonTag('twelve') %>
`;

const formTagHelpersResult = `
Input1: <input name="one">
Input2: <input class="bar" name="two">
Input3: <input class="bar" value="Default" name="three">
Text1: <input type="text" name="four">
Text2: <input class="bar" type="text" name="five">
Text3: <input class="bar" value="Default" type="text" name="six">
Area1: <textarea name="seven"></textarea>
Area2: <textarea class="bar" name="eight"></textarea>
Area3: <textarea class="bar" name="nine">Default&amp;</textarea>
Check1: <input value="Ten" type="checkbox" name="ten">
Check2: <input class="bar" type="checkbox" name="eleven">
Check3: <input type="checkbox" name="twelve">
Radio1: <input value="Ten" type="radio" name="ten">
Radio2: <input class="bar" type="radio" name="eleven">
Radio3: <input type="radio" name="twelve">
`;

const formTagHelpersFilledResult = `
Input1: <input name="one" value="One">
Input2: <input class="bar" name="two" value="Two">
Input3: <input class="bar" value="Three" name="three">
Text1: <input type="text" name="four" value="Four">
Text2: <input class="bar" type="text" name="five" value="Five">
Text3: <input class="bar" value="Six" type="text" name="six">
Area1: <textarea name="seven">Sev&amp;en</textarea>
Area2: <textarea class="bar" name="eight">Eight&amp;</textarea>
Area3: <textarea class="bar" name="nine">Nine&amp;</textarea>
Check1: <input value="Ten" type="checkbox" name="ten" checked>
Check2: <input class="bar" type="checkbox" name="eleven" checked>
Check3: <input type="checkbox" name="twelve" checked>
Radio1: <input value="Ten" type="radio" name="ten" checked>
Radio2: <input class="bar" type="radio" name="eleven" checked>
Radio3: <input type="radio" name="twelve" checked>
`;

const tagHelperPlugin = `
<{formBlock}>
  Form
<{/formBlock}>
Route: <%= ctx.currentRoute() %>
Favicon: <%= ctx.faviconTag() %>
Favicon2: <%= ctx.faviconTag('/favicon.ico') %>
Relative image1: <%= ctx.imageTag('/foo/bar.png') %>
Relative image2: <%= ctx.imageTag('/foo/bar.png', {alt: 'Bar'}) %>
Relative script: <%= ctx.scriptTag('/foo/bar.js') %>
Relative style: <%= ctx.styleTag('/foo/bar.css') %>
Absolute image: <%= ctx.imageTag('https://mojojs.org/static/foo/bar.png') %>
Absolute script: <%= ctx.scriptTag('https://mojojs.org/static/foo/bar.js') %>
Absolute style: <%= ctx.styleTag('https://mojojs.org/static/foo/bar.css') %>
Link1: <%= ctx.linkTo('getter_setter', {class: 'foo'}, 'Getter & Setter') %>
Link2: <%= ctx.linkTo('mix', {}, 'WebSocket link') %>
Link3: <%= ctx.linkTo(['form', {values: {name: 'yada'}}], {id: 'baz'}, 'Placeholder') %>
Tag1: <%= ctx.tag('div', 'Hello Mojo!') %>
Tag2: <%== ctx.tag('div', {class: 'test'}, 'Hello Mojo!') %>
Form1: <%= ctx.formFor('tag_helpers', {}, await formBlock()) %>
Form2: <%= ctx.formFor(['form', {values: {name: 'foo'}}], {class: 'test'}, 'Form') %>
Form3: <%= ctx.formFor('special', {}, 'Form') %>
Submit1: <%= ctx.submitButtonTag() %>
Submit2: <%= ctx.submitButtonTag('Search') %>
Submit3: <%= ctx.submitButtonTag('Search', {class: 'foo'}) %>
Button1: <%= ctx.buttonTo('special', {class: 'foo'}, 'Test') %>
Button2: <%= ctx.buttonTo(['form', {values: {name: 'bar'}}], {}, 'Test2') %>
`;

function tagHelperPluginResult(baseURL, publicPath) {
  const wsURL = baseURL.replace('http', 'ws');
  return `
Route: tag_helpers
Favicon: <link rel="icon" href="/${publicPath}mojo/favicon.ico">
Favicon2: <link rel="icon" href="/${publicPath}favicon.ico">
Relative image1: <img src="/${publicPath}foo/bar.png">
Relative image2: <img src="/${publicPath}foo/bar.png" alt="Bar">
Relative script: <script src="/${publicPath}foo/bar.js"></script>
Relative style: <link rel="stylesheet" href="/${publicPath}foo/bar.css">
Absolute image: <img src="https://mojojs.org/static/foo/bar.png">
Absolute script: <script src="https://mojojs.org/static/foo/bar.js"></script>
Absolute style: <link rel="stylesheet" href="https://mojojs.org/static/foo/bar.css">
Link1: <a href="/getter/setter" class="foo">Getter &amp; Setter</a>
Link2: <a href="${wsURL}websocket/mixed">WebSocket link</a>
Link3: <a href="/form/yada" id="baz">Placeholder</a>
Tag1: <div>Hello Mojo!</div>
Tag2: <div class="test">Hello Mojo!</div>
Form1: <form action="/tag_helpers">  Form
</form>
Form2: <form class="test" method="POST" action="/form/foo">Form</form>
Form3: <form method="POST" action="/special/form?_method=PATCH">Form</form>
Submit1: <input value="Ok" type="submit">
Submit2: <input value="Search" type="submit">
Submit3: <input value="Search" class="foo" type="submit">
Button1: <form class="foo" method="POST" action="/special/form?_method=PATCH"><input value="Test" type="submit"></form>
Button2: <form method="POST" action="/form/bar"><input value="Test2" type="submit"></form>
`;
}

function mixedPlugin(app) {
  app.config.test = 'works';

  app.addHelper('testHelper', (ctx, name) => ctx.config[name]);

  app.decorateContext('testMethod', function (name) {
    return this.config[name];
  });

  app.decorateContext('testProp', {
    get: function () {
      return this.config.test;
    },
    set: function (value) {
      this.config.test = value;
    }
  });
}
