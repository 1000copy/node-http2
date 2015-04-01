基于http实现的browser，采用的是对低优先级资源节流的做法，比如webkit的ResourceLoadSchedule，就是首先载入影响绘制的html，js，css，第一次绘制完毕，dom加载完成，才放出更多的资源（如img）请求。

这样做的问题，就是在启动到dom loaded之间对带宽的利用不足。
既然http2是多播的，为了充分利用带宽，是否可以考虑在解析html后获知的全部资源一次发出，指定每个资源（流）的优先级，让服务器来完成优先级调度呢？通过优先级指定，就可以避免在高优先级被挂起（阻塞）的时候，低优先级的资源暂居了网络通道了。简单幼稚的一个可行实现，就是按照优先级队列来做出响应即可。这个做法，在spdy（http2前身）上叫做请求优先级（Request prioritization)。

### 流优先级

新建流的终端可以在报头帧中包含优先级信息来对流标记优先级。对于已存在的流，优先级帧可以用来改变流优先级。

http2 为了资源定优先级，标准化了依赖树的算法。以一个由多个流构成的依赖树为依据算法，以此来分配资源。

依赖流是更好的浏览器渲染约束的表达。渲染一个页面本身就是一个资源传递依赖的过程。比如脚本会阻塞html的解析，最终的布局依赖于外部的css。流依赖这个概念的引入，允许浏览器更简洁的表达场景的变化:比如用户改变了当前标签，浏览器只要通知标签依赖的树根变化即可。


依赖树的构建

和优先级有关的Frame有两个，分别为HEADER,PRIORITATION，但是两个frame中影响到优先级的字段是一样的。回顾下两个Frame的格式，这些字段是：
- **E** ： 1位的标记用于标识流依赖是否是专用的。可选。Flags:PRIORITY 设置后要有此字段
- **Stream Dependency** ： StreamID。31位流 .可选。Flags:PRIORITY 设置后要有此字段
- **Weight** : 流的8位权重标记。添加一个1-256的值来存储流的权重。这个字段是可选的，并且只在优先级标记设置的情况下才呈现。


可以通过**Stream  Dependency** 指定依赖另外一个流。当指定了一个依赖流，流会作为一个子流加入依赖树内。比如:B流，C流依赖于A流（左下图），如果D流通过HEADER frame创建，并同时指定依赖A流，那么依赖树就会变成右下图那样，b，d，c的次序不重要。

```
       A                 A
      / \      ==>      /|\
     B   C             B D C
```
**E** 为专有标记。如果这个标记被设置，就意味着当前流将会独自占有父亲流，本来的兄弟流要成为当前流的子流。以上图为例，如果D流设置了E标志，那么D独自占有A流为父亲，B,C  则成为D的子流。
```
                         A
       A                 |
      / \      ==>       D
     B   C              / \
                       B   C
```

每个依赖都会指定**Weight**权重，这个权重用来作为和其他兄弟流（同样依赖一个流的其他流）分配资源的筹码。   有同一个父亲的子流们应该按照权重值按比例分配资源。比如B依赖A权重4，C依赖A权重12，如果A已经完成，理想情况下，B得到它的1/4资源，C得到它的3/4的资源。

###依赖、并发、优先级调整的案例

假设一个index.html

```
  <html>
  <body>
  <script src="a.js"></script>
  <img src="a.jpg" width="100" height="100"/>
  <img src="b.jpg" width="100" height="100"/>
  <link rel="stylesheet" type="text/css" href="style.css">
  </body>
```
依赖于a.js 
```
  document.write('<script src="b.js"></script>');
```
依赖于b.js:
```
  document.write('<div>blocker</div>');
```
依赖于style.css:
```
  div {
    border: 1px solid #000;
  }
```

这样的情况，如今是如何传输的呢？index.html被接收然后解析，文档解析器(Document Parser)会发现a.js,发出请求并且被阻塞；接下来，探测解析器（Speculative Parser ),继续探测发现a.jpg,b.jpg,style.css 并向服务器发出资源请求，然后a.js获得并被解析执行，发现依赖b.js,然后发出b.js资源请求，然后文档解析器再次被阻塞，... 。如图：

```
    client                             server
    |--------------get index.html------> |
    |<----index.html         ----------- |
    |--------------get a.js      ------> |
    |--------------get a.jpg     ------> |
    |--------------get b.jpg     ------> |
    |--------------get style.css ------> |
    |<----a.js      -------------------- |
    |--------------get b.js      ------> |
    |<----a.jpg     -------------------- |
    |<----b.jpg     -------------------- |
    |<----style.css -------------------- |
    |<----b.js      -------------------- |
```

结论也就出来了，非常低效。唯有style.css,b.js完成，整个页面才完成加载，而关键的b.js图标为被其他不重要的资源（img）竞争而传递缓慢。

有了优先级帧（PRIORITITION)，依赖树算法，并发技术的http2，有可能改善这样情况，只要适合加入 PRIORITITION 帧，按照依赖算法计算优先级即可。


```
    client                             server
    |--------------1.get index.html----------------> |
    |<----index.html ------------------------------- |
    |--------------2.get a.js      (parent 1）-----> |
    |--------------3.get a.jpg     (parent 2)------> |
    |--------------4.get b.jpg    (parent 2) ------> |
    |--------------5.get style.css(parent 2 E)-----> |
    |<----a.js                  -------------------- |
    |--------------6.get b.js(parent 2 E)    ------> |
    |<----b.js       ------------------------------- |
    |<----style.css  ------------------------------- |
    |<----a.jpg      ------------------------------- |
    |<----b.jpg      ------------------------------- |    
    
```

