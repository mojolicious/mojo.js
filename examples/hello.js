import {App} from '../lib/index.js';

const app = new App();
app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));
app.start();
