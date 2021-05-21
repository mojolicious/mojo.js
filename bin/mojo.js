#!/usr/bin/env node
import mojo from '../lib/mojo.js';

const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
