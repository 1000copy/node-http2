var expect = require('chai').expect;
var util = require('./util');

var stream = require('../lib/protocol/stream');
var Stream = stream.Stream;

function createStream() {
  var stream = new Stream(util.log, null);
  stream.upstream._window = Infinity;
  return stream;
}


// Execute a list of commands and assertions
var recorded_events = ['state', 'error', 'window_update', 'headers', 'promise'];
function execute_sequence(stream,sequence, done) {    
    

  var outgoing_frames = [];
  // 截获 emit，以便事件发生时可以把它放置到[] event内。
  var emit = stream.emit, events = [];
  stream.emit = function(name) {
    if (recorded_events.indexOf(name) !== -1) {
      events.push({ name: name, data: Array.prototype.slice.call(arguments, 1) });
    }
    // Event Redirect 事件转发，以便事件体系的运作
    return emit.apply(this, arguments);
  };
  // 构建命令commands[],checks[] 两个数组
  var commands = [], checks = [];
  sequence.forEach(function(step) {
    if ('method' in step || 'incoming' in step || 'outgoing' in step || 'wait' in step || 'set_state' in step) {
      commands.push(step);
    }

    if ('outgoing' in step || 'event' in step || 'active' in step) {
      checks.push(step);
    }
  });

  var activeCount = 0;
  function count_change(change) {
    activeCount += change;
  }

  function execute(callback) {
    var command = commands.shift();
    if (command) {
      if ('method' in command) {
        var value = stream[command.method.name].apply(stream, command.method.arguments);
        if (command.method.ret) {
          command.method.ret(value);
        }
        execute(callback);
      } else if ('incoming' in command) {
        command.incoming.count_change = count_change;
        stream.upstream.write(command.incoming);
        execute(callback);
      } else if ('outgoing' in command) {
        outgoing_frames.push(stream.upstream.read());
        execute(callback);
      } else if ('set_state' in command) {
        stream.state = command.set_state;
        execute(callback);
      } else if ('wait' in command) {
        setTimeout(execute.bind(null, callback), command.wait);
      } else {
        throw new Error('Invalid command', command);
      }
    } else {
      setTimeout(callback, 5);
    }
  }

  function check() {
    checks.forEach(function(check) {
      if ('outgoing' in check) {
        var frame = outgoing_frames.shift();
        for (var key in check.outgoing) {
          expect(frame).to.have.property(key).that.deep.equals(check.outgoing[key]);
        }
        count_change(frame.count_change);
      } else if ('event' in check) {
        var event = events.shift();
        expect(event.name).to.be.equal(check.event.name);
        check.event.data.forEach(function(data, index) {
          expect(event.data[index]).to.deep.equal(data);
        });
      } else if ('active' in check) {
        expect(activeCount).to.be.equal(check.active);
      } else {
        throw new Error('Invalid check', check);
      }
    });
    done();
  }

  setImmediate(execute.bind(null, check));
}
// test command :  mocha -g mysend
describe('mystream.js', function() {
    describe('mysend', function() {
      it('should trigger the appropriate state transitions and outgoing frames', function(done) {
        // console.log(stream);
        var stream = createStream();
        // stream.headers({ ':path': '/' });
        execute_sequence(stream,[
          { method  : { name: 'headers', arguments: [{ ':path': '/' }] } },
          { outgoing: { type: 'HEADERS', flags: { }, headers: { ':path': '/' } } },
          { event   : { name: 'state', data: ['OPEN'] } },

          { wait    : 5 },
          { method  : { name: 'end', arguments: [] } },
          { event   : { name: 'state', data: ['HALF_CLOSED_LOCAL'] } },
          { outgoing: { type: 'DATA', flags: { END_STREAM: true  }, data: new Buffer(0) } },

          { wait    : 10 },
          { incoming: { type: 'HEADERS', flags: { }, headers: { ':status': 200 } } },
          { incoming: { type: 'DATA'   , flags: { END_STREAM: true  }, data: new Buffer(5) } },
          { event   : { name: 'headers', data: [{ ':status': 200 }] } },
          { event   : { name: 'state', data: ['CLOSED'] } },
          { active  : 0 }
        ], done);
      });
    });   
});
