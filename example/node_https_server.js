var https = require('https');
var fs = require('fs');

var options = {
  key: fs.readFileSync('example/localhost.key'),
  cert: fs.readFileSync('example/localhost.crt')
};
// var supportedProtocols = ['http/1.1', 'http/1.0'];
var supportedProtocols = ["h2", "h2-14",'http/1.1', 'http/1.0'];
// var supportedProtocols = ['http/1.0'];
options.ALPNProtocols = supportedProtocols;
options.NPNProtocols = supportedProtocols;

var Writable = require('stream').Writable;
var ws = new Writable();
ws._write = function (chunk, enc, next) {
	console.dir(chunk);
	next();
};
var _server = https.createServer(options, function (req, res) {
  // req.pipe(ws);
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
_server.once('secureConnection', function(socket) {
   console.log('Protocol:'+socket.npnProtocol);      
   // socket.pipe(ws)   
});

// _server.on


// process.stdin.pipe(ws);
// this._write = function _temporalWrite(chunk, encoding, done) {
//     // * which compares the stored header with the current `chunk` byte by byte and emits the
//     //   'error' event if there's a byte that doesn't match
//     var offset = cursor;
//     while(cursor < CLIENT_PRELUDE.length && (cursor - offset) < chunk.length) {
//       if (CLIENT_PRELUDE[cursor] !== chunk[cursor - offset]) {
//         this._log.fatal({ cursor: cursor, offset: offset, chunk: chunk },
//                         'Client connection header prelude does not match.');
//         this._error('handshake', 'PROTOCOL_ERROR');
//         return;
//       }
//       cursor += 1;
//     }

//     // * if the whole header is over, and there were no error then restore the original `_write`
//     //   and call it with the remaining part of the current chunk
//     if (cursor === CLIENT_PRELUDE.length) {
//       this._log.debug('Successfully received the client connection header prelude.');
//       delete this._write;
//       chunk = chunk.slice(cursor - offset);
//       this._write(chunk, encoding, done)
// ;    }
//   };
//URL https://localhost:8001
//  is  a https server 
// firefox 看起来支持h2了。用它访问 URL ,可以看到服务器打印了h2字样。chrome 41啊还是打印http/1.1
// 但是。。。访问node example/server.js (https://localhost:8080/server.js 就看不到它下载server.js 和接受推送client.js
// 下一步该肿么办？
// 依据草案版本实现的协议`必须`添加字符"-"及相对应的草案版本进行标识。
// 例如，基于TLS 的草案draft-ietf-httpbis-http2-14 需要使用字符"h2-14"进行标识。chrome 当前支持h2-14