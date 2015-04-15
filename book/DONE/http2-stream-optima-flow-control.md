### 流量控制 

HTTP/2 流量控制的目标，在流量窗口初始值的约束下，给予接收端以全权，控制当下想要接受的流量大小。

算法是这样的：

1. 两端（收发）保有一个流量控制窗口（window）初始值。
2. 发送端每发送一个DATA帧，就把window递减，递减量为这个帧的大小，要是window小于帧大小，那么这个帧就必须被拆分。如果window等于0，就不能发送任何帧
3. 接收端可以发送 WINDOW_UPDATE帧给发送端，发送端以帧内指定的Window Size Increment作为增量，加到window上


鉴于发送端只要发送数据，window就会一直减少，这样，在初始值的配额下，接收端可以依据自己的处理能力等等参数，决定是否接受更多的帧，如果不想接，只要不发送WINDOW_UPDATE就可以。

比如说，发送端的初始window 为100，发送了一个DATA帧长度70，这时window 值为30；如果接收端回送 WINDOW_UPDATE,指定的Window Size Increment= 70,那么发送端的window恢复到100。

这个案例很简单，因此显得很幼稚：看起来就是发起端发送了70字节的数据，发送窗口减小，接收端拿到70字节，就会会送一个窗口增量。毫无流量控制的协议文本中那种板着面孔的深沉和...厚重的样子。可是，有人就是这样实现的。我说的是node-http2。

有测试用例为证(/test/flow.js)：


```
    describe('write() method', function() {
      it('call with a DATA frame should trigger sending WINDOW_UPDATE if remote flow control is not' +
         'disabled', function(done) {
        flow._window = 100;
        flow._send = util.noop;
        flow._receive = function(frame, callback) {
          callback();
        };        
        var buffer = new Buffer(util.random(10, 100));
        flow.write({ type: 'DATA', flags: {}, data: buffer });
        flow.once('readable', function() {
          expect(flow.read()).to.be.deep.equal({
            type: 'WINDOW_UPDATE',
            flags: {},
            stream: flow._flowControlId,
            window_size: buffer.length
          });
          done();
        });
      });
    });
  });
```
flow 就是流控对象，_window为流量控制窗口值，每次接到一个DATA帧，就会回送一个WINDOW_UPDATE帧，内涵的 window size increment 就是本次接受的DATA的数据长度。

接收端可以选择针对流及整个连接设置任意的窗口大小。发送端必须遵守接收端的流量控制限制。
帧类型决定了是否适用流量控制规则。只有DATA帧受流量控制；其他类型的帧不受流量控制。 
流量控制是逐跳的(hop-by-hop)，而不是端到端(end-to-end)连接的。不过，不分析阅读编写HTTP2代理的人，大可不必关心这个。

尽管node-http2的流控实现比较土逼，我们还是应该向往"花样年华"的可能存在。

以往http1.x的浏览器，在下载多种类型资源时，会把 html ,css,js 排在最高优先级，而jpg等图片一定是非常低的优先级。在缺少并发、流量控制的时代这样做可以保证关键资源的管道，是正确的策略。惜在不够充分利用带宽，特别是在关键资源不是立刻可用的情况下。

然而，有些浏览器希望事先知道图片显示尺寸，可用更好的做布局，减少reflow现象，如果可以预先下载图片的元数据（图片头内有）就太好了。

现在，完全可以在关键资源发送期间，如果还有带宽空闲，就可以这样并发起来：

	请求和发送关键资源
	对图片字节，不必完全留中不发...先发前面的~kb (对图片的流实施较小的流量窗口window约束)
	允许浏览器解码图片头获取显示尺寸
	等到关键资源传递完毕，在放大图片的流量控制窗口 window

