var https = require('https');
var fs = require('fs');

var options = {
  key: fs.readFileSync('example/localhost.key'),
  cert: fs.readFileSync('example/localhost.crt')
};
// var supportedProtocols = ['http/1.1', 'http/1.0'];
var supportedProtocols = ["h2", 'http/1.1', 'http/1.0'];
// var supportedProtocols = ['http/1.0'];
options.ALPNProtocols = supportedProtocols;
options.NPNProtocols = supportedProtocols;

var _server = https.createServer(options, function (req, res) {
  res.writeHead(200);
  res.end("hello world\n");
}).listen(8001);

// _server.on('secureConnection', function(socket) {

//       var negotiatedProtocol = socket.npnProtocol || socket.alpnProtocol;
//       console.log('npnProtocol:'+socket.npnProtocol);
//       console.log('alpnProtocol:'+socket.alpnProtocol);
//       console.log('Protocol:'+negotiatedProtocol);
//       console.log('Protocol:'+negotiatedProtocol);
//       console.log('socket.authorized:'+socket.authorized);
//       console.log('socket.authorizationError:'+socket.authorizationError);
//     });
_server.on('secureConnection', function(socket) {
      console.log('Protocol:'+socket.npnProtocol);      
    });

//URL https://localhost:8001
//  is  a https server 
// firefox 看起来支持h2了。用它访问 URL ,可以看到服务器打印了h2字样。chrome 41啊还是打印http/1.1
// 但是。。。访问node example/server.js (https://localhost:8080/server.js 就看不到它下载server.js 和接受推送client.js
// 下一步该肿么办？