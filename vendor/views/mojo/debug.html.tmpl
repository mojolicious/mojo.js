<!DOCTYPE html>
<!-- Request ID: <%= ctx.req.requestId %> -->
<html>
  <head>
    <title>Debug</title>
    %= ctx.mojoFaviconTag()
    %= ctx.scriptTag('/mojo/bootstrap/bootstrap.bundle.min.js')
    %= ctx.scriptTag('/mojo/highlight.js/highlight.pack.js')
    %= ctx.styleTag('/mojo/bootstrap/bootstrap.min.css')
    %= ctx.styleTag('/mojo/highlight.js/highlight-mojo-dark.css')
    %= ctx.styleTag('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css')
    %= ctx.styleTag('/mojo/mojo.css')
    <script>
      hljs.initHighlightingOnLoad();
      window.onload = function() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        const tooltipList = tooltipTriggerList.map(tooltipTriggerEl => {
          return new bootstrap.Tooltip(tooltipTriggerEl);
        });
      };
    </script>
  </head>
  <body class="d-flex flex-column h-100">
    <header>
      <nav class="navbar navbar-expand-lg navbar-dark mojobar">
        <div class="container-fluid">
        <a href="https://mojojs.org" id="mojobar-brand" class="navbar-brand">
          <picture>
            <img src="<%= ctx.urlForFile('/mojo/logo-white.png') %>"
              srcset="<%= ctx.urlForFile('/mojo/logo-white-2x.png') %> 2x">
          </picture>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent"
          aria-controls="navbarContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarContent">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="communityDropdown" role="button"
                data-bs-toggle="dropdown" aria-expanded="false">
                Community
              </a>
              <div class="dropdown-menu" aria-labelledby="communityDropdown">
                <a class="dropdown-item" href="https://matrix.to/#/#mojo:matrix.org">Matrix</a>
                <a class="dropdown-item" href="https://web.libera.chat/#mojo">IRC</a>
                <a class="dropdown-item" href="https://github.com/mojolicious/mojo.js/discussions">Forum</a>
                <a class="dropdown-item" href="https://twitter.com/mojolicious_org">Twitter</a>
                <a class="dropdown-item" href="https://blogs.mojolicious.org">Blogs</a>
                <a class="dropdown-item" href="https://www.linkedin.com/groups/8963713/">LinkedIn</a>
              </div>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="https://github.com/mojolicious/mojo.js/">Contribute on GitHub</a>
            </li>
          </ul>
        </div>
        </div>
      </nav>
    </header>
    <div class="container flex-grow-1">
      <div class="row flex-wrap">
        <main class="col-sm-12 col-md-8 col-lg-10 py-md-3 pl-md-5">
          <div class="row mojo-divider">
            % if (exception !== null) {
              <div class="alert alert-danger mojo-wide" role="alert">
                <h2>Server Error</h2>
                This application is in <b>development</b> mode and will show internal information to help you with
                debugging.
              </div>
              <div id="showcase" class="mojo-box mojo-code mojo-no-bottom-border mojo-no-top-border mojo-border-radius-top">
                <pre id="error" class="mojo-error"><%= exception %></pre>
                % const context = await view.exceptionContext(exception);
                % if (context !== null) {
                  <div>
                    <table class="mojo-wide">
                      % for (const line of context.source) {
                        % const extra = context.line === line.num ? ' mojo-important' : '';
                        <tr>
                          <td class="text-right<%= extra %>"><%= line.num %></td>
                          <td class="mojo-context mojo-wide<%= extra %>"><pre><code><%= line.code %></code></pre></td>
                        </tr>
                      % }
                    </table>
                  </div>
                % }
              </div>
              <div id="trace" class="mojo-box mojo-no-padding more mojo-no-top-border mojo-border-radius-bottom">
                <div id="frames" class="more">
                  <table class="mojo-striped-grey mojo-wide">
                    % const stack = exception.stack ?? '';
                    % const lines = stack.split('\n').filter(line => line.match(/^\s*at\ /));
                    % const trace = lines.map(val => val.replace(/^\s+/, ''));
                    % for (const frame of trace) {
                      <tr><td class="mojo-value"><pre><%= frame %></pre></td></tr>
                    % }
                  </table>
                </div>
              </div>
            % } else {
              <div class="alert alert-warning mojo-wide" role="alert">
                <h2>Page Not Found</h2>
                This application is in <b>development</b> mode and will show internal information to help you with
                debugging.
              </div>
              <div id="routes" class="mojo-box mojo-no-padding mojo-border-radius-both">
                <div class="mojo-padded-content">
                  <p>
                    None of these routes could generate a response for your <code><%= ctx.req.method %></code> request
                    for <code><%= ctx.req.path %></code>, maybe you need to add a new one?
                  </p>
                </div>
                % function walk (route, depth) {
                  % const pattern = route.pattern;
                  % let unparsed = pattern.unparsed || '/';
                  % if (depth > 0) unparsed = `+${unparsed}`;
                  % pattern.match('/', {isEndpoint: route.isEndpoint});
                  % const regex = pattern.regex.toString();
                  <tr data-bs-toggle="tooltip" data-bs-placement="left" data-bs-html="true"
                    title="<b>Regex:</b> <code><%= regex %></code>">
                    <td class="mojo-value">
                      <pre><%= ' '.repeat(depth * 2) %><%= unparsed %></pre>
                    </td>
                    <td class="mojo-value">
                      <pre><%= route.methods.join(', ').toUpperCase() || '*' %></pre>
                    </td>
                    <td class="mojo-value">
                      % if (route.customName !== undefined) {
                        <span class="badge bg-success"><%= route.customName %></span>
                      % } else if (route.defaultName !== undefined) {
                        <span class="badge bg-secondary"><%= route.defaultName %></span>
                      % }
                    </td>
                  </tr>
                  % depth++;
                  %= route.children.map(child => walk(child, depth)).join('')
                  % depth--;
                % }
                <table class="mojo-striped-light mojo-wide">
                  <thead>
                    <tr>
                      <th>Pattern</th>
                      <th>Methods</th>
                      <th>Name</th>
                    </tr>
                  </thead>
                  %= ctx.app.router.children.map(child => walk(child, 0)).join('')
                </table>
              </div>
            % }
          </div>
          <div class="row mojo-divider">
            <div id="request" class="mojo-box mojo-no-padding mojo-border-radius-both">
              % const keyValue = function (key, value) {
                <tr>
                  <td class="mojo-key text-right"><%= key %>:</td>
                  <td class="mojo-value"><pre><%= value %></pre></td>
                </tr>
              % };
              <table class="mojo-striped mojo-fixed-table mojo-wide">
                % keyValue('Request ID', ctx.req.requestId);
                % keyValue('Method', ctx.req.method);
                % keyValue('Path', ctx.req.path);
                % keyValue('Base URL', ctx.req.baseURL);
                % keyValue('Parameters', ctx.inspect((await ctx.params()).toObject()));
                % keyValue('Stash', ctx.inspect(ctx.stash));
                % const headers = ctx.req.headers.toArray();
                % for (let i = 0; i < headers.length; i += 2) {
                  % keyValue(headers[i], headers[i + 1]);
                % }
              </table>
            </div>
          </div>
          <div class="row">
            % if (ctx.app.log.history.length > 0) {
              % const log = ctx.app.log.history.map(view.stringFormatter).join('');
              <pre class="mojo-terminal"><code class="nohighlight"><%= log %></code></pre>
            % } else {
              <div class="alert alert-warning mojo-wide" role="alert">
                The application log appears to be empty, perhaps the log level <b><%= ctx.app.log.level %></b> is too
                high? Try lowering it to <b>trace</b> for framework specific information.
              </div>
            % }
          </div>
        </main>
      </div>
    </div>
    <footer>
      <div class="container-fluid p-3 mojo-footer">
        <div class="row">
          <div class="col-sm align-self-center text-center mojo-free">
            <b>Free</b> and <b>Open Source</b>.
          </div>
          <div class="col-sm align-self-center text-center mojo-copy">
              <i class="far fa-copyright"></i> 2021 Sebastian Riedel and the
              <a href="https://github.com/mojolicious/mojo.js/AUTHORS">mojo.js contributors</a>.
          </div>
          <div class="col-sm align-self-center text-center mojo-social">
            <a alt="GitHub" href="https://github.com/mojolicious/mojo.js"><i class="fab fa-github-alt"></i></a>
            <a alt="Twitter" href="https://twitter.com/mojolicious_org"><i class="fab fa-twitter"></i></a>
            <a alt="LinkedIn" href="https://www.linkedin.com/groups/8963713/"><i class="fab fa-linkedin"></i></a>
          </div>
        </div>
      </div>
    </footer>
  </body>
</html>
