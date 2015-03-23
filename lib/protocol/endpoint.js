var assert = require('assert');

var Serializer   = require('./framer').Serializer;
var Deserializer = require('./framer').Deserializer;
var Compressor   = require('./compressor').Compressor;
var Decompressor = require('./compressor').Decompressor;
var Connection   = require('./connection').Connection;
var Duplex       = require('stream').Duplex;
var Transform    = require('stream').Transform;

exports.Endpoint = Endpoint;

// The Endpoint class
// ==================

// Public API
// ----------

// - **new Endpoint(log, role, settings, filters)**: create a new Endpoint.
//
//   - `log`: bunyan logger of the parent
//   - `role`: 'CLIENT' or 'SERVER'
//   - `settings`: initial HTTP/2 settings
//   - `filters`: a map of functions that filter the traffic between components (for debugging or
//     intentional failure injection).
//
//     Filter functions get three arguments:
//     1. `frame`: the current frame
//     2. `forward(frame)`: function that can be used to forward a frame to the next component
//     3. `done()`: callback to signal the end of the filter process
//
//     Valid filter names and their position in the stack:
//     - `beforeSerialization`: after compression, before serialization
//     - `beforeCompression`: after multiplexing, before compression
//     - `afterDeserialization`: after deserialization, before decompression
//     - `afterDecompression`: after decompression, before multiplexing
//
// * **Event: 'stream' (Stream)**: 'stream' event forwarded from the underlying Connection
//
// * **Event: 'error' (type)**: signals an error
//
// * **createStream(): Stream**: initiate a new stream (forwarded to the underlying Connection)
//
// * **close([error])**: close the connection with an error code

// Constructor
// -----------

// The process of initialization:
function Endpoint(log, role, settings, filters) {
  Duplex.call(this);

  // * Initializing logging infrastructure
  this._log = log.child({ component: 'endpoint', e: this });

  // * First part of the handshake process: sending and receiving the client connection header
  //   prelude.
  // prelude : 序曲，前奏
  assert((role === 'CLIENT') || role === 'SERVER');
  if (role === 'CLIENT') {
    this._writePrelude();
  } else {
    this._readPrelude();
  }

  // * Initialization of component. This includes the second part of the handshake process:
  //   sending the first SETTINGS frame. This is done by the connection class right after
  //   initialization.
  this._initializeDataFlow(role, settings, filters || {});

  // * Initialization of management code.
  this._initializeManagement();

  // * Initializing error handling.
  this._initializeErrorHandling();
}
// 继承与Deplex。双工通道
Endpoint.prototype = Object.create(Duplex.prototype, { constructor: { value: Endpoint } });

// Handshake
// ---------

var CLIENT_PRELUDE = new Buffer('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n');

// Writing the client header is simple and synchronous.
Endpoint.prototype._writePrelude = function _writePrelude() {
  this._log.debug('Sending the client connection header prelude.');
  this.push(CLIENT_PRELUDE);
};

// The asynchronous process of reading the client header:
Endpoint.prototype._readPrelude = function _readPrelude() {
  // * progress in the header is tracker using a `cursor`
  var cursor = 0;

  // * `_write` is temporarily replaced by the comparator function
  this._write = function _temporalWrite(chunk, encoding, done) {
    // * which compares the stored header with the current `chunk` byte by byte and emits the
    //   'error' event if there's a byte that doesn't match
    var offset = cursor;
    while(cursor < CLIENT_PRELUDE.length && (cursor - offset) < chunk.length) {
      if (CLIENT_PRELUDE[cursor] !== chunk[cursor - offset]) {
        this._log.fatal({ cursor: cursor, offset: offset, chunk: chunk },
                        'Client connection header prelude does not match.');
        this._error('handshake', 'PROTOCOL_ERROR');
        return;
      }
      cursor += 1;
    }

    // * if the whole header is over, and there were no error then restore the original `_write`
    //   and call it with the remaining part of the current chunk
    if (cursor === CLIENT_PRELUDE.length) {
      this._log.debug('Successfully received the client connection header prelude.');
      delete this._write;
      chunk = chunk.slice(cursor - offset);
      this._write(chunk, encoding, done);
    }
  };
};

// Data flow
// ---------

//     +---------------------------------------------+
//     |                                             |
//     |   +-------------------------------------+   |
//     |   | +---------+ +---------+ +---------+ |   |
//     |   | | stream1 | | stream2 | |   ...   | |   |
//     |   | +---------+ +---------+ +---------+ |   |
//     |   |             connection              |   |
//     |   +-------------------------------------+   |
//     |             |                 ^             |
//     |        pipe |                 | pipe        |
//     |             v                 |             |
//     |   +------------------+------------------+   |
//     |   |    compressor    |   decompressor   |   |
//     |   +------------------+------------------+   |
//     |             |                 ^             |
//     |        pipe |                 | pipe        |
//     |             v                 |             |
//     |   +------------------+------------------+   |
//     |   |    serializer    |   deserializer   |   |
//     |   +------------------+------------------+   |
//     |             |                 ^             |
//     |     _read() |                 | _write()    |
//     |             v                 |             |
//     |      +------------+     +-----------+       |
//     |      |output queue|     |input queue|       |
//     +------+------------+-----+-----------+-------+
//                   |                 ^
//            read() |                 | write()
//                   v                 |

