var http = require('http');
var dt = require('wasm-imagemagick');

http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write("Du nudel");
    res.end();
}).listen(8080); 