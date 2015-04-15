### project node-http2 bird eye view

协议是灰色的，代码之树常青。

所以我选择了[node-http2](https://github.com/molnarg/node-http2)，它是一个http/2的实现。并把它作为http/2协议研究过程中的伴侣。

在研究前期，我[folk](https://github.com/1000copy/node-http2)了node-http2 ，在那会儿实现的http/2 还在draft 16(第16草稿）,如今已经是h2 final了。

node-http并非是唯一的选择(那是当然)，c，c++，java也都有，完整的列表在这里 （https://github.com/http2/http2-spec/wiki/Implementations）, 由 [Mark Nottingham](http://en.wikipedia.org/wiki/Mark_Nottingham)维护管理。

选择node-http2的原因是，我希望把之前对javascript的关注，转为为采纳为工作中的一部。而刚好这个工程还有不错的测试用例，以及运行日志（logger支持），依我看，一门动态语言，本来就缺乏IDE和DEBUGGER的支持，倘若没有testcase,logger，无论是阅读理解，还是修改进步，都是非常困难的，原始的开发者也是缺少质量意识的，因此是不值得认真关注的。

### 测试用例

说到测试用例，node-http2采纳的是[mocha](http://mochajs.org/)，一个BDD的框架。运行起来的方式非常简单。

```
  $ npm install 
  $ npm install -g mocha 
  $ mocha
```

然后可以看到一堆黑白的输出，很多绿色的 √ 。看着身心舒畅。

```
   compressor.js
    HuffmanTable
      method encode(buffer)
        √ should return the Huffman encoded version of the input buffer
      method decode(buffer)
        √ should return the Huffman decoded version of the input buffer
  ...
```

### logger

分析js写的代码，咋一看简单。可是，面对浓眉大眼、貌似忠良的家伙，可贵之处在于应该保持一分警惕之心。

确实如此，语言的妖艳，必然导致库的灵活，惯用法的泛滥。流程跳转的灵活，完全超出想象。

且，node缺乏一个良好的，集成的调试工具，尽管并非毫无[希望](http://stackoverflow.com/questions/1911015/how-to-debug-node-js-applications)。这样logger即变得不可或缺（即便有高级的调试工具，logger也不可或缺，特别是对服务器应用）。

node-http2使用了[bunyan](https://github.com/trentm/node-bunyan),启用并看到bunyan的输出，只要设置一个环境变量

  $set HTTP2_LOG=debug

代码中有不少我的标注，其中有赞赏，有愤恨，有恍然大悟，也有行走于CallStack中的艰辛。那是我的感情，和它们融为一起。

### 惯用法

关于惯用法，这次集中的遇到的区域，正是Node的Stream。

node-http2大量的使用stream。Deplux，Passthrough,Transform竞相登场。各种相似却用途迥异的方法（嗯，还是分个组）：

  read,_read,_send ,
  write,_write,_receive,
  push,_push,_parentPush 

和调用交织起来，Brain Fucker 。很多次，我有时候分析到7-8层堆栈后，发现自己在代码的森林中迷路了。几度想要放弃，查看那个http implements 清单，想要从一门比较刻板的语言重新开始。终于我知道，我需要恶补下node stream的知识。


bunyan 本意应该取自bunyan，作家，作品为<天路历程>。回到作为logger的bunyan，官方文档就很简单，我做了一个更加简单的[小抄](node-bunyan-cheatsheet.md)

### cmder

没有了ide，我就得裸露在命令行的面前。并且，我常常使用windows，它的命令行实在是令人欲仙欲死。所以，尽管有点离题，我还是满怀兴奋的对cmder加上一笔。实在舒服，特别是需要拷贝粘贴的时候。


有了这样的基础又基础的知识，阅读node-http2可以减少些许痛苦。