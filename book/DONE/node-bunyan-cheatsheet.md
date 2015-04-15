$npm install -g bunyan

$ cat hi.js

var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'myapp'});
log.info('hi');
log.warn({lang: 'fr'}, 'au revoir');
$ node hi.js

{"name":"myapp","hostname":"banana.local","pid":40161,"level":30,"msg":"hi","time":"2013-01-04T18:46:23.851Z","v":0}
{"name":"myapp","hostname":"banana.local","pid":40161,"level":40,"lang":"fr","msg":"au revoir",
CLI Usage

$ node hi.js | ./bin/bunyan
[2013-01-04T19:01:18.241Z]  INFO: myapp/40208 on banana.local: hi
[2013-01-04T19:01:18.242Z]  WARN: myapp/40208 on banana.local: au revoir (lang=fr)
ref
https://github.com/trentm/node-bunyan