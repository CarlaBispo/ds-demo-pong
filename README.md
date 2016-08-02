deepstreamio.io Pong
===========

This is a fork of [gburnett/javascript-pong](https://github.com/gburnett/javascript-pong) which is a fork of [jakesgordon/javascript-pong](https://github.com/jakesgordon/javascript-pong), a tutorial for implementing a Pong game.

All frontend credits goes to [jakesgordon](https://github.com/jakesgordon).

## Play online
Play now without setup on  
http://rawgit.com/deepstreamIO/ds-demo-pong/gh-pages/index.html?dsHost=52.29.229.244:6020

## Local setup

```shell
npm install
npm run deepstream # in a terminal
npm start # in another terminal
```

## Overwrite deepstream server host

If you want to change the deepstream host you can set this env variable:

###### `DEEPSTREAM_HOST` (with port)
Default value: `<IP_OR_HOSTNAME>:6020`.

If you want to allow users to connect to your server within your WiFi network
just check your WiFi IP adresss by `ifconfig` or `ipconfig` and set the env variable:

```shell
DEEPSTREAM_HOST=192.168.100.1:6020 npm start
```

You can also set the deepstream host in the url at runtime as a query string `?dsHost=192.168.100.1:6020`.
