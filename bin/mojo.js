#!/usr/bin/env node
import mojo from '../lib/core.js';

const app = mojo({detectImport: false});

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
