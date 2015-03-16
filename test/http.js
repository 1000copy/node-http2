var expect = require('chai').expect;
var util = require('./util');
var fs = require('fs');
var path = require('path');

var http2 = require('../lib/http');
var https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var options = {
  key: fs.readFileSync(path.join(__dirname, '../example/localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, '../example/localhost.crt')),
  log: util.serverLog
};

http2.globalAgent = new http2.Agent({ log: util.clientLog });

describe('http.js', function() {
  describe('Server', function() {
    describe('new Server(options)', function() {
      it('should throw if called without \'plain\' or TLS options', function() {
        expect(function() {
          new http2.Server();
        }).to.throw(Error);
        expect(function() {
          http2.createServer(util.noop);
        }).to.throw(Error);
      });
    });
    // 1000copy : server.timeout ,server._server.timeout ,why backup required?
    describe('property `timeout`', function() {
      it('should be a proxy for the backing HTTPS server\'s `timeout` property', function() {
        var server = new http2.Server(options);
        var backingServer = server._server;
        var newTimeout = 10;
        server.timeout = newTimeout;
        expect(server.timeout).to.be.equal(newTimeout);
        expect(backingServer.timeout).to.be.equal(newTimeout);
      });
    });
    //  1000copy ： so as setTimeout ?
    describe('method `setTimeout(timeout, [callback])`', function() {
      it('should be a proxy for the backing HTTPS server\'s `setTimeout` method', function() {
        var server = new http2.Server(options);
        var backingServer = server._server;
        var newTimeout = 10;
        var newCallback = util.noop;
        backingServer.setTimeout = function(timeout, callback) {
          expect(timeout).to.be.equal(newTimeout);
          expect(callback).to.be.equal(newCallback);
        };
        server.setTimeout(newTimeout, newCallback);
      });
    });
  });
  describe('Agent', function() {
    describe('property `maxSockets`', function() {
      it('should be a proxy for the backing HTTPS agent\'s `maxSockets` property', function() {
        var agent = new http2.Agent({ log: util.clientLog });
        var backingAgent = agent._httpsAgent;
        var newMaxSockets = backingAgent.maxSockets + 1;
        agent.maxSockets = newMaxSockets;
        expect(agent.maxSockets).to.be.equal(newMaxSockets);
        expect(backingAgent.maxSockets).to.be.equal(newMaxSockets);
      });
    });
    describe('method `request(options, [callback])`', function() {
      it('should throw when trying to use with \'http\' scheme', function() {
        expect(function() {
          var agent = new http2.Agent({ log: util.clientLog });
          agent.request({ protocol: 'http:' });
        }).to.throw(Error);
      });
    });
  });
  //  fallback : 可依靠的东西，退却； 回降物 
  describe('OutgoingRequest', function() {
    function testFallbackProxyMethod(name, originalArguments, done) {
      var request = new http2.OutgoingRequest();

      // When in HTTP/2 mode, this call should be ignored
      request.stream = { reset: util.noop };
      request[name].apply(request, originalArguments);
      delete request.stream;

      // When in fallback mode, this call should be forwarded
      request[name].apply(request, originalArguments);
      var mockFallbackRequest = { on: util.noop };
      mockFallbackRequest[name] = function() {
        expect(Array.prototype.slice.call(arguments)).to.deep.equal(originalArguments);
        done();
      };
      request._fallback(mockFallbackRequest);
    }
    describe('method `setNoDelay(noDelay)`', function() {
      it('should act as a proxy for the backing HTTPS agent\'s `setNoDelay` method', function(done) {
        testFallbackProxyMethod('setNoDelay', [true], done);
      });
    });
    describe('method `setSocketKeepAlive(enable, initialDelay)`', function() {
      it('should act as a proxy for the backing HTTPS agent\'s `setSocketKeepAlive` method', function(done) {
        testFallbackProxyMethod('setSocketKeepAlive', [true, util.random(10, 100)], done);
      });
    });
    describe('method `setTimeout(timeout, [callback])`', function() {
      it('should act as a proxy for the backing HTTPS agent\'s `setTimeout` method', function(done) {
        testFallbackProxyMethod('setTimeout', [util.random(10, 100), util.noop], done);
      });
    });
    describe('method `abort()`', function() {
      it('should act as a proxy for the backing HTTPS agent\'s `abort` method', function(done) {
        testFallbackProxyMethod('abort', [], done);
      });
    });
  });
  describe('OutgoingResponse', function() {
    it('should throw error when writeHead is called multiple times on it', function() {
      var called = false;
      var stream = { _log: util.log, headers: function () {
        if (called) {
          throw new Error('Should not send headers twice');
        } else {
          called = true;
        }
      }, once: util.noop };
      var response = new http2.OutgoingResponse(stream);

      response.writeHead(200);
      response.writeHead(404);
    });
  });
  describe('test scenario', function() {
    describe('simple request', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'Hello world';
        // so deep call stack !
        // CreateServer 创建一个TCP server:_server 。然后，callback何时调用？
          //  挂接 callback 到Server.Event(request)
          //  server.request 何时emit ?
          //  _start 方法内，代码：
          //  request.once('ready', self.emit.bind(self, 'request', request, response));
          // 那么 ，request.ready 何时fire？
          //  IncomingRequest Class ,function _startHeader ,last line : this.emit('ready');
          // 那么 IncomingRequest._onHeader 何时调用？
          // IncomingRequest HIHERIED IncomingMessage,so 那么 IncomingRequest._onHeader === IncomingMessage._onHeader 
          // 挂接在stream.headers , stream.once('headers', this._onHeaders.bind(this)); OF function IncomingMessage(stream) {}
          // TO stream._onHeaders
        // have a rest !!!
        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          //  response.end 最终调用的是stream.end 方法：
          // Call this method when no more data will be written to the stream.
          // If supplied, the callback is attached as a listener on the finish event.
          response.end(message);
        });

        server.listen(1234, function() {
          // TODO:what ' happen in http2.get ?
          http2.get('https://localhost:1234' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              server.close();
              done();
            });
          });
        });
      });
    });
    describe('2 simple request in parallel', function() {
      it('should work as expected', function(originalDone) {
        var path = '/x';
        var message = 'Hello world';
        done = util.callNTimes(2, function() {
          server.close();
          originalDone();
        });

        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          response.end(message);
        });

        server.listen(1234, function() {
          http2.get('https://localhost:1234' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
          });
          http2.get('https://localhost:1234' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
          });
        });
      });
    });
    describe('100 simple request in a series', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'Hello world';

        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          response.end(message);
        });

        var n = 100;
        server.listen(1242, function() {
          doRequest();
          function doRequest() {
            http2.get('https://localhost:1242' + path, function(response) {
              response.on('data', function(data) {
                expect(data.toString()).to.equal(message);
                if (n) {
                  n -= 1;
                  doRequest();
                } else {
                  server.close();
                  done();
                }
              });
            });
          }
        });
      });
    });
    describe('request with payload', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'Hello world';

        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          request.once('data', function(data) {
            expect(data.toString()).to.equal(message);
            response.end();
          });
        });

        server.listen(1240, function() {
          var request = http2.request({
            host: 'localhost',
            port: 1240,
            path: path
          });
          request.write(message);
          request.end();
          request.on('response', function() {
            server.close();
            done();
          });
        });
      });
    });
    describe('request with custom status code and headers', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'Hello world';
        var headerName = 'name';
        var headerValue = 'value';

        var server = http2.createServer(options, function(request, response) {
          // Request URL and headers
          expect(request.url).to.equal(path);
          expect(request.headers[headerName]).to.equal(headerValue);

          // A header to be overwritten later
          response.setHeader(headerName, 'to be overwritten');
          expect(response.getHeader(headerName)).to.equal('to be overwritten');

          // A header to be deleted
          response.setHeader('nonexistent', 'x');
          response.removeHeader('nonexistent');
          expect(response.getHeader('nonexistent')).to.equal(undefined);

          // Don't send date
          response.sendDate = false;

          // Specifying more headers, the status code and a reason phrase with `writeHead`
          var moreHeaders = {};
          moreHeaders[headerName] = headerValue;
          response.writeHead(600, 'to be discarded', moreHeaders);
          expect(response.getHeader(headerName)).to.equal(headerValue);

          // Empty response body
          response.end(message);
        });

        server.listen(1239, function() {
          var headers = {};
          headers[headerName] = headerValue;
          var request = http2.request({
            host: 'localhost',
            port: 1239,
            path: path,
            headers: headers
          });
          request.end();
          request.on('response', function(response) {
            expect(response.headers[headerName]).to.equal(headerValue);
            expect(response.headers['nonexistent']).to.equal(undefined);
            expect(response.headers['date']).to.equal(undefined);
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              server.close();
              done();
            });
          });
        });
      });
    });
    describe('request over plain TCP', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'Hello world';

        var server = http2.raw.createServer({
          log: util.serverLog
        }, function(request, response) {
          expect(request.url).to.equal(path);
          response.end(message);
        });

        server.listen(1237, function() {
          var request = http2.raw.request({
            plain: true,
            host: 'localhost',
            port: 1237,
            path: path
          }, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              server.close();
              done();
            });
          });
          request.end();
        });
      });
    });
    describe('get over plain TCP', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'Hello world';

        var server = http2.raw.createServer({
          log: util.serverLog
        }, function(request, response) {
          expect(request.url).to.equal(path);
          response.end(message);
        });

        server.listen(1237, function() {
          var request = http2.raw.get('http://localhost:1237/x', function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              server.close();
              done();
            });
          });
          request.end();
        });
      });
    });
    describe('request to an HTTPS/1 server', function() {
      it('should fall back to HTTPS/1 successfully', function(done) {
        var path = '/x';
        var message = 'Hello world';

        var server = https.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          response.end(message);
        });

        server.listen(5678, function() {
          http2.get('https://localhost:5678' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
          });
        });
      });
    });
    describe('2 parallel request to an HTTPS/1 server', function() {
      it('should fall back to HTTPS/1 successfully', function(originalDone) {
        var path = '/x';
        var message = 'Hello world';
        done = util.callNTimes(2, function() {
          server.close();
          originalDone();
        });

        var server = https.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          response.end(message);
        });

        server.listen(6789, function() {
          http2.get('https://localhost:6789' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
          });
          http2.get('https://localhost:6789' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
          });
        });
      });
    });
    describe('HTTPS/1 request to a HTTP/2 server', function() {
      it('should fall back to HTTPS/1 successfully', function(done) {
        var path = '/x';
        var message = 'Hello world';

        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          response.end(message);
        });

        server.listen(1236, function() {
          https.get('https://localhost:1236' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
          });
        });
      });
    });
    describe('two parallel request', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'Hello world';

        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          response.end(message);
        });

        server.listen(1237, function() {
          done = util.callNTimes(2, done);
          // 1. request
          http2.get('https://localhost:1237' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
          });
          // 2. request
          http2.get('https://localhost:1237' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
          });
        });
      });
    });
    describe('two subsequent request', function() {
      it('should use the same HTTP/2 connection', function(done) {
        var path = '/x';
        var message = 'Hello world';

        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          response.end(message);
        });

        server.listen(1238, function() {
          // 1. request
          http2.get('https://localhost:1238' + path, function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);

              // 2. request
              http2.get('https://localhost:1238' + path, function(response) {
                response.on('data', function(data) {
                  expect(data.toString()).to.equal(message);
                  done();
                });
              });
            });
          });
        });
      });
    });
    describe('request and response with trailers', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'Hello world';
        var requestTrailers = { 'content-md5': 'x' };
        var responseTrailers = { 'content-md5': 'y' };

        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          request.on('data', util.noop);
          request.once('end', function() {
            expect(request.trailers).to.deep.equal(requestTrailers);
            response.write(message);
            response.addTrailers(responseTrailers);
            response.end();
          });
        });

        server.listen(1241, function() {
          var request = http2.request('https://localhost:1241' + path);
          request.addTrailers(requestTrailers);
          request.end();
          request.on('response', function(response) {
            response.on('data', util.noop);
            response.once('end', function() {
              expect(response.trailers).to.deep.equal(responseTrailers);
              done();
            });
          });
        });
      });
    });
    describe('2000serverpush', function() {
      it('should work as expected', function(done) {
        var path = '/x';
        var message = 'server response';
        var pushedPath = '/y';
        var pushedMessage = 'promise 1';
        var pushedPath1 = '/y';
        var pushedMessage1 = 'promise 2';
        var server = http2.createServer(options, function(request, response) {
          expect(request.url).to.equal(path);
          var push1 = response.push('/y');
          push1.end(pushedMessage);
          var push2 = response.push({ path: '/z', protocol: 'https:' });
          push2.end(pushedMessage1);
          response.end(message);
        });

        server.listen(1235, function() {
          //  http2.get 
          //  Agent.get 
          //  Agent.request & Agent.end 
          //  OutgoingRequest.prototype._start 
          //  this.stream.headers(headers);
          //      * **headers(headers)**: send headers
          /*
                  Stream.prototype.headers = function headers(headers) {
                    this._pushUpstream({
                      type: 'HEADERS',
                      flags: {},
                      stream: this.id,
                      headers: headers
                    });
                  };
          */
          // this.upstream.push(frame);//注意this.upstream 是Flow 对象，而不是Stream
          // 
          // this._writeUpstream ; 因为 
          //        _initializeDataFlow()...this.upstream.write = this._writeUpstream.bind(this);
          // frame 进入流，就开始Serialize 干活了

          /*
         
          */  
          var request = http2.get('https://localhost:1235' + path);
          done = util.callNTimes(5, done);

          request.on('response', function(response) {
            response.on('data', function(data) {
              expect(data.toString()).to.equal(message);
              done();
            });
            response.on('end', done);
          });

          request.on('push', function(promise) {
            // expect(promise.url).to.be.equal(pushedPath);
            promise.on('response', function(pushStream) {
              pushStream.on('data', function(data) {
                // expect(data.toString()).to.equal(pushedMessage);
                done();
              });
              pushStream.on('end', done);
            });
          });
        });
      });
    });
    // DESCRIBE
    // mocha -g new1 
    describe('new1', function() {
      it('2', function(done) {
         var request = http2.get('https://localhost:1235' + path);
        done();
      });
    });
  });
});
