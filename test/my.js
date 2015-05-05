var expect = require('chai').expect;
var util = require('./util');

var framer = require('../lib/protocol/framer');
var Serializer = framer.Serializer;
var Deserializer = framer.Deserializer;

describe('my.js', function() {
  describe('scenario', function() {
    describe('connection setup', function() {
      it('should work as expected', function(done) {
       expect(1).to.be.equal(1);
       // console.log(1)
       done();
      });
    });
  });
  describe('scenario', function() {  
    it('should work as expected', function(done) {
     expect(1).to.be.equal(1);
     // console.log(1)
     done();
    });
  });
  describe('scenario', function() {  
    it('should work as expected', function(done) {
      var Transform = require('stream').Transform;
      var Stream = require('stream');
      var stream = new Stream();

      stream.pipe = function(dest) {
        dest.write('abc');
        return dest;
      };
      function createParser () {
          var parser = new Transform();
          parser._transform = function(data, encoding, done) {
              // data is Buffer object 
              this.push(data.slice(0,1));
              done();
          };
          return parser;
      }
      //  a transformer ,transmit abc to a
      var p = createParser();
      stream.pipe(p).pipe(process.stdout); 
      expect('a').to.be.equal('a');
      // console.log(1)
      done();
    });
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
     describe('1000copy:ping frame wire to object ', function() {
          it('frame cons.', function() {
            
              // length,type,flags,stream id
            var r = new Buffer('000008' + '06' + '00' + '0000000F' +   '1234567887654321', 'hex');        
            var frame = {};
            Deserializer.commonHeader(r, frame);
            expect(frame.type ,'PING');
            expect(frame.flags.ACK ,false);
            expect(frame.stream).to.deep.equal(0x0f);
          });
      });
     describe('1000copy:ping frame object to wire ', function() {
          it('frame cons.', function() {
            
              // length,type,flags,stream id
            var r = new Buffer('000008' + '06' + '00' + '0000000F' +   '1234567887654321', 'hex');                
            var f =  {
                type: 'PING',
                flags: { ACK: false },
                stream: 15,
                data: new Buffer('1234567887654321', 'hex')
              };

            var buffers = [f.data]; // pay load as buffer        
            Serializer.commonHeader(f, buffers);
            expect(buffers[0]).to.deep.equal(r.slice(0,9));        
          });
      });
     //

  describe('strerristty', function() {
    it('strerristty', function() {
      console.log("VIP abunt")
      if (process.stderr.isTTY) {
        console.log("VIP abunt")
        var path = require('path');                
        var fs = require('fs');
        var spawn = require('child_process').spawn;
        console.log(path.dirname(require.resolve('bunyan')))
        var bin = path.resolve(path.dirname(require.resolve('bunyan')), '..', 'bin', 'bunyan');

        if(bin && fs.existsSync(bin)) {
          console.log(bin)
          logOutput = spawn(bin, ['-o', 'short'], {
            stdio: [null, process.stderr, process.stderr]
          }).stdin;
        }
      }
    })
  })
  describe('tls', function() {
    it('tls', function() {      
     var fs = require('fs');
        var path = require('path');
        var tls = require('tls');
        tls.createServer({
          key: fs.readFileSync("example/localhost.key"),
          cert: fs.readFileSync("example/localhost.crt"),
          NPNProtocols: ['h2', 'http 1.1','http 1.0']
        }, function(socket) {
          console.log("s1:"+socket.npnProtocol);
        }).listen(1111);
        //client
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      tls.connect({ port: 1111 }, function() {
          // console.log(this.npnProtocol);
      });
      tls.connect({ port: 1111 ,NPNProtocols: ['h2'] }, function() {
          // console.log(this.npnProtocol);        
      });
      tls.connect({ port: 1111, NPNProtocols: ['http 1.1'] }, function() {
          // console.log(this.npnProtocol);          
      });      
      tls.connect({ port: 1111, NPNProtocols: ['http 1.0'] }, function() {
          // console.log(this.npnProtocol);
      });
    })
  })

  

    describe('parse', function() {
      it('urlparse', function() {
          var url = require('url');
          var options = "https://localhost:8080/server.js"
          if (typeof options === "string") {
            options = url.parse(options);
            expect(options.hostname).to.be.equal("localhost")
            expect(options.port).to.be.equal("8080")
          }   
      });
    });
    // http://stackoverflow.com/questions/5055746/cloning-an-object-in-node-js
    describe('cloneobject by util._extend', function() {
      it('failure', function() {
            var obj1 = {x: 5, y:5};
            var obj2 = obj1;
            obj2.x = 6;
            expect(obj1.x).to.be.equal(6); 

      });
      it('itwork', function() {
            var util = require('util');
            var obj1 = {x: 5, y:5};
            var obj2 = util._extend({},obj1);
            obj2.x = 6;
            expect(obj1.x).to.be.equal(5); 
      });
      it('!!', function() {
            expect(!!false).to.be.equal(false); 
      });
    });
    /*
    问题：
        注意到了 
            [2015-05-05T02:28:00.564Z]  INFO: myapp/2784 on lcj-PC: json object by customer formatter(e=1,s=2)
        
        之类的log，不知道如何做的？

        也留意到有些js文件的最后又一个bunyan serializers,很困惑他们在做什么？
    方法：研究bunyan https://github.com/trentm/node-bunyan#serializers
    并自己写了unit test。

    Serializers:
        Bunyan has a concept of "serializers" to produce a JSON-able object from a JavaScript object, so you can easily do the following:

        log.info({req: <request object>}, 'something about handling this request');
        Serializers is a mapping of log record field name, "req" in this example, to a serializer function. That looks like this:

        function reqSerializer(req) {
            return {
                method: req.method,
                url: req.url,
                headers: req.headers
            }
        }
        var log = bunyan.createLogger({
            name: 'myapp',
            serializers: {
                req: reqSerializer
            }
        });
        Or this:

        var log = bunyan.createLogger({
            name: 'myapp',
            serializers: {req: bunyan.stdSerializers.req}
        });
        because Bunyan includes a small set of standard serializers. To use all the standard serializers you can use:

        var log = bunyan.createLogger({
          ...
          serializers: bunyan.stdSerializers
        });

        unit test

        [2015-05-05T02:28:00.564Z]  INFO: myapp/2784 on lcj-PC: json object by customer formatter
        obj: {
          "a": 1,
          "b": 2
        }
        [2015-05-05T02:28:00.566Z]  INFO: myapp/2784 on lcj-PC: inline object by customer formatter (obj=1)
        [2015-05-05T02:28:00.566Z]  INFO: myapp/2784 on lcj-PC: normal object by internal formatter
            NonFormatter: {
              "a": 1,
              "b": 2,
              "c": 3
            }      
    */

    describe('formatter1', function() {
      it('formatter', function() {
          var obj = {"a":1,"b":2,"c":3}
          function formatter(obj) {
              return {
                  a:obj.a,
                  b:obj.b
              }
          }
          function formatter_inline(obj) {
              return obj.a
          }
          var bunyan = require('bunyan');
          {
            var log = bunyan.createLogger({
                name: 'myapp',
                serializers: {
                    obj: formatter
                },
                level:"info"
            });
            log.info({obj:obj},"json object by customer formatter")
          }
          {
            var log = bunyan.createLogger({
                name: 'myapp',
                serializers: {
                    obj: formatter_inline
                },
                level:"info"
            });
            //////////obj:名字为serialize 。很重要，随便写效果不同
            log.info({obj:obj},"inline object by customer formatter")
            log.info({"NonFormatter":obj},"normal object by internal formatter")
          }
          // log.child
          /*
          to create a new logger with additional bound fields that will be included in its log records. 
          A child logger is created with log.child(...).
          In the following example, logging on a "Wuzzle" instance's this.log will be exactly as on the parent logger with 
          the addition of the widget_type field:
          */
          {
            var bunyan = require('bunyan');
            var log = bunyan.createLogger({name: 'myapp'});
            function Wuzzle(options) {
                this.log = options.log.child({widget_type: 'wuzzle'});
                this.log.info('creating a wuzzle')
            }
            Wuzzle.prototype.woos = function () {
                this.log.warn('This wuzzle is woosey.')
            }

            log.info('start');
            var wuzzle = new Wuzzle({log: log});
            wuzzle.woos();
            log.info('done');
          }
      });
    });

    //
    describe('callNTimes', function() {
          it('callNTimes2', function() {
            // // callNTimes 指定 done 函数在第limit此调用后，才真的执行。有点费解。
            function callNTimes(limit, done) {
              if (limit === 0) {
                done();
              } else {
                var i = 0;
                return function() {
                  i += 1;
                  if (i === limit) {
                    done();
                  }
                };
              }
            };
            function inviteVIP ()         {
              console.log("VIP abunt")
            }
            inviteVIP = callNTimes(3,inviteVIP);
            inviteVIP();// 什么也不做，只是累记
            inviteVIP();// 什么也不做，只是累记
            inviteVIP();// 累计到3，执行原函数             
          });
      });
  });
});


        