### HEADERS Frame 报头帧

报头帧(类型=0x1)用来打开一个流 ，并且同时可以携带头块的碎片。报头帧能在流打开或者半封闭(远程)的状态下发送。

头块碎片（Header Block Fragment），名字古怪甚至有点吓人，可实际上也没有更好的表达方法。需要我们稍有耐心，一步步的去了解。

当我们使用chrome访问https://ietf.org/时，可以在chrome开发工具中看到，chrome发出如下样式请求给服务器：

    Accept:text/html,application/xhtml+xml,...
    Accept-Encoding:gzip, deflate, sdch
    Accept-Language:en-US,en;q=0.8,...
    Connection:keep-alive
    Host:ietf.org
    RA-Sid:...
    RA-Ver:2.8.9
    User-Agent:Mozilla/5.0 (Windows NT 6.1; ...

其中的每一行都是一个键值对的映射被称为头字段（head field）。一组头字段一起构成一个头字段表（head field list），通过序列化和压缩变成一个或者几个帧。

如此，一个头字段表在http2的场景下，为了高效传输，会被序列化、压缩之后打碎为多个帧，每个帧有它的一个碎片。接收方会把这些碎片通过组装，反压缩，反序列化变成原始的头块表。这就是头块碎片这个名字的由来。

完整的头块(head block)由如下两种情况构成：

   o  一个单独的 HEADERS 或者 PUSH_PROMISE 帧(设置了END_HEADERS 标志)

   o  一个单独的 HEADERS 或者 PUSH_PROMISE 帧（未设置END_HEADERS 标志）加上一个或者多个CONTINUATION 帧，最后一个, CONTINUATION 设置了END_HEADERS 标志
      

```
  0                   1                   2                   3
  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |Pad Length? (8)|
 +-+-------------+-----------------------------------------------+
 |E|                 Stream Dependency? (31)                     |
 +-+-------------+-----------------------------------------------+
 |  Weight? (8)  |
 +-+-------------+-----------------------------------------------+
 |                   Header Block Fragment (*)                 ...
 +---------------------------------------------------------------+
 |                           Padding (*)                       ...
 +---------------------------------------------------------------+
```


###字段

 - **Pad Length** ： 字节填充长度字段。8 bit。可选。Flags:PADDED 设置后要求有此字段
 - **E** ： 1位的标记用于标识流依赖是否是专用的。可选。Flags:PRIORITY 设置后要有此字段
 - **Stream Dependency** ： StreamID。31位流 .可选。Flags:PRIORITY 设置后要有此字段
 - **Weight** : 流的8位权重标记。添加一个1-256的值来存储流的权重。这个字段是可选的，并且只在优先级标记设置的情况下才呈现。
 - **Header Block Fragment** ： 报头块碎片。
 - **Padding** ： 填充字节

**Stream Dependency，**Weight** 字段被用于做流依赖，流优先级，属于高级的话题，未来会做介绍。

### 标志

 - **END_STREAM (0x1)** ： 位1用来标识这是发送端对确定的流发送的最后报头区块.设置这个标记将使流进入一种半封闭状态
 - **END_SEGMENT (0x2)** ： 位2表示这是当前端的最后一帧。中介端绝对不能跨片段来合并帧，且在转发帧的时候必须保持片段的边界。
 - **END_HEADERS (0x4)** ： 位3表示帧包含了整个的报头块 ，且后面没有延续帧。
 - **PADDED (0x8)** ： 位4表示Pad Length字段会呈现。
 - **PRIORITY (0x8)** ： 位6设置指示专用标记(E) 

报头帧的主体包含一个报头块碎片。报头区块大于一个报头帧的将在延续帧中继续传送。

###错误处理

报头帧必须与一个流相关联。如果一个接收到一个流标示识0x0的报头帧，接收端必须响应一个类型为协议错误的连接错误 

### 代码定义

    Serializer.HEADERS = function writeHeadersPriority(frame, buffers) {
      if (frame.flags.PRIORITY) {
        var buffer = new Buffer(5);
        assert((0 <= frame.priorityDependency) && (frame.priorityDependency <= 0x7fffffff), frame.priorityDependency);
        buffer.writeUInt32BE(frame.priorityDependency, 0);
        if (frame.exclusiveDependency) {
          buffer[0] |= 0x80;
        }
        assert((0 <= frame.priorityWeight) && (frame.priorityWeight <= 0xff), frame.priorityWeight);
        buffer.writeUInt8(frame.priorityWeight, 4);
        buffers.push(buffer);
      }
      buffers.push(frame.data);
    };
    
    Deserializer.HEADERS = function readHeadersPriority(buffer, frame) {
      var dataOffset = 0;
      var paddingLength = 0;
      if (frame.flags.PADDED) {
        paddingLength = (buffer.readUInt8(dataOffset) & 0xff);
        dataOffset = 1;
      }
    
      if (frame.flags.PRIORITY) {
        var dependencyData = new Buffer(4);
        buffer.copy(dependencyData, 0, dataOffset, dataOffset + 4);
        dataOffset += 4;
        frame.exclusiveDependency = !!(dependencyData[0] & 0x80);
        dependencyData[0] &= 0x7f;
        frame.priorityDependency = dependencyData.readUInt32BE(0);
        frame.priorityWeight = buffer.readUInt8(dataOffset);
        dataOffset += 1;
      }
    
      if (paddingLength) {
        frame.data = buffer.slice(dataOffset, -1 * paddingLength);
      } else {
        frame.data = buffer.slice(dataOffset);
      }
    };