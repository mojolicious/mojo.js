use Mojo::Base -strict;

use Mojolicious::Routes::Pattern;

for (my $i = 0; $i < 1000000; $i++) {
  my $pattern = Mojolicious::Routes::Pattern->new('/foo/:bar/baz');
  $pattern->match('/test/bar/baz', 1);
}
