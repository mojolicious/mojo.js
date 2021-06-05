#!/usr/bin/env node
'use strict';

const mojo = require('../lib/mojo');

const app = mojo({detectImport: false});

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
