const app = require('..')();

app.any('/', ctx => ctx.render({text: 'Bye Mojo!'}));

app.start();
