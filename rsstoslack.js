var myVersion = "0.42", myProductName = "RSS to Slack"; 

	//The MIT License (MIT)
	
	//Copyright (c) 2014 Dave Winer
	
	//Permission is hereby granted, free of charge, to any person obtaining a copy
	//of this software and associated documentation files (the "Software"), to deal
	//in the Software without restriction, including without limitation the rights
	//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	//copies of the Software, and to permit persons to whom the Software is
	//furnished to do so, subject to the following conditions:
	
	//The above copyright notice and this permission notice shall be included in all
	//copies or substantial portions of the Software.
	
	//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	//SOFTWARE.
	
	//structured listing: http://scripting.com/listings/rsstoslack.html
	
var http = require ("http"); 
var https = require ("https");
var md5 = require ("MD5");
var FeedParser = require ("feedparser");
var request = require ("request");
var fs = require ("fs");

var appStats = { 
	ctStarts: 0, whenLastStart: new Date (0),
	ctReadErrors: 0, ctReads: 0, ctBytesRead: 0,
	feeds: new Object ()
	};
var flStatsChanged = false;
var appConfig;

function jsonStringify (jstruct) { 
	return (JSON.stringify (jstruct, undefined, 4));
	}
function statsChanged () {
	flStatsChanged = true;
	}
function sleepTillTopOfMinute (callback) { 
	var ctmilliseconds = 60000 - ((Number (new Date ()) + 60000) % 60000);
	setTimeout (callback, ctmilliseconds); 
	}
function sendToSlack (s, urlWebHook, theUsername, theIconUrl, theIconEmoji, theChannel, callback) {
	var payload = {
		text: s
		};
	
	if (theChannel !== undefined) {
		payload.channel = theChannel;
		}
	if (theUsername !== undefined) {
		payload.username = theUsername;
		}
	if (theIconUrl !== undefined) {
		payload.icon_url = theIconUrl;
		}
	if (theIconEmoji !== undefined) {
		payload.icon_emoji = theIconEmoji;
		}
	
	var theRequest = {
		url: urlWebHook,
		method: "POST",
		json: payload
		};
	request (theRequest, function (error, response, body) {
		if (!error && (response.statusCode == 200)) {
			if (callback) {
				callback (body) 
				}
			}
		else {
			console.log ("sendToSlack: error, code == " + response.statusCode + ", " + response.body + ".\n");
			}
		});
	}
function readFeed (urlfeed, itemcallback, feedcallback) {
	var req = request (urlfeed);
	var feedparser = new FeedParser ();
	req.on ("response", function (res) {
		var stream = this;
		if (res.statusCode == 200) {
			stream.pipe (feedparser);
			}
		});
	req.on ("error", function (res) {
		console.log ("readFeed: request error == " + jsonStringify (res));
		});
	feedparser.on ("readable", function () {
		var item = this.read ();
		if (itemcallback !== undefined) {
			itemcallback (item);
			}
		});
	feedparser.on ("end", function () {
		if (feedcallback !== undefined) {
			feedcallback ();
			}
		});
	feedparser.on ("error", function (res) {
		console.log ("readFeed: feedparser error == " + jsonStringify (res));
		});
	}
function getItemGuid (item) {
	function ok (val) {
		if (val != undefined) {
			if (val != "null") {
				return (true);
				}
			}
		return (false);
		}
	if (ok (item.guid)) {
		return (item.guid);
		}
	var guid = "";
	if (ok (item.pubDate)) {
		guid += item.pubDate;
		}
	if (ok (item.link)) {
		guid += item.link;
		}
	if (ok (item.title)) {
		guid += item.title;
		}
	if (guid.length > 0) {
		guid = md5 (guid);
		}
	return (guid);
	}
