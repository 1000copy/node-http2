##  流并发

 
对等端可以使用设置帧里面的SETTINGS_MAX_CONCURRENT_STREAMS参数来限制对等端流的并发量。

此设置仅适用于终端并且只对接收到此设置的对等端有效。

处于“打开”或者两种“半封闭”状态的流均计入终端SETTINGS_MAX_CONCURRENT_STREAMS 允许启动的流次数中。两种“保留”状态下的流不计入流打开次数中。

终端绝对不能超过对等端设定的设置。终端接收到报头帧导致他们广播的并发流超过限制的必须将这作为流错误处理。终端希望将SETTINGS_MAX_CONCURRENT_STREAMS的值减少到比当前打开的流更小时可以关闭超过新的设置值的流或者允许流结束。

## 流量控制

复用流的引入，会导致TCP连接的竞争，引发流阻塞。流量控制方案确保同一连接上的流相互之间不会造成破坏性的干扰。

流量控制在单个流及整个连接过程中使用。

HTTP/2 通过使用WINDOW_UPDATE帧类型来提供流量控制

### 流量控制规则

HTTP/2 流量控制目标在于允许不需要协议改动的情况下改进流量控制算法。HTTP/2中的流量控制有以下特点：

 1. 流量控制是逐跳的(hop-by-hop)，而不是端到端(end-to-end)连接的。
 2. 流量控制是基于窗口更新帧(WINDOW_UPDATE)的。接收端广播自己准备在流及整个连接过程中接收的字节大小。这是一个信用为基础的方案。
 3. 流量控制是有方向性的，由接收端全权掌握。接收端可以选择针对流及整个连接设置任意的窗口大小。发送端必须遵守接收端的流量控制限制。客户端、服务端及中端代理作为接收者时都独立的向外广播他们各自的流量控制窗口，作为发送者时遵守接收端的限制。
 4. 每个新的流及整个连接的流量控制窗口初始值是65,535字节。
 5. 帧类型决定了是否适用流量控制规则。本文档定义的帧中，只有DATA帧受流量控制；所有其他的帧不受广播的流量控制窗口影响。这保证了重要的控制帧不因流量控制所阻塞。
 6. 流量控制不能被禁用。

HTTP/2只标准化WINDOW_UPDATE帧格式。它没有规定接收端是何时发送帧或者发送什么值，也没有规定发送端如何选择发送包。具体实现可以选择任何满足需求的算法。具体实现还负责管理请求和响应是如何基于优先级发送的；如何避免请求头阻塞以及管理新流的创建。这些算法能够与任何流量控制算法相互作用。

### 正确使用流量控制


流量控制的定义是用来保护端点在资源约束条件下的操作。例如，一个代理需要在很多连接之间共享内存，也有可能上游连接和下游连接的速度有快有慢。

Deployments that do not require this capability can advertise a flow control window of the maximum size, incrementing the available space when new data is received. This effectively disables flow control for that receiver. Conversely, a sender is always subject to the flow control window advertised by the receiver.

不需要这种能力时可以广播一个最大值的流量控制窗口，增加接收新数据时的可用空间。发送数据时总是受接收端广播的流量控制窗口的管理 。


资源约束下(例如内存)的情况，可以使用流量来限制一个对等端可以消耗的内存数量。需要注意的是，如果在不知道带宽延迟乘积（[bandwidth-delay product][1]) 的时候启用流量控制可能导致网络的低利用率。



###  Stream priority 流优先级

新建流的终端可以在报头帧中包含优先级信息来对流标记优先级。

对于已存在的流，优先级帧可以用来改变流优先级。

优先级的目的是允许终端表达它如何让对等端管理并发流时分配资源。更重要的是，在发送容量有限时优先级能用来选择流来传输帧。

流的优先级明确设置将输入到优先级处理过程中。

优先级的表达对对等端仅仅是一个建议。它并不能保证能相当其他相关流有特殊的处理或者传输顺序。终端并不能使用优先级强制要求对等端按照特定顺序处理并发流。

### Stream Dependencies 流依赖

Each stream can be given an explicit dependency on another stream. Including a dependency expresses a preference to allocate resources to the identified stream rather than to the dependent stream.

每个流可以显式依赖别的流。包含一个依赖偏好设置表示分配资源给特定的流而不是所依赖的流。

不依赖任何流的流的流依赖为0x0。换句话说，不存在的流标识0组成了树的根。

依赖其他流的流是一个有依赖流。被依赖的流是父节点流。被依赖的流如果当前不在依赖树中——例如处于“空闲”状态的流——流将会被赋予一个默认的优先级 


