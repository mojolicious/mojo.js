
# FAQ

This document contains answers for the most frequently asked questions about [mojo.js](https://mojojs.org).

### What about backwards compatibility?

We strictly follow [Semantic Versioning](https://semver.org) for all changes. New features can however be marked as
experimental to explicitly exclude them from the rules. This gives us the necessary freedom to ensure a healthy future
for [mojo.js](https://mojojs.org). So, as long as you are not using anything marked experimental, untested or
undocumented, you can always count on backwards compatibility, everything else would be considered a bug. However, to
completely avoid any risk of accidental breakage, we do recommend following current best practices for version pinning
with `package-lock.json` files.

### Which versions of Node.js are supported by mojo.js?

We fully support the latest releases of Node.js that are active/maintenance and have not rached their
[end of life](https://nodejs.dev/en/about/releases/) date yet.

### How do i get my IDE to autocomplete helpers?

Of course you want your IDE to autocomplete helpers when you start typing `ctx.`. Helpers are very dynamic code
however, so the IDE will need a little help. For this purpose TypeScript supports a feature called
[declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html). Simply add your helpers
to the `MojoContext` interface and the IDE will know what to do.

```
declare module '@mojojs/core' {
  interface MojoContext {
    myHelper: (foo: string, bar: number) => boolean;
  }
}
```

## More

A lot more documentation and examples by many different authors can be found in the
[mojo.js wiki](https://github.com/mojolicious/mojo.js/wiki).

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), or on [IRC](https://web.libera.chat/#mojo).
