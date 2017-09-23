var restify = require('restify');
const builder = require('botbuilder');
var request = require('request');
require('dotenv').config()

// Setup Restify Server

var server = restify.createServer();

server.listen(process.env.PORT || 4000, function () {
  console.log('%s <li></li>stening to %s', server.name, server.url);
});


// Create chat bot
var connector = new builder.ChatConnector({
  appId: process.env.BOT_APP_ID,
  appPassword: process.env.BOT_APP_PASSWORD
});

server.post('/api/messages', connector.listen());
server.use(restify.plugins.queryParser());
server.get("/api/oauthcallback", function (req, res) {
  var code = req.params.code;
  var postData = {
    grant_type: "authorization_code",
    code: code,
    client_id: process.env.COINBASE_CLIENT_ID,
    client_secret: process.env.COINBASE_CLIENT_SECRET,
    redirect_uri: "https://e7c80afd.ngrok.io/api/oauthsuccess"
  }
  var url = 'https://api.coinbase.com/oauth/token';
  var options = {
    method: 'post',
    body: postData,
    json: true,
    url: url
  }
  request(options, function (err, res, body) {
    if (err) {
      console.error('Error getting token: ', err)
      throw err
    }
    res.send(200, body);
  })
});

/**
 * Bots Dialogs
 */

var bot = new builder.UniversalBot(connector);
var intents = new builder.IntentDialog();
bot.dialog("/", intents);

intents.matches(/^change name/i, [
  function (session) {
    session.beginDialog("/profile");
  },
  function (session, results) {
    session.send("Ok... Changed your name to %s", session.privateConversationData.name);
  }
]);

intents.matches(/^login/i, [
  function (session) {
    session.beginDialog("/login");
  }
]);

intents.onDefault([
  function (session, args, next) {
    if (!session.privateConversationData.name) {
      session.beginDialog("/profile");
    } else {
      next();
    }
  },

  function (session, results) {
    session.send("Hello %s!", session.privateConversationData.name);
  }
]);

bot.dialog("/profile", [
  function (session) {
    builder.Prompts.text(session, "Hi! What is your name?");
  },
  function (session, results) {
    if (results.response.match(/login/gi)) {
      session.beginDialog("/login");
    } else {
      session.privateConversationData.name = results.response;
      session.endDialog();
    }
  }
]);

bot.dialog("/login", function (session) {
  var redirectURL = 'https://e7c80afd.ngrok.io/api/oauthcallback';
  var url = 'https://www.coinbase.com/oauth/authorize?response_type=code&client_id=' + process.env.COINBASE_CLIENT_ID + '&redirect_uri=' + encodeURIComponent(redirectURL) + '&scope=wallet:accounts:read'
  console.log(session);
  session.send(new builder.Message(session).addAttachment(
    new builder.SigninCard(session)
    .text("Authenticate with Coinbase")
    .button("Sign-In", url)));
});

//https%3A%2F%2Fexample.com%2Foauth%2Fcallback
//https%3A%2F%2Fcryptobotbitcoin.azurewebsites.net%2Fapi%2Foauthcallback

bot.dialog("/oauth-success", function (session, token) {
  session.privateConversationData.tokens = token;
  session.send("Success logging in!");
});