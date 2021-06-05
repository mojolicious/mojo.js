#!/usr/bin/env node
'use strict';

const app = require('../lib/mojo')({detectImport: false});

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
