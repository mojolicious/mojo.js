use Mojo::Base -strict;

use Mojolicious::Routes::Pattern;

my $pattern = Mojolicious::Routes::Pattern->new('/foo/:bar/baz');
for (my $i = 0; $i < 10000000; $i++) {
  $pattern->match('/test/bar/baz', 1);
  $pattern->match('/foo/bar/baz',  1);
}