当1.get.index.html的时候，依赖树为

   index.html ->root

当2.get a.js 时，在HEADER 帧内指定流依赖id为 1 （parent 1），因此，流2依赖于流1,依赖树为：

   a.js -> index.html ->root

相应的，3.get a.jpg
  
  a.jpg -> a.js -> index.html ->root

相应的，4.get b.jpg
  
  a.jpg ->|a.js -> index.html ->root
  b.jpg ->|
相应的，5.get style.css(parent 2 E)，E技术前面提到的字段**E** ，表示独占父亲流。
  
  a.jpg    ->|style.css->a.js -> index.html ->root
  b.jpg    ->|
  
相应的，6.get  b.js(parent 2 E)，E表示独占。
  
  a.jpg    ->|style.css->b.js->a.js -> index.html ->root
  b.jpg    ->|
  
这样，就可以在分析（动态）发现更高优先级资源的时候，调整依赖树，从而调整优先级次序，保证浏览器立刻需求的资源可以不必和晚点要的资源发生带宽竞争。

###Webkit 的传统资源优先级方法：代码实例

```
https://github.com/adobe/chromium/blob/master/content/browser/renderer_host/resource_dispatcher_host_impl.cc 

net::RequestPriority DetermineRequestPriority(ResourceType::Type type) {

  switch (type) {
    case ResourceType::MAIN_FRAME:
    case ResourceType::SUB_FRAME:
      return net::HIGHEST;
    case ResourceType::STYLESHEET:
    case ResourceType::SCRIPT:
    case ResourceType::FONT_RESOURCE:
      return net::MEDIUM;
    case ResourceType::SUB_RESOURCE:
    case ResourceType::OBJECT:
    case ResourceType::MEDIA:
    case ResourceType::WORKER:
    case ResourceType::SHARED_WORKER:
    case ResourceType::XHR:
      return net::LOW;


    case ResourceType::IMAGE:
    case ResourceType::FAVICON:
      return net::LOWEST;

    case ResourceType::PREFETCH:
    case ResourceType::PRERENDER:
      return net::IDLE;

    default:
      // When new resource types are added, their priority must be considered.
      NOTREACHED();
      return net::LOW;
  }
} 

```
### go http2 依赖树构建测试代码

来自于 :https://github.com/bradfitz/http2/blob/master/priority_test.go
```
func TestPriority(t *testing.T) {
  // A -> B
  // move A's parent to B
  streams := make(map[uint32]*stream)
  a := &stream{
    parent: nil,
    weight: 16,
  }
  streams[1] = a
  b := &stream{
    parent: a,
    weight: 16,
  }
  streams[2] = b
  adjustStreamPriority(streams, 1, PriorityParam{
    Weight:    20,
    StreamDep: 2,
  })
  if a.parent != b {
    t.Errorf("Expected A's parent to be B")
  }
  if a.weight != 20 {
    t.Errorf("Expected A's weight to be 20; got %d", a.weight)
  }
  if b.parent != nil {
    t.Errorf("Expected B to have no parent")
  }
  if b.weight != 16 {
    t.Errorf("Expected B's weight to be 16; got %d", b.weight)
  }
}
```
### go http2 专有标志的演示

实现了final的协议，因此可以看到依赖树的测试代码是比较完善的，颇有演示概念的价值
来自于 :https://github.com/bradfitz/http2/blob/master/priority_test.go

```
func TestPriorityExclusiveZero(t *testing.T) {
  // A B and C are all children of the 0 stream.
  // Exclusive reprioritization to any of the streams
  // should bring the rest of the streams under the
  // reprioritized stream
  streams := make(map[uint32]*stream)
  a := &stream{
    parent: nil,
    weight: 16,
  }
  streams[1] = a
  b := &stream{
    parent: nil,
    weight: 16,
  }
  streams[2] = b
  c := &stream{
    parent: nil,
    weight: 16,
  }
  streams[3] = c
  adjustStreamPriority(streams, 3, PriorityParam{
    Weight:    20,
    StreamDep: 0,
    Exclusive: true,
  })
  if a.parent != c {
    t.Errorf("Expected A's parent to be C")
  }
  if a.weight != 16 {
    t.Errorf("Expected A's weight to be 16; got %d", a.weight)
  }
  if b.parent != c {
    t.Errorf("Expected B's parent to be C")
  }
  if b.weight != 16 {
    t.Errorf("Expected B's weight to be 16; got %d", b.weight)
  }
  if c.parent != nil {
    t.Errorf("Expected C to have no parent")
  }
  if c.weight != 20 {
    t.Errorf("Expected C's weight to be 20; got %d", b.weight)
  }
}

```
###ref
Proposal for Stream Dependencies in SPDY
https://docs.google.com/document/d/1pNj2op5Y4r1AdnsG8bapS79b11iWDCStjCNHo3AWD0g/edit#

draft-ietf-httpbis-http2-15 - Hypertext Transfer Protocol version 2 - https://tools.ietf.org/html/draft-ietf-httpbis-http2-15#section-5.3
