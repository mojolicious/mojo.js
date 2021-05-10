use Mojolicious::Lite -signatures;

helper test => sub ($c) {
  return $c;
};

get '/' => sub ($c) {
  for (1 .. 100000000) {
    $c->test();
  }
  $c->render(text => 'Hello World');
};

app->start();
