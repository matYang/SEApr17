//All dependencies goes here
var crypto = require('crypto');
var debug = require('debug');
var log = debug('webot-example:log');
var verbose = debug('webot-example:verbose');
var error = debug('webot-example:error');
var _ = require('underscore')._;


//A blocking library enable us to wait for API response
var httpsync = require('httpsync');
var utils = require('../utils/utils.js');
var redis = require('../utils/redis.js').initialize();

var redis_food_key_base = 'food_';
var redis_play_key_base = 'play_';
var redis_food_idSet = 'food_idSet';
var redis_play_idSet = 'play_idSet';
var food_list = ['UW Plaza', '续缘轩火锅', '釜山韩国自助烧烤'];
var play_list = ['去MC玩游戏', '举办一个迷你Hackathon', '各回各家各找各妈'];

module.exports = exports = function(webot){
  webot.loads('./uwaterloo/terms/exam_schedule');

  var reg_help = /^(help|\?)$/i;
  webot.set({
    name: 'hello help',
    description: '获取使用帮助，发送 help',
    pattern: function(info) {
      return info.is('event') && info.param.event === 'subscribe' || reg_help.test(info.text);
    },
    handler: function(info,next){
      console.log("entering starting handler");

      var userName = info.uid;
      var reply = {
        title: '感谢你关注uwse公众平台',
        pic: 'https://cs.uwaterloo.ca/~rtholmes/img/waterloo-se_logo-alpha.png',
        url: 'http://games.usvsth3m.com/2048/se-waterloo-edition-3/',
        description: [
          '你可以试试以下指令:',
          'help : 显示可用指令',
          'exam : 查看exam schedule',
          'emma : 调戏公众Matt',
          '安排  : 查看4月17日安排',
          '有谁  : 查看4月17日都有谁来',
          '投票吃啥  : 投票选择4月17日吃啥',
          '投票干啥  : 投票选择4月17日饭后干啥',
          '统计吃啥  : 查看吃啥的投票统计',
          '统计干啥  : 查看饭后干啥的投票统计'
        ].join('\n')
      };
      next(null,reply);
      return reply;
    }
  });

  // Simple conversation 
  // 简单的纯文本对话，可以用单独的 yaml 文件来定义
  require('js-yaml');
  webot.dialog(__dirname + '/dialog.yaml');




  webot.set('投票吃啥',{
    description:'选择吃什么！',
    pattern: /(?:投票吃啥|投票吃？啥|food)\s*(\d*)/, //exam|
    handler: function(info, next){
      var reply = '请输入选择代号，例如如果要选择' + food_list[0] + '，请输入 "1":\n';
      var choices = [];
      var i = 0;
      redis.sismember(redis_food_idSet, info.uid, function(err, value){
        value = parseInt(value, 10);
        if (value === 1){
          next(null, '同学您已经投过票了哦');
        }
        else{
          for (i = 0; i < food_list.length; i++){
            choices.push((i+1) + ': ' + food_list[i]);
          }
          reply += choices.join('\n');
          console.log("entering food handler");
          info.wait('wait_food', next);
          next(null, reply);
        }
      });
      
    }
  });
  webot.waitRule('wait_food', function(info, next) {
    var choice_food = parseInt(info.text, 10);
    if (isNaN(choice_food) || choice_food < 1 || choice_food > food_list.length){
      return 'Out of bounds啦！祝你天天segmentation fault！';
    }
    redis.incr(redis_food_key_base+(choice_food-1));
    redis.sadd(redis_food_idSet, info.uid);
    console.log('吃_投票： ' + choice_food);
    next(null, '谢谢您的投票');
  });

  webot.set('投票干啥',{
    description:'选择吃完干什么！',
    pattern: /(?:投票干啥|投票干？啥|play)\s*(\d*)/, //exam|
    handler: function(info, next){
      var reply = '请输入选择代号，例如如果要选择' + play_list[0] + '，请输入 "1":\n';
      var choices = [];
      var i = 0;

      redis.sismember(redis_play_idSet, info.uid, function(err, value){
        value = parseInt(value, 10);
        if (value === 1){
          next(null, '同学您已经投过票了哦');
        }
        else{
          for (i = 0; i < play_list.length; i++){
            choices.push((i+1) + ': ' + play_list[i]);
          }
          reply += choices.join('\n');
          console.log("entering play handler");
          info.wait('wait_play', next);
          next(null, reply);
        }
      });
    }
  });
  webot.waitRule('wait_play', function(info, next) {
    var choice_play = parseInt(info.text, 10);
    if (isNaN(choice_play) || choice_play < 1 || choice_play > play_list.length){
      return 'Out of bounds啦！祝你天天segmentation fault！';
    }
    redis.incr(redis_play_key_base+(choice_play-1));
    redis.sadd(redis_play_idSet, info.uid);
    console.log('玩_投票：' + choice_play);
    next(null, '谢谢您的投票');
  });

  webot.set('统计吃啥',{
    description:'查看吃啥投票结果！',
    pattern: /(?:统计吃啥|统计吃？啥|play)\s*(\d*)/, //exam|
    handler: function(info, next){
      var reply = '当前吃啥的投票结果:\n';
      var choices = [];
      var i = 0;
      var req_c = food_list.length;
      console.log("entering food toll handler");
      for (i = 0; i < food_list.length; i++){
        (function(i) {
          redis.get(redis_food_key_base+i, function(err, value){
            req_c--;
            value = parseInt(value, 10);
            if (isNaN(value)){
              value = 0;
            }
            choices.push((i+1) + ' ' + food_list[i] + ': ' + value);
            if (req_c === 0){
              reply += choices.join('\n');
              next(null, reply);
            }
          });
        })(i);
      }
    }
  });

  webot.set('统计干啥',{
    description:'查看吃完干啥投票结果！',
    pattern: /(?:统计干啥|统计干？啥|play)\s*(\d*)/, //exam|
    handler: function(info, next){
      var reply = '当前吃完干啥的投票结果:\n';
      var choices = [];
      var i = 0;
      var req_c = play_list.length;
      console.log("entering play toll handler");
      for (i = 0; i < play_list.length; i++){
        (function(i) {
          redis.get(redis_play_key_base+i, function(err, value){
            req_c--;
            value = parseInt(value, 10);
            if (isNaN(value)){
              value = 0;
            }
            choices.push((i+1) + ' ' + play_list[i] + ': ' + value);
            if (req_c === 0){
              reply += choices.join('\n');
              next(null, reply);
            }
          });
        })(i);
      }
    }
  });

  // 更简单地设置一条规则
  webot.set(/^more$/i, function(info){
    var reply = _.chain(webot.gets()).filter(function(rule){
      return rule.description;
    }).map(function(rule){
      return '> ' + rule.description;
    }).join('\n').value();

    return ['我的主人还没教我太多东西,你可以考虑帮我加下.\n可用的指令:\n'+ reply,
      '没有更多啦！当前可用指令：\n' + reply];
  });

  
  webot.set('exam schedule',{
    description:'发送: exam, 查询你的考试时间地点',
    pattern: /(?:exam|考？试|Exam)\s*(\d*)/, //exam|
    handler: function(info){
      var num = 3;
      info.session.course = num;
      // console.log(info.raw['FromUserName']);
      info.wait('wait_class');
      return "请输入课号 eg.cs115";
    }
  });
  //using uwp API to search for exam schedules
  webot.waitRule('wait_class', function(info) {
    var courseName = info.text;
    console.log(courseName);
    var subject = courseName.match(/[^0-9]*/)[0];
    var courseNumber = courseName.match(/\d+/)[0];
    var url = "http://api.uwaterloo.ca/v2/courses/"+subject+"/"+courseNumber+"/"+"examschedule.json?key=b15ec88836fc09518c7407bb3951193c";
    var req = httpsync.get(url);
    var response= req.end();
    var data = JSON.parse(response['data'].toString('utf-8'))['data'];
    var output = '';


    if(!utils.isEmptyObject(data)){
    var course = data['course'];
    data = data['sections'][0];

    var section = data['section'];
    var day = data['day'];
    var date = data['date'];
    var start = data['start_time'];
    var end = data['end_time'];
    var location = data['location'];
    var notes = data['notes'];
    output = output+ "你的科目 "+course + " section:"+section+" 将于 " + day +" " + date+" 在 "+location+" 进行, 开始时间 "+ start+ " 结束时间 "+end ;
  }
  else{
    output = "查无此课, 我的朋友";
  }
     return output;
  });



  webot.set('check_image', {
    description: '发送图片,我将返回其hash值',
    pattern: function(info){
      return info.is('image');
    },
    handler: function(info, next){
      verbose('image url: %s', info.param.picUrl);

      try{
        var shasum = crypto.createHash('md5');
        var req = require('request')(info.param.picUrl);
        req.on('data', function(data) {
          shasum.update(data);
        });
        req.on('end', function() {
          return next(null, '你的图片hash: ' + shasum.digest('hex'));
        });
      }catch(e){
        error('Failed hashing image: %s', e);
        return '生成图片hash失败: ' + e;
      }
    }
  });

  // 可以指定图文消息的映射关系
  webot.config.mapping = function(item, index, info){
    return item;
  };
};
