var expect = require('chai').expect;
var util = require('./util');

describe('EventEmitter', function() {
  it('emitter1', function(done) {
      var E = require('events').EventEmitter;
      var e = new E;
      e.on('a',function(){})
      e.emit('a')
      done();          
  });
  it('emitter2', function(done) {
      var EventEmitter = require('events').EventEmitter;
      function Dummy() {              
          EventEmitter.call(this);              
      }          
      Dummy.prototype = Object.create(EventEmitter.prototype, { constructor: { value: Dummy } });
      Dummy.prototype.dosth = function(){
        this.emit("a",this)
      }
      function Dummy1() {              
          Dummy.call(this);              
      }          
      Dummy1.prototype = Object.create(Dummy.prototype, { constructor: { value: Dummy1 } });
      Dummy1.prototype.dosth1 = function(){
        this.emit("b",this)
      }
      var d = new Dummy1();
      // 原来以为emit之后堆栈就乱，无法知道事件代码的上下文。实际上，可以的。console.trace会告诉我。
      d.on("a",function(o){expect(o.constructor.name).to.equal("Dummy1");})
      d.on("b",function(o){expect(o.constructor.name).to.equal("Dummy1");})
      // console.log(d)
      expect(typeof d._events.a).to.equal("function")
      expect(typeof d._events.b).to.equal("function")          
      d.dosth();
      d.dosth1();             
      done();
  });      
  it('e3', function _foo(done) {
      var EventEmitter = require('events').EventEmitter;
      var e = new EventEmitter;
      e.on('a',e.emit.bind(e,"b",1))      
      e.on("b",function(n){
        expect(n).to.equal(1);
        // console.trace();
      })
      e.emit('a')
      done();
      // 堆栈跟踪还是有用的。即使有很多event ,emit 的情况下
      /*
        at EventEmitter.<anonymous> (C:\Users\lcj\Documents\GitHub\node-http2\test\events.js:43:58)//执行到代码行43
        at EventEmitter.emit (events.js:95:17)
        at EventEmitter.emit (events.js:92:17) //经过两次emit
        at Context._foo (C:\Users\lcj\Documents\GitHub\node-http2\test\events.js:44:9) // 从_Foo开始，
      */
  });      
});