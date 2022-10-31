import mojo from '../lib/core.js';
import Path from '@mojojs/path';
import t from 'tap';

t.test('Plugin app', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.static.publicPaths.push(Path.currentFile().sibling('support', 'js', 'static-app', 'public').toString());

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
      twelve: 'on',
      thirteen: 'Thirteen',
      fourteen: 'Fourteen',
      fifteen: 'Fifteen',
      sixteen: 'Sixteen',
      seventeen: 'Seventeen',
      eightteen: 'Eightteen',
      nineteen: 'Nineteen',
      twenty: 'Twenty',
      twentyone: 'Twentyone',
      twentytwo: 'Twentytwo',
      twentythree: 'Twentythree',
      twentyfour: 'Twentyfour',
      twentyfive: 'Twentyfive',
      twentysix: 'Twentysix',
      twentyseven: 'Twentyseven',
      twentyeight: 'Twentyeight',
      twentynine: 'Twentynine',
      thirty: 'Thirty',
      thirtyone: 'Thirtyone',
      thirtytwo: 'Thirtytwo',
      thirtythree: 'Thirtythree',
      thirtyfour: 'Thirtyfour',
      thirtyfive: 'Thirtyfive',
      thirtysix: 'Thirtysix',
      thirtyseven: 'Thirtyseven',
      thirtyeight: 'Thirtyeight',
      thirtynine: 'Thirtynine',
      forty: 'Forty',
      fortyone: 'Fortyone',
      fortytwo: 'Fortytwo',
      fortythree: 'Fortythree',
      fortyfour: 'Fortyfour',
      fortyfive: 'Fortyfive'
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
Pass1: <%= await ctx.passwordFieldTag('thirteen') %>
Pass2: <%= await ctx.passwordFieldTag('fourteen', {class: 'bar'}) %>
File1: <%= await ctx.fileFieldTag('fifteen') %>
File2: <%= await ctx.fileFieldTag('sixteen', {class: 'bar'}) %>
Search1: <%= await ctx.searchFieldTag('seventeen') %>
Search2: <%= await ctx.searchFieldTag('eightteen', {class: 'bar'}) %>
Search3: <%= await ctx.searchFieldTag('nineteen', {class: 'bar', value: 'Default'}) %>
Color1: <%= await ctx.colorFieldTag('twenty') %>
Color2: <%= await ctx.colorFieldTag('twentyone', {class: 'bar'}) %>
Color3: <%= await ctx.colorFieldTag('twentytwo', {class: 'bar', value: 'Default'}) %>
Hidden1: <%= await ctx.hiddenFieldTag('twentythree', 'Default') %>
Hidden2: <%= await ctx.hiddenFieldTag('twentyfour', 'Default', {class: 'bar'}) %>
Date1: <%= await ctx.dateFieldTag('twentyfive') %>
Date2: <%= await ctx.dateFieldTag('twentysix', {class: 'bar'}) %>
Date3: <%= await ctx.dateFieldTag('twentyseven', {class: 'bar', value: 'Default'}) %>
Datetime1: <%= await ctx.datetimeFieldTag('twentyeight') %>
Datetime2: <%= await ctx.datetimeFieldTag('twentynine', {class: 'bar'}) %>
Datetime3: <%= await ctx.datetimeFieldTag('thirty', {class: 'bar', value: 'Default'}) %>
Email1: <%= await ctx.emailFieldTag('thirtyone') %>
Email2: <%= await ctx.emailFieldTag('thirtytwo', {class: 'bar'}) %>
Email3: <%= await ctx.emailFieldTag('thirtythree', {class: 'bar', value: 'Default'}) %>
URL1: <%= await ctx.urlFieldTag('thirtyfour') %>
URL2: <%= await ctx.urlFieldTag('thirtyfive', {class: 'bar'}) %>
URL3: <%= await ctx.urlFieldTag('thirtysix', {class: 'bar', value: 'Default'}) %>
Number1: <%= await ctx.numberFieldTag('thirtyseven') %>
Number2: <%= await ctx.numberFieldTag('thirtyeight', {class: 'bar'}) %>
Number3: <%= await ctx.numberFieldTag('thirtynine', {class: 'bar', value: 'Default'}) %>
Tel1: <%= await ctx.telFieldTag('forty') %>
Tel2: <%= await ctx.telFieldTag('fortyone', {class: 'bar'}) %>
Tel3: <%= await ctx.telFieldTag('fortytwo', {class: 'bar', value: 'Default'}) %>
Range1: <%= await ctx.rangeFieldTag('fortythree') %>
Range2: <%= await ctx.rangeFieldTag('fortyfour', {class: 'bar'}) %>
Range3: <%= await ctx.rangeFieldTag('fortyfive', {class: 'bar', value: 'Default'}) %>
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
Pass1: <input type="password" name="thirteen">
Pass2: <input class="bar" type="password" name="fourteen">
File1: <input type="file" name="fifteen">
File2: <input class="bar" type="file" name="sixteen">
Search1: <input type="search" name="seventeen">
Search2: <input class="bar" type="search" name="eightteen">
Search3: <input class="bar" value="Default" type="search" name="nineteen">
Color1: <input type="color" name="twenty">
Color2: <input class="bar" type="color" name="twentyone">
Color3: <input class="bar" value="Default" type="color" name="twentytwo">
Hidden1: <input type="hidden" name="twentythree" value="Default">
Hidden2: <input class="bar" type="hidden" name="twentyfour" value="Default">
Date1: <input type="date" name="twentyfive">
Date2: <input class="bar" type="date" name="twentysix">
Date3: <input class="bar" value="Default" type="date" name="twentyseven">
Datetime1: <input type="datetime" name="twentyeight">
Datetime2: <input class="bar" type="datetime" name="twentynine">
Datetime3: <input class="bar" value="Default" type="datetime" name="thirty">
Email1: <input type="email" name="thirtyone">
Email2: <input class="bar" type="email" name="thirtytwo">
Email3: <input class="bar" value="Default" type="email" name="thirtythree">
URL1: <input type="url" name="thirtyfour">
URL2: <input class="bar" type="url" name="thirtyfive">
URL3: <input class="bar" value="Default" type="url" name="thirtysix">
Number1: <input type="number" name="thirtyseven">
Number2: <input class="bar" type="number" name="thirtyeight">
Number3: <input class="bar" value="Default" type="number" name="thirtynine">
Tel1: <input type="tel" name="forty">
Tel2: <input class="bar" type="tel" name="fortyone">
Tel3: <input class="bar" value="Default" type="tel" name="fortytwo">
Range1: <input type="range" name="fortythree">
Range2: <input class="bar" type="range" name="fortyfour">
Range3: <input class="bar" value="Default" type="range" name="fortyfive">
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
Pass1: <input type="password" name="thirteen">
Pass2: <input class="bar" type="password" name="fourteen">
File1: <input type="file" name="fifteen">
File2: <input class="bar" type="file" name="sixteen">
Search1: <input type="search" name="seventeen" value="Seventeen">
Search2: <input class="bar" type="search" name="eightteen" value="Eightteen">
Search3: <input class="bar" value="Nineteen" type="search" name="nineteen">
Color1: <input type="color" name="twenty" value="Twenty">
Color2: <input class="bar" type="color" name="twentyone" value="Twentyone">
Color3: <input class="bar" value="Twentytwo" type="color" name="twentytwo">
Hidden1: <input type="hidden" name="twentythree" value="Default">
Hidden2: <input class="bar" type="hidden" name="twentyfour" value="Default">
Date1: <input type="date" name="twentyfive" value="Twentyfive">
Date2: <input class="bar" type="date" name="twentysix" value="Twentysix">
Date3: <input class="bar" value="Twentyseven" type="date" name="twentyseven">
Datetime1: <input type="datetime" name="twentyeight" value="Twentyeight">
Datetime2: <input class="bar" type="datetime" name="twentynine" value="Twentynine">
Datetime3: <input class="bar" value="Thirty" type="datetime" name="thirty">
Email1: <input type="email" name="thirtyone" value="Thirtyone">
Email2: <input class="bar" type="email" name="thirtytwo" value="Thirtytwo">
Email3: <input class="bar" value="Thirtythree" type="email" name="thirtythree">
URL1: <input type="url" name="thirtyfour" value="Thirtyfour">
URL2: <input class="bar" type="url" name="thirtyfive" value="Thirtyfive">
URL3: <input class="bar" value="Thirtysix" type="url" name="thirtysix">
Number1: <input type="number" name="thirtyseven" value="Thirtyseven">
Number2: <input class="bar" type="number" name="thirtyeight" value="Thirtyeight">
Number3: <input class="bar" value="Thirtynine" type="number" name="thirtynine">
Tel1: <input type="tel" name="forty" value="Forty">
Tel2: <input class="bar" type="tel" name="fortyone" value="Fortyone">
Tel3: <input class="bar" value="Fortytwo" type="tel" name="fortytwo">
Range1: <input type="range" name="fortythree" value="Fortythree">
Range2: <input class="bar" type="range" name="fortyfour" value="Fortyfour">
Range3: <input class="bar" value="Fortyfive" type="range" name="fortyfive">
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
Relative style: <%= ctx.styleTag('/foo/bar.css', {media: 'foo'}) %>
Absolute image: <%= ctx.imageTag('https://mojojs.org/static/foo/bar.png') %>
Absolute script: <%= ctx.scriptTag('https://mojojs.org/static/foo/bar.js', {async: 'async'}) %>
Absolute style: <%= ctx.styleTag('https://mojojs.org/static/foo/bar.css') %>
Asset script1: <%= ctx.assetTag('/foo.js') %>
Asset script2: <%= ctx.assetTag('/foo.js', {async: 'async'}) %>
Asset style1: <%= ctx.assetTag('/foo.css') %>
Asset style2: <%= ctx.assetTag('/foo.css', {media: 'foo'}) %>
Asset image1: <%= ctx.assetTag('/foo.png') %>
Asset image2: <%= ctx.assetTag('/foo.png', {alt: 'test'}) %>
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
Relative style: <link rel="stylesheet" href="/${publicPath}foo/bar.css" media="foo">
Absolute image: <img src="https://mojojs.org/static/foo/bar.png">
Absolute script: <script src="https://mojojs.org/static/foo/bar.js" async="async"></script>
Absolute style: <link rel="stylesheet" href="https://mojojs.org/static/foo/bar.css">
Asset script1: <script src="/static/assets/foo.ab1234cd5678ef.js"></script>
Asset script2: <script src="/static/assets/foo.ab1234cd5678ef.js" async="async"></script>
Asset style1: <link rel="stylesheet" href="/static/assets/foo.ab1234cd5678ef.css">
Asset style2: <link rel="stylesheet" href="/static/assets/foo.ab1234cd5678ef.css" media="foo">
Asset image1: <img src="/static/assets/foo.png">
Asset image2: <img src="/static/assets/foo.png" alt="test">
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