当指定依赖到另一个流时，这个流将添加到父节点流的子流中。共有相同父节点的流互相之间顺序是不固定的。例如，如果B和C依赖流A,而且如果新创建的流D依赖流A,最终依赖树中的结果就是A被B,C和D以任意顺序依赖。

```
    A                 A
   / \      ==>      /|\
  B   C             B D C
```

专用标志（exclusive flag ）允许插入一个新的层级的依赖。专用标志导致插入的流成为其父节点流唯一的子节点流，使其他依赖流变成依赖此优先流。在前面这个例子中，如果D流是用专用标志在来创建依赖流A的，那么将导致D流成为了B和C的依赖父节点流。

```
                      A
    A                 |
   / \      ==>       D
  B   C              / \
                    B   C
```

在一个依赖树中，一个依赖流应该仅仅在如下条件满足时才可以被分配资源：所有其依赖的父节点流(一直到流 0x0的所有父节点流)都关闭或者无法取得进展。


流不能依赖其自身。终端必须把这种情况当作类型为PROTOCOL_ERROR的流错误 

### Dependency Weighting 依赖权重

所有有依赖的流都会被分配一个1-256(含)的整数来标识权重。


具有相同父节点的流应该根据权重比例来分配资源。因此，如果B流依赖A流，且权重是4，C流依赖A流，且权重是12，那么如果A流上不会有进展了（此时，B，C符合分配资源的条件），B流理论上将获取到相对于C流资源的三分之一。

### Reprioritization  优先级重组

流的优先级是通过使用优先级帧改变的。设置一个依赖将使流变得依赖某个特定的父节点流。

Dependent streams move with their parent stream if the parent is reprioritized. Setting a dependency with the exclusive flag for a reprioritized stream moves all the dependencies of the new parent stream to become dependent on the reprioritized stream.

如果父节点流的优先级被修改，子节点流优先级也将改变。使用专用标记来重新设置流优先级将改变所有对其有依赖的流变成对新的优先级改变的流有依赖。

If a stream is made dependent on one of its own dependencies, the formerly dependent stream is first moved to be dependent on the reprioritized stream's previous parent. The moved dependency retains its weight.

如果流被设置成依赖其子流，之前依赖这个流的所有流将首先转成依赖优先级改变的流的之前的父节点流。依赖的改变保持其权重不变。

例如，考虑原始依赖树中B和C依赖A,D和E依赖C,且F依赖D。如果A改成依赖D，那么D替换A的位置。其他所有的依赖关系保持不变，不过如果优先级修改使用的是专用标记，那么F将变成依赖A。

```
    ?                ?                ?                 ?
    |               / \               |                 |
    A              D   A              D                 D
   / \            /   / \            / \                |
  B   C     ==>  F   B   C   ==>    F   A       OR      A
     / \                 |             / \             /|\
    D   E                E            B   C           B C F
    |                                     |             |
    F                                     E             E
               (intermediate)   (non-exclusive)    (exclusive)
```

#### 优先级状态管理


当流从依赖树中移走后，依赖它的子流可以转变成依赖被关闭流的父节点流。新的依赖的权重将根据关闭流的权重以及流自身的权重重新计算。

资源在具有相同父流的流之间共享，这意味着如果这个集合中的某个流关闭或者阻塞，任何空闲容量将分配给最近的邻居流。然而，如果子流的共有依赖被从树中移除，这些子流将与上一层的流共享资源

例如，假定A流和B流共有同个父依赖，且C和D流都依赖A流。在A流移除之前，如果A和D流都无法继续进行，那么C流就会接收所有分配给流A的资源。如果A流从树中移除，流A的权重将分配给C流和D流。如果D流依旧无法进行，将导致C流获取到的资源比例变少。对于同等的初始权重，C流获取到三分之一而不是二分之一的可用资源。

如果依赖关系中的一个流存在任何相关的优先级信息被销毁，那么依赖它的流将被分配为默认的优先级。这有可能导致不理想的优先级，因为流可能被赋予一个高于预期的优先级。

为了避免这些问题，终端应该在流关闭后的一段时间内保留流优先级信息。状态被保留的时间越长，流被分配错误的或者默认的优先级值的可能性就越小。

这可能增加终端的负担，因此这种状态可以被限制。

 - 终端可能会对跟踪状态的关闭的流的个数使用一个固定的上限来限制状态溢出。
 -  终端可能根据负荷来决定保留的额外的状态的数目；
 - 在高负荷下，可以丢弃额外的优先级状态来限制资源的任务。
 - 在极端情况下，终端甚至可以丢弃激活或者保留状态流的优先级信息。
 - 如果使用了固定的限制，终端应当至少保留跟SETTINGS_MAX_CONCURRENT_STREAMS设置一样大小的流状态。


终端接收到修改状态为关闭的流的优先级帧,也应该修改依赖此流的流的优先级。