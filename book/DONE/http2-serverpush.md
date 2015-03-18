http2 发布。其中的一个feature 叫做Server Push 引起我的兴趣。

顾名思义，就是服务器推送。 价值何处？

###先看http 1.1 的做法。

假设web server root 内有一个 foo.html 内容为：

    <html xmlns="http://www.w3.org/1999/html">
    <head>
        <meta charset="utf-8">    
        <link rel="stylesheet" href="woo.css" type="text/css">
        <script type="text/javascript" src='bar.js'>    
    </head>
    <body>

那么当Agent（就是浏览器啦：）访问host/foo.html ，一旦下载和解析，知道html 要想render给用户，还需要两位两个小伙伴： woo.css和bar.js。

于是Agent 再建立2个连接，请求获得3个文件。

可是，问题来了。

这样做的效率比较低。因为服务器是可以实现知道foo.html 还需要两个小伙伴才能render的。Webserver不能装外宾哈。何不一次发送过去，服务器一次返回这些小伙伴呢？

这就是http2的思路。

###http2的应对

现在依然是有Agent发起初始请求。在Server push 情况下，在收foo.html的时候（不管完没完），连接继续保持，而不是关闭。服务器藉由此链接，就绪发送响应给Agent。HTTP2 协议内，服务器通过发送一个 PROMISE Frame，通知Agent将会在无Request的情况下，发送一个Response 过来。

这样，Server Push 就可以显而易见的提升人们的使用体验，减少网络上不必要的往返。

正如此图所示：

![clipboard.png](/img/bVkZ2a)

###一看就懂的代码来了:
尽管http2 刚刚发布，幸运的是有人已经使用node做了代码实现（node-http2）。如下的代码正是此repo的一段（位于 /test/http.js 最后）。

代码的意思，就是说Agent要了一个x，Server返回一个x对应的resource，并通过PROMISE ，发送了一个y的资源。

要一个给两个，这就是Severpush的要义：）Talk is cheap ,show me the code 。

  

      describe('server push', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'Hello world';
        var pushedPath = '/y';
        var pushedMessage = 'Hello world 2';
    
        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          var push1 = response.push('/y');
          push1.end(pushedMessage);
          var push2 = response.push({ path: '/y', protocol: 'https:' });
          push2.end(pushedMessage);
          response.end(message);
        });
    
        server.listen(1235, function() {
          var request = http2.get('https://localhost:1235' + path);
          done = util.callNTimes(5, done);
    
          request.on('response', function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
            response.on('end', done);
          });
    
          request.on('push', function(promise) {
            expect(promise.url).to.be.equal(pushedPath);
            promise.on('response', function(pushStream) {
              pushStream.on('data', function(data) {
                expect(data.toString()).to.equal(pushedMessage);
                done();
              });
              pushStream.on('end', done);
            });
          });
        });
      });
    });
    
    
    
 (我做了一个folk，以便研究，地址在此：https://github.com/1000copy/node-http2)