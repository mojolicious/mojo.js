<!DOCTYPE html>
<!-- Request ID: <%= ctx.req.requestId %> -->
<html>
  <head>
    <title>Page Not Found</title>
    %= ctx.mojoFaviconTag()
    <style>
      a img {
        border: 0;
      }
      body {
        background-color: #caecf6;
      }
      #no-raptor {
        left: 0%;
        position: fixed;
        top: 60%;
      }
      #not-found {
        background: url(<%= ctx.urlForFile('/mojo/not-found.png') %>);
        height: 62px;
        left: 50%;
        margin-left: -153px;
        margin-top: -31px;
        position:absolute;
        top: 50%;
        width: 306px;
      }
    </style>
  </head>
  <body>
    <a href="<%= ctx.req.baseURL %>">
      <img src="<%= ctx.urlForFile('/mojo/no-raptor.png') %>" alt="Bye!" id="no-raptor">
    </a>
    <div id="not-found"></div>
  </body>
</html>
<!-- a padding to disable MSIE and Chrome friendly error page -->
<!-- a padding to disable MSIE and Chrome friendly error page -->
<!-- a padding to disable MSIE and Chrome friendly error page -->
<!-- a padding to disable MSIE and Chrome friendly error page -->
<!-- a padding to disable MSIE and Chrome friendly error page -->
<!-- a padding to disable MSIE and Chrome friendly error page -->
