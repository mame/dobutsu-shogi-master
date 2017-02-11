# Dobutsu-Shogi master （どうぶつしょうぎ名人）

Dobutsu-Shogi is a much simpler variant of Shogi (Japanese chess), which is played on 3x4 board.  See the [Wikipedia article](https://en.wikipedia.org/wiki/D%C5%8Dbutsu_sh%C5%8Dgi) for the detail.

It is known that black (the starting player) cannot win if white plays perfectly.  This is a constructive proof; [Dobutsu-Shogi master](http://mame.github.io/dobutsu-shogi-master/) is a perfect player.  You can never beat it.  Enjoy the helplessness!

## How to build

~~~
$ make -C precomp
$ cd client
$ ruby images/setup.rb
$ npm install
$ npm run build
$ cd ..
$ open docs/index.html
~~~

## Directories

* `precomp/`: precompute the data base of the perfect play.
* `client/`: serves a UI for browser.
