# Integration

[mojo.js](https://mojojs.org) is a MVC backend framework. While it is certainly possible to build highly complex
websites with just this framework, modern web development often includes the use of a separate frontend framework
for creating Single Page Applications (SPA). This page shows integration with other popular frameworks.

## VueJS + mojo.js using Vite

Create a ```Project``` directory that will house both the VueJS frontend and mojo.js backend.

Install VueJS.

```
$ npm init vue@latest
```

This command will install and execute create-vue, the official Vue project scaffolding tool. You will be presented 
with prompts for a number of optional features such as TypeScript and testing support:

```
✔ Project name: FrontEnd
✔ Add TypeScript? … No / Yes
✔ Add JSX Support? … No / Yes
✔ Add Vue Router for Single Page Application development? … No / Yes
✔ Add Pinia for state management? … No / Yes
✔ Add Vitest for Unit testing? … No / Yes
✔ Add Cypress for both Unit and End-to-End testing? … No / Yes
✔ Add ESLint for code quality? … No / Yes
✔ Add Prettier for code formatting? … No / Yes

Scaffolding project in ./<your-project-name>...
Done.
```

Choose yes for features you want. If you don't know if you need an option, select ```no```. You can always add it to 
your project later.

```
$ cd FrontEnd
$ npm install
$ npm run dev
```

Open a web browser and go to ```localhost::5173```. You now see the demo/sample project page.

This setup has installed [vite](https://vitejs.dev/) as your tooling software. By default, 
```vite.config.js``` is the following:

```
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

Make the following changes to get VueJS to work effectively with mojo.js.

```
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  base: '/static/',
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/backend': {
        target: 'http://localhost:3000/'
      },
    }
  }
});
```

```base``` prepends ```/static/``` to all routes associated with Vue SPA. When VueJS is compiled for
production using the command ```npm run build``` it creates assets in ```dist/``` directory. These assets are
browser friendly versions of the SPA built with VueJS. It creates html, css, js, and other files that a backend
can serve to the browser. When you are ready to deploy the app into production, these assets will later need to 
be copied over to mojo.js's ```public/assets/``` directory when you want to deploy for production. The ```/static```
prepend is necessary because mojo.js expects all SPA assets to have a '/static' route. This is explained in more
detail [here](https://mojojs.org/docs/Rendering.md#static-assets).

In addition to depoying for production, the base has the additional effect of adding ```/static``` to all routes
while running the VueJS SPA in development.

The ```server``` and ```proxy``` addditions to ```vite.config.js``` tells the VueJS app when and where to redirect to
the backend server (which will be mojo.js). The proxy can be given any route label, but for clarity we have used 
```/backend``` here. Any fetch, redirects in your VueJS SPA that call a route prepended with ```/backend/``` will now
be sent to the backend. Some examples are show below:

```js
window.location.href = '/backend/dashboard';
```

```js
var formData = new FormData();
formData.append('email', values.email);
formData.append('password', values.password);

fetch('/backend/validateUser', {      // will send to backend at localhost:3000 which will be our mojo.js app.
  method: 'POST',
  body: formData,
})
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    window.location.href = '/static' + data.url; //when you receive a response, redirect to new url on SPA.
  });

```

Now return to the top-level Project directory. Create a new directory called ```BackEnd/```.

```
$ mkdir BackEnd && cd BackEnd
$ npm create @mojojs/full-app -- --ts
$ npm install
$ npm run build:test
```

In ```src/index.ts```, add a route. For example:

```js
app.post('/backend/validateUser', async (ctx) => {
  await ctx.render({json: {response: 1}}); // there should serious code here, but this is simple.
});
```

Observe that mojo.js route has the ```/backend``` prefix.

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), on [Matrix](https://matrix.to/#/#mojo:matrix.org), or
[IRC](https://web.libera.chat/#mojo).
