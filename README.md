### rssToSlack

A JavaScript app that reads a set of feeds and posts the new items to a Slack channel. Runs in Node.js.

#### How to

0. Be sure <a href="https://nodejs.org/download/">Node</a> is installed. 

1. <a href="https://github.com/scripting/rssToSlack/archive/master.zip">Download</a> the folder.

2. At the command line, in the folder: npm install.

3. Edit config.json to set it up (see below).

4. At the command line: node rsstoslack.js.

#### Getting your WebHook address

The only tricky part of the setup is to get a magic URL from Slack that enables rssToSlack to send messages to your channel.

If you click on <a href="https://my.slack.com/services/new/incoming-webhook/">this link</a>, it will redirect to your Incoming Web Hooks page. 

1. Choose a channel from the popup menu.

2. Click the big green button, which takes you to a page with a long URL on it.

3. Copy <a href="http://scripting.com/2015/05/25/webhookurl.png">the URL</a> to the clipboard.

#### config.json

The feeds array can have as many elements as you want. rssToSlack will read each feed once a minute, and post a new item to the slack channel you specify. 

1. Give your feed a unique <i>name</i> (that is don't give two feeds the same name). 

2. Set <i>enabled</i> to true (this is present so you can disable a feed without removing it from the array). 

3. Provide the URL of the RSS feed. 

4. Provide information about the Slack channel. Most important provide the URL of the web hook (see above).  You can also specify a name for the hook, an icon, or an emoji character.

####v0.43 -- 6/2/15 by DW

Read config.json once a minute so you don't have to reboot the app to change the configuration.

#### Structured code

You can review the <a href="http://scripting.com/listings/rsstoslack.html">structured version</a> of the code, it might make a little more sense this way. ;-)

#### Questions, comments?

Please post a note on the <a href="https://groups.google.com/forum/#!forum/server-snacks">Server Snacks</a> mail list. 