function checkOneFeed (theConfig, callback) {
	var itemsInFeed = new Object (), ctnewitems = 0;
	function sendItem (item) {
		if (appConfig.flPostingEnabled) {
			var slackLinkText = " (link)";
			console.log (theConfig.name + ": " + item.title);
			if (theConfig.slack !== undefined) {
				if (item.title !== undefined) {
					var s = item.title;
					if (item.link !== undefined) {
						s += ". <" + item.link + "|" + slackLinkText + ">";
						}
					sendToSlack (s, theConfig.slack.urlWebHook, theConfig.slack.hookName, theConfig.slack.urlIcon, theConfig.slack.emojiIcon, theConfig.slack.channel);
					}
				}
			}
		}
	function itemcallback (item) { //called once for each item in the feed
		var theGuid = getItemGuid (item);
		itemsInFeed [theGuid] = true;
		if ((!appConfig.flAtMostOnePostPerMinute) || (ctnewitems == 0)) {
			if (theStats.idsSeen [theGuid] === undefined) { //new item
				theStats.idsSeen [theGuid] = true;
				statsChanged ();
				sendItem (item);
				ctnewitems++;
				}
			}
		}
	function feedcallback () { //called when we've finished reading the feed
		for (var x in theConfig.idsSeen) { //clean out ids that are no longer in the feed
			if (itemsInFeed [x] === undefined) {
				delete theConfig.idsSeen [x];
				}
			}
		if (callback !== undefined) {
			callback ();
			}
		}
	if (theConfig.enabled) {
		var theStats = appStats.feeds [theConfig.name];
		if (theStats === undefined) { //cool! a new feed
			theStats = {
				ctFeedChecks: 0, whenLastCheck: new Date (0),
				ctStories: 0, whenLastStory: new Date (0),
				idsSeen: new Object ()
				};
			appStats.feeds [theConfig.name] = theStats;
			}
		readFeed (theConfig.urlFeed, itemcallback, feedcallback);
		}
	else {
		if (callback !== undefined) {
			callback ();
			}
		}
	}
function checkAllFeeds (callback) {
	function doNextRiver (ix) {
		if (ix < appConfig.feeds.length) {
			checkOneFeed (appConfig.feeds [ix], function () {
				doNextRiver (ix + 1);
				});
			}
		else {
			if (callback !== undefined) {
				callback ();
				}
			}
		}
	doNextRiver (0);
	}
function readConfig (callback) {
	fs.readFile ("config.json", "utf8", function (err, data) {
		var dataAboutRead = {
			Body: data
			};
		if (err) {
			console.log ("readConfig: error == " + jsonStringify (err));
			}
		else {
			appConfig = JSON.parse (dataAboutRead.Body);
			appStats.ctReads++;
			appStats.ctBytesRead += dataAboutRead.Body.length;
			statsChanged ();
			}
		if (callback != undefined) {
			callback ();
			}
		});
	}
function readStats (callback) {
	fs.readFile ("stats.json", "utf8", function (err, data) {
		var dataAboutRead = {
			Body: data
			};
		if (err) {
			}
		else {
			var storedPrefs = JSON.parse (dataAboutRead.Body);
			for (var x in storedPrefs) {
				appStats [x] = storedPrefs [x];
				}
			appStats.ctReads++;
			appStats.ctBytesRead += dataAboutRead.Body.length;
			statsChanged ();
			}
		if (callback != undefined) {
			callback ();
			}
		});
	}
function writeStats () {
	fs.writeFile ("stats.json", jsonStringify (appStats));
	}
function everyMinute () { 
	var now = new Date ();
	console.log ("\neveryMinute: " + now.toLocaleTimeString ());
	checkAllFeeds (function () {
		statsChanged ();
		sleepTillTopOfMinute (everyMinute);
		});
	}
function everySecond () {
	if (flStatsChanged) {
		flStatsChanged = false;
		writeStats ();
		}
	}
function startup () {
	readConfig (function () {
		readStats (function () {
			console.log ("\n" + myProductName + " v" + myVersion + ".");
			everyMinute ();
			setInterval (everySecond, 1000); 
			});
		});
	}
startup ();