function createTransformStream(filter) {
  var transform = new Transform({ objectMode: true });
  var push = transform.push.bind(transform);
  transform._transform = function(frame, encoding, done) {
    filter(frame, push, done);
  };
  return transform;
}

function pipeAndFilter(stream1, stream2, filter) {
  if (filter) {
    stream1.pipe(createTransformStream(filter)).pipe(stream2);
  } else {
    stream1.pipe(stream2);
  }
}

Endpoint.prototype._initializeDataFlow = function _initializeDataFlow(role, settings, filters) {
  var firstStreamId, compressorRole, decompressorRole;
  if (role === 'CLIENT') {
    firstStreamId = 1;
    compressorRole = 'REQUEST';
    decompressorRole = 'RESPONSE';
  } else {
    firstStreamId = 2;
    compressorRole = 'RESPONSE';
    decompressorRole = 'REQUEST';
  }

  this._serializer   = new Serializer(this._log);
  this._deserializer = new Deserializer(this._log);
  this._compressor   = new Compressor(this._log, compressorRole);
  this._decompressor = new Decompressor(this._log, decompressorRole);
  this._connection   = new Connection(this._log, firstStreamId, settings);
  // 到了 EndPoint (this)，先序列化，在压缩，在到connection流上
  pipeAndFilter(this._connection, this._compressor, filters.beforeCompression);
  pipeAndFilter(this._compressor, this._serializer, filters.beforeSerialization);
  // 反过来
  pipeAndFilter(this._deserializer, this._decompressor, filters.afterDeserialization);
  pipeAndFilter(this._decompressor, this._connection, filters.afterDecompression);

  this._connection.on('ACKNOWLEDGED_SETTINGS_HEADER_TABLE_SIZE',
                      this._decompressor.setTableSizeLimit.bind(this._decompressor));
  this._connection.on('RECEIVING_SETTINGS_HEADER_TABLE_SIZE',
                      this._compressor.setTableSizeLimit.bind(this._compressor));
};

var noread = {};
Endpoint.prototype._read = function _read() {
  this._readableState.sync = true;
  var moreNeeded = noread, chunk;
  while (moreNeeded && (chunk = this._serializer.read())) {
    moreNeeded = this.push(chunk);
  }
  if (moreNeeded === noread) {
    // once - Event模块的一个方法，挂接一次性事件,只要调用一次，就停止挂接.
    // 看起来 _serializer继承自Event模块
    /*Node.js中大部分的模块，都继承自Event模块（http://nodejs.org/docs/latest/api/events.html ）。
    Event模块（events.EventEmitter）是一个简单的事件监听器模式的实现。
    具有addListener/on，once，removeListener，removeAllListeners，emit等基本的事件监听模式的方法实现*/
    this._serializer.once('readable', this._read.bind(this));
  }
  this._readableState.sync = false;
};

Endpoint.prototype._write = function _write(chunk, encoding, done) {
  this._deserializer.write(chunk, encoding, done);
};

// Management
// --------------

Endpoint.prototype._initializeManagement = function _initializeManagement() {
  // bind()方法会创建一个新函数,称为绑定函数.当调用这个绑定函数时,绑定函数会以创建它时传入 bind()方法的第一个参数作为 this,
  // 传入 bind() 方法的第二个以及以后的参数加上绑定函数运行时本身的参数按照顺序作为原函数的参数来调用原函数.
  //  如下代码，当connection事件stream发生的时候，发射stream事件到EndPoint（this）
  //  就是把connection的stream事件连接到EndPoint上

  this._connection.on('stream', this.emit.bind(this, 'stream'));
};

Endpoint.prototype.createStream = function createStream() {
  return this._connection.createStream();
};

// Error handling
// --------------

Endpoint.prototype._initializeErrorHandling = function _initializeErrorHandling() {
  // 把包容对象的error事件都挂接到Endpoint的_error内处理
  this._serializer.on('error', this._error.bind(this, 'serializer'));
  this._deserializer.on('error', this._error.bind(this, 'deserializer'));
  this._compressor.on('error', this._error.bind(this, 'compressor'));
  this._decompressor.on('error', this._error.bind(this, 'decompressor'));
  this._connection.on('error', this._error.bind(this, 'connection'));

  this._connection.on('peerError', this.emit.bind(this, 'peerError'));
};

Endpoint.prototype._error = function _error(component, error) {
  this._log.fatal({ source: component, message: error }, 'Fatal error, closing connection');
  this.close(error);
  setImmediate(this.emit.bind(this, 'error', error));
};

Endpoint.prototype.close = function close(error) {
  this._connection.close(error);
};

// Bunyan serializers
// ------------------

exports.serializers = {};

var nextId = 0;
exports.serializers.e = function(endpoint) {
  if (!('id' in endpoint)) {
    endpoint.id = nextId;
    nextId += 1;
  }
  return endpoint.id;
};
