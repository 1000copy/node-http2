毕竟http2是新事物，尽管它的协议文本已经正式发布，但是相应的服务器和客户端代码依然在演进中。

我本人也特别关注浏览器部分。因为研究了颇有一段时间的node-http2，希望它可以和浏览器互操作，而不是自己的client，自己的server在那里左右互搏。

    
其中的firefox，最近的一片报道提到：Firefox 36 已经支持了最终版的h2。

    Firefox 36, currently in beta, will support the official final “h2″ protocol for negotiation next week. ... Firefox 36 will also support draft IDs -14 and -15, and will use -15 to negotiate with Twitter as well as Google.
    
    Mozilla outlines Firefox roadmap for HTTP/2 | VentureBeat | Business | by Emil Protalinski - http://venturebeat.com/2015/02/18/mozilla-outlines-firefox-roadmap-for-http2/


而chrome的最近报道兴趣盎然的提到了将会在2016年内删除spdy，却对我最关心的http2支持语焉不详。

    We plan to gradually roll out support for HTTP/2 in Chrome 40 in the upcoming weeks.

所以，为了验证实际情况，我写了一小块服务器代码，当浏览器访问https://localhost:8001时，如果此浏览器支持http2的话，就会在服务器段打印h2:

    var https = require('https');
    var fs = require('fs');
    
    var options = {
      key: fs.readFileSync('example/localhost.key'),
      cert: fs.readFileSync('example/localhost.crt')
    };
    var supportedProtocols = ["h2", 'http/1.1', 'http/1.0'];
    options.NPNProtocols = supportedProtocols;
    var _server = https.createServer(options, function (req, res) {
      res.writeHead(200);
      res.end("hello world\n");
    }).listen(8001);
    
    _server.on('secureConnection', function(socket) {
          console.log('Protocol:'+socket.npnProtocol);      
    });

实测效果是， firefox 36 支持http2了。用它访问 URL ,可以看到服务器打印了h2字样。
chrome 41啊还是打印http/1.1,chrome 42也如此。

所为的 in the upcoming weeks,还真是长啊，改成drozens of weeks 或者更妥。
