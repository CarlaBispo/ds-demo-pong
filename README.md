deepstreamio.io Pong
===========

This is a fork of [gburnett/javascript-pong](https://github.com/gburnett/javascript-pong) which is a fork of [jakesgordon/javascript-pong](https://github.com/jakesgordon/javascript-pong), a tutorial for implementing a Pong game.

All frontend credits goes to [jakesgordon](https://github.com/jakesgordon).



## Setup

```shell
npm install
npm run deepstream # in a terminal
npm start # in another terminal
```
## Run in the network

To allow users to join you need set two environment variables:

###### `SERVER_IP`
This affects the IP which will be opened in the browser, defaults to `0.0.0.0`
This is important for the QR codes which using `window.location.host`.
Has no effects for `npm run build`.

###### `DEEPSTREAM_HOST` (with port)
Main page and controller page will connect against this host, defaults
to `localhost:6020`.

If you want to allow users to connect to your server within your WiFi network
just check your WiFi IP adresss by `ifconfig` or `ipconfig` use the IP for
both environment variables, for example:

```shell
SERVER_IP= 192.168.43.213 DEEPSTREAM_HOST= 192.168.43.213:6020 npm start
```
