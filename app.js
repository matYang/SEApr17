var express = require('express');
var webot_lib = require('weixin-robot');
var log = require('debug')('webot-example:log');
var verbose = require('debug')('webot-example:verbose');


// 启动服务
var app = express();
var wx_token = 'wewaterloo2014';

var webot = new webot_lib.Webot();
require('./rules')(webot);
webot.watch(app, { token: wx_token});

// 如果需要 session 支持，sessionStore 必须放在 watch 之后
app.use(express.cookieParser());
// 为了使用 waitRule 功能，需要增加 session 支持
app.use(express.session({
  secret: 'abced111',
  store: new express.session.MemoryStore()
}));


var port = 80;
app.listen(port, function(){
  log("Listening on %s", port);
});

// 微信接口地址只允许服务放在 80 端口
// 所以需要做一层 proxy
//app.enable('trust proxy');

if(!process.env.DEBUG){
  console.log("set env variable `DEBUG=webot-example:*` to display debug info.");
}
