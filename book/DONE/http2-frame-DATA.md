数据帧是类型为0x0的幀。一个或者多个DATA frame可以一起来，携带HTTP请求的数据或者响应的数据。数据帧也可以包含任意一些填充字节（为了安全的目的）

```
     0                   1                   2                   3
     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |Pad Length? (8)|
    +---------------+-----------------------------------------------+
    |                            Data (*)                         ...
    +---------------------------------------------------------------+
    |                           Padding (*)                       ...
    +---------------------------------------------------------------+
```

###字段Field：

Pad Length ： 填充字节长度（8bits）。关联查看Flag:PADDED
Data ： 应用数据。
Padding ： 填充字节。必须设置为0，接收的时候忽略。

###标记Flag：

END_STREAM (0x1) ： 流结束标示。1表示结束。
END_SEGMENT (0x2) ： 段结束标示。段是指示代理的合并时机。代理绝对不能跨越多个段边界来合并帧，转发帧的时候代理端必须保持片段的边界。（TODO:费解，需要ex）
PADDED (0x8) ： 填充标示。表示Pad Length 字段是可见的。

### 错误处理
数据帧绝对需要与流相关联。如果接收到流标记字段是0x0的数据帧，必须响应一个类型为协议错误的连接错误

数据帧遵从流量控制，并且只有在流是打开或者半封闭(远端)状态下才能够被发送。填充同样包含在流量控制中。如果数据帧在相关流不是在打开和半封闭(本地)状态下被接收，接收端必须响应一个类型为流关闭的流错误

填充字节的总数取决于Pad Length 的值。如果填充物的大小大于帧有效载荷的大小，接收端必须作为类型为协议错误的连接错误

请注意 ： 为帧的大小加1字节可通过增加一个值为0的Pad Length 值的方法。

###DATA frame 定义案例，流到对象的双向转换
（node-http2.js代码部分摘取）frame.js 

    frameTypes[0x0] = 'DATA';
    
    frameFlags.DATA = ['END_STREAM', 'RESERVED2', 'RESERVED4', 'PADDED'];
    
    typeSpecificAttributes.DATA = ['data'];
    
    Serializer.DATA = function writeData(frame, buffers) {
      buffers.push(frame.data);
    };
    
    Deserializer.DATA = function readData(buffer, frame) {
      var dataOffset = 0;
      var paddingLength = 0;
      if (frame.flags.PADDED) {
        paddingLength = (buffer.readUInt8(dataOffset) & 0xff);
        dataOffset = 1;
      }
    
      if (paddingLength) {
        frame.data = buffer.slice(dataOffset, -1 * paddingLength);
      } else {
        frame.data = buffer.slice(dataOffset);
      }
    };
