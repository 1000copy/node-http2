<< 没有完全弄懂。


WINDOW_UPDATE帧(type=0x8)用来实现流量控制；

所有类型的流量控制都是逐跳的（hop-by-hop)；中介端不在依赖的连接上转发WINDOW_UPDATE帧。不过，接收端对数据的节流措施可以直接传播到原始发送端（而不是仅仅限于最近的中介）。

流量控制只适用于标示为需要受流量控制影响的帧集合。文档中定义的帧类型中，只包括数据帧。不受流量控制的帧必须被接收和处理，除非接收端无法为帧分配资源。接收端如果无法接收帧，可以响应一个流错误或者类型为流量控制错误的连接错误

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |X|              Window Size Increment (31)                     |
 +-+-------------------------------------------------------------+
```
###字段
**X** ：保留字段，1bit
**Window Size Increment** 31bits unsigned int
表明发送端除了现有的流量控制窗口可以发送的字节数。


###标志

（无）

###限定

可以针对整个连接或者某个具体的流。帧的流标识符为0 针对整个连接；否则指的是被影响的流；

可以由一个已经发送带有END_STREAM标记的帧的对等端来发送。这意味着接收端可以在“半封闭(远程)”或者“关闭”的流上接收WINDOW_UPDATE帧。接收端绝对不能作为错误处理 

即使帧出错，只要没有发生连接错误,接收端必须用这个帧来计算流控窗口。因为发送端一发送就将这个帧计入了流量控制窗口，如果接收端没有这样做，发送端和接收端的流量控制
会出现差异。

###test case:

这个别扭的stream，终于有点适应了。
call write表示写入这模块管道，就是等于说来数据了呃。
call read 表示调用者需要数据，你准备去。

			describe('sanrex.write() method', function() {
		      it('call with a DATA frame should trigger sending WINDOW_UPDATE if remote flow control is not' +
		         'disabled', function(done) {
		        flow._window = 100;
		        flow._send = util.noop;
		        flow._receive = function(frame, callback) {
		          callback();
		        };
		        // write -> _write ,then in _write {},calling restoreWindows if frame is DATA.
		        // restoreWindows push WINDOWS_UPDATE for reader consume .
		        // it is correct ,by Why do it ?
		        // 收到一个数据帧，就会发一个WINDOW_UPDATE来对此数据帧做ack。 
		        // 啊呀，明白了。
		        // 两方设置到初始_window,发送方发多少就减多少。然后接收方收到后，做一个update,WINDOW_UPDATE,让发送方把这个不断减少的_window恢复回去。
		        // 如果不发的此帧的话，对方的_window到 0就不能发送任何数据了。
		        // 这就是流控算法。
		        // 之所以一个flow可以write，可以等待read，因为它是全！双！工！
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
		  

再看这个图，就比较容易懂。buffer是stream本身提供的，不可见。_read是流本来就调用的，l_send

// Outgoing frames - sending procedure
// -----------------------------------

//                                         flow
//                +-------------------------------------------------+
//                |                                                 |
//                +--------+           +---------+                  |
//        read()  | output |  _read()  | flow    |  _send()         |
//     <----------|        |<----------| control |<-------------    |
//                | buffer |           | buffer  |                  |
//                +--------+           +---------+                  |
//                | input  |                                        |
//     ---------->|        |----------------------------------->    |
//       write()  | buffer |  _write()              _receive()      |
//                +--------+                                        |
//                |                                                 |
//                +-------------------------------------------------+