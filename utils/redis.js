module.exports = function() {


	var _initialize = function() {
		var redis, rtg;

		/*
		// fine for both Dev and Prod stage
		if (process.env.REDISTOGO_URL) {
			rtg   = require("url").parse(process.env.REDISTOGO_URL);
			redis = require("redis").createClient(rtg.port, rtg.hostname);
			
			redis.auth(rtg.auth.split(":")[1]);
		}
		else {
			redis = require("redis").createClient();
		}
		*/
		redis = require("redis").createClient('6379', '127.0.0.1');
		return redis;
	};

	return {
		initialize: _initialize
	};
}();