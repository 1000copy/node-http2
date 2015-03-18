From http://get.jobdeer.com/1166.get
### 6.7 PING PING帧

PING帧(type=0x6)是一种从发送端测量最小的RTT时间的机制，同样也是一种检测连接是否可用的方法。PING帧可以被任何终端发送。

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |                                                               |
 |                      Opaque Data (64)                         |
 |                                                               |
 +---------------------------------------------------------------+
```


除了帧报头之外，PING帧必须在载体中包含一个8字节长度的数据。发送端可以选择使用任何值并在任何方式使用。

接收到不包含ACK标记的PING帧必须发送一个带有ACK比标记的PING帧响应，以及一个相同的载荷。PING响应应当设置比其他帧更高的优先级。

PING帧定义了以下标记：

 **ACK (0x1)** ： 位1表示PING帧是一个PING响应。终端必须在PING响应中设置此标记。终端绝对不能对包含此标记的PING帧做出响应。

PING帧不与任何独立的流相关联。如果收到流标示字段不是0x0的PING帧，接收端必须响应一个类型为协议错误的连接错误。


接收到字段长度不是8的PING帧必须作为类型为帧大小错误的连接错误处理。
###

TODO : why buffer.slice(9), 9 instead of 8 ?

from github.com/1000copy/node-http2 test/framer.js + lib/framer.js

         describe('1000copy:ping frame construct', function() {
              it('frame cons.', function() {
                var f =  {
                    type: 'PING',
                    flags: { ACK: false },
                    stream: 15,
        
                    data: new Buffer('1234567887654321', 'hex')
                  };
                var r = new Buffer('000008' + '06' + '00' + '0000000F' +   '1234567887654321', 'hex');
                
                var frame = {};
                Deserializer.commonHeader(r.slice(0,9), frame);
                expect(frame).to.deep.equal({
                  type:   f.type,
                  flags:  f.flags,
                  stream: f.stream
                });
                var test = f ;
                var buffers = [r.slice(9)];
                var header_buffer = r.slice(0,9);
                Serializer.commonHeader(test, buffers);
                expect(buffers[0]).to.deep.equal(header_buffer);
                // console.log(f)
                // console.log(buffers);
                // console.log(header_buffer);
              });
          });
          
commonHeader 实现

    Deserializer.commonHeader = function readCommonHeader(buffer, frame) {
      var totallyWastedByte = buffer.readUInt8(0);
      var length = buffer.readUInt16BE(1);
      // We do this just for sanity checking later on, to make sure no one sent us a
      // frame that's super large.
      // 没看懂为何<<16 呢?
      length += totallyWastedByte << 16;
    
      frame.type = frameTypes[buffer.readUInt8(3)];
      if (!frame.type) {
        // We are required to ignore unknown frame types
        return length;
      }
    
      frame.flags = {};
      var flagByte = buffer.readUInt8(4);
      var definedFlags = frameFlags[frame.type];
      for (var i = 0; i < definedFlags.length; i++) {
        frame.flags[definedFlags[i]] = Boolean(flagByte & (1 << i));
      }
    
      frame.stream = buffer.readUInt32BE(5) & 0x7fffffff;
    
      return length;
    };