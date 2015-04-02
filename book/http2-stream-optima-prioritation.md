谈及http/2，大家都会认为多播、服务器推送是最重要的。可是优先级调度一样非常关键。尽管客户端请求可以通过多播一次发出，服务器相应也可以通过多播，推送提高带宽利用率，然而，不分主次的使用，很可能会导致页面加载时间更长。因为高优先级的资源本应优先传递，却因为多播而必须和低优先级资源竞争，导致整体延误。

曾有人以spdy协议做过实验[1]，准备：
1. 服务器启用spdy
2. 客户端关闭 webkit的资源加载调度特性( ResourceLoadScheduler)， 不在节流，而是立刻发送全部请求

这样，本来由客户端做的节流以便调度优先级，转化为由支持SPDY服务器来做调度。加上多播和压缩，期望是会带来性能提升的。然而事与愿违：这样做的结果比起单纯的HTTP实际上是更慢了。细究发现，实验服务器（ngnix beta）并没有做优先级管理。目前，nginx的SPDY并不完善的，却被贸然的相对广泛的采用。

为什么说http/2，却以spdy举例？因为spdy就是http/2的前身，并且一直并行演化中。

###动机

基于http实现的browser，采用的是对低优先级资源节流的做法，避免在高优先级资源没有完成前被低优先级资源挤占了带宽。

这样做是合理的，但是也带来了问题——就是在启动连接到文档的dom装入之间对带宽的利用不足：即使关键资源准备时间很长，网络再空闲，期间也不可以传递其他低优先级资源。

为了充分利用带宽，考虑到http2是多播的，这样的想法就是合理的了：客户端解析html后获知的全部资源，设定好资源（流）优先级，一次性发出给服务器。这样，优先级的调度就到了服务器一侧：不再由客户端通过节流的方式来体现优先级，而是把优先级作为一个提示，发给服务器，由服务器来完成最终的优先级调度。

服务器的做法可以有很多。简单幼稚的一个可行实现，就是按照优先级信息排出队列，次序做出响应即可。当然，http/2的实际做法采用的是依赖树算法（后面会细化此算法）。

尽管优先级信息看起来应该是一个代表优先级高低的数字字段，但是这样的认识实际上是一个误解。优先级信息不是一个数字字段，而是3个字段。认识到这个误解的可能存在对于理解以下内容是非常重要的。

http2 客户端发送新建的流和现有流的依赖关系和依赖权重建议给服务器，以及对现有流调整依赖关系和依赖权重的建议给服务器，由服务器根据这些信息来构建依赖流的关系树，然后由这个依赖树来决定为每个流确定发送次序以及分配计算资源，从而完成对流定优先级的效果。

比起直接了当的单一优先级数值，采用依赖流+权重的方式，可以更好的表达浏览器渲染约束需要的依赖关系。渲染一个页面本身就是一个资源传递依赖的过程。比如脚本会阻塞html的解析，最终的布局依赖于外部的样式表。

###依赖树的构建

和优先级有关的Frame有两种，分别为 HEADER,PRIORITATION 。新建流的终端可以在HEADER中包含优先级信息来对流标记优先级。对于已存在的流，PRIORITATION可以用来改变流优先级。


这些字段是：

- **E** ： 1位的标记用于标识流依赖是否是专用的。可选。
- **Stream Dependency** ： StreamID。31位流 .可选。
- **Weight** : 流的8位权重标记。添加一个1-256的值来存储流的权重。

对于HEADER,PRIORITATION而言，这3个字段都是可选的，标志 Flags:PRIORITY 设置表明此3个字段存在与否。


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

这样的情况，如今是如何传输的呢？index.html被接收然后解析，文档解析器(Document Parser)会发现a.js,发出请求并且被阻塞；接下来，探测解析器（Speculative Parser ),继续探测发现a.jpg,b.jpg,style.css 并向服务器发出资源请求，然后a.js获得并被解析执行，发现依赖b.js,然后发出b.js资源请求，然后文档解析器再次被阻塞... 。如图：

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

分析完毕，结论也就出来了：非常低效。唯有style.css,b.js完成，整个页面才完成加载，而关键的b.js因为被其他不重要的资源（img）竞争而传递缓慢。

采用了优先级帧（PRIORITITION)，依赖树算法，并发技术的http2，有可能改善这样情况，只要适合加入 PRIORITITION 帧，按照依赖算法计算优先级即可。


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

webkit的ResourceLoadSchedule，就是首先载入影响绘制的html，js，css，第一次绘制完毕，dom加载完成，才放出更多的资源（如img）请求。

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
[1]. Proposal for Stream Dependencies in SPDY
https://docs.google.com/document/d/1pNj2op5Y4r1AdnsG8bapS79b11iWDCStjCNHo3AWD0g/edit#

[2].  draft-ietf-httpbis-http2-15 - Hypertext Transfer Protocol version 2 - https://tools.ietf.org/html/draft-ietf-httpbis-http2-15#section-5.3

[3]. Prioritization Is Critical To SPDY - Insouciant - https://insouciant.org/tech/prioritization-is-critical-to-spdy/