http2 可以完全实现http1.x的全部功能。我们看一个案例

###建立场景

假设在http1.x，客户端希望获得服务器的3项资源

资源x，URI：/x  内容（一个字符串）：Server X Response
资源y，URI：/y  内容（一个字符串）：Server Y Response
资源z，URI：/z  内容（一个字符串）：Server Z Response

在http 1.1 协议上，必须要开3个连接。客户端需要做三次get,服务器要根据这三个get做3次响应。

现实中的案例可能是这样的:

    <!--file.html-->
    <html xmlns="http://www.w3.org/1999/html">
    <head>
        <meta charset="utf-8">    
        <link rel="stylesheet" href="woo.css" type="text/css">
        <script type="text/javascript" src='bar.js'>    
    </head>
    <body>
    
装入一个html资源的同时，此html内嵌的全部资源如图片，js，css都需要装入。考虑到http场景下，大量的资源都是成组的，而不是单独出现的。

在http1.x场景下，需要打开多次连接，占用了更多的TCP Connection资源。
    
那么，引入了http2后，会如何处理这样的请求呢？

### http2 的情况

客户端发一个HEAD帧（包装GET /X) 过来;
服务器知道客户的一个request，需要3个资源(X,Y,Z)。服务器在一个连接上开3个流，分别包装3个资源，每个流内装入多个帧（HEADER,PUSH_PROMISE,DATA),在一个连接上发给客户端。

### 代码场景

客户端访问资源x，服务器响应资源x，并通过promise，发两次推送给客户端。以此为例子，查看Frame和Stream封装和运作。

### 代码

    var path = '/x';
    var message = 'server response';
    var pushedPath = '/y';
    var pushedMessage = 'server Y response';
    var pushedPath1 = '/y';
    var pushedMessage1 = 'server Z response';
    var server = http2.createServer(options, function(request, response) {
      var push1 = response.push('/y');
      push1.end(pushedMessage);
      var push2 = response.push({ path: '/z', protocol: 'https:' });
      push2.end(pushedMessage1);
      response.end(message);
    });
    server.listen(1235, function() {
      var request = http2.get('https://localhost:1235' + path);
      request.on('push', function(promise) {
        promise.on('response', function(pushStream) {
          pushStream.on('data', function(data) {
            done();
          });
          pushStream.on('end', done);
        });
      });
    });
  });

###帧集合(node-http2为例）
    // 客户端发起get /x
    { type: 'HEADERS',
      stream: 1,
      headers: 
       { ':scheme': 'https',
         ':method': 'GET',
         ':authority': 'localhost',
         ':path': '/x' } }
         
    // 服务器承诺会在未来推送y,z资源，y资源未来会在流2推送，z资源在流4推送
    
    { type: 'PUSH_PROMISE',
      stream: 1,
      promised_stream: 2,
      headers: 
       { ':method': 'GET',
         ':scheme': 'https',
         ':authority': 'localhost',
         ':path': '/y' } }
    { type: 'PUSH_PROMISE',
      stream: 1,
      promised_stream: 4,
      headers: 
       { ':method': 'GET',
         ':scheme': 'https',
         ':authority': 'localhost',
         ':path': '/z' } }
    
    // 服务器对get /x  本身需要的资源做出响应头
    { type: 'HEADERS',
      stream: 1,  
      headers: { ':status': '200', date: 'Tue, 17 Mar 2015 03:53:59 GMT' } }

    // 服务器对get /x  本身需要的资源做出响应内容    
    { type: 'DATA',
      stream: 1,
      data: 'server response',
      }
      
    // StreamID为2 ，是前面推送承诺给资源Y的响应头帧
    { type: 'HEADERS',
      stream: 2,
      headers: { ':status': '200', date: 'Tue, 17 Mar 2015 03:53:59 GMT' } }\
       // StreamID为4 ，是前面推送承诺给资源Z的响应头帧
        { type: 'HEADERS',
          stream: 4,
          headers: { ':status': '200', date: 'Tue, 17 Mar 2015 03:53:59 GMT' } }
       // StreamID为2 ，是前面推送承诺给资源Y的响应数据帧    
        { type: 'DATA', stream: 2, data: 'Server Y Response'}
       // StreamID为3 ，是前面推送承诺给资源Y的响应数据帧    
        { type: 'DATA', stream: 4, data: 'Server Z Response'}
    
    
    
    