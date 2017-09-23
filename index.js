var restify = require('restify');
const builder = require('botbuilder');
require('dotenv').config()

// Setup Restify Server

var server = restify.createServer();

server.listen(process.env.PORT || 3001, function () {
  console.log('%s <li></li>stening to %s', server.name, server.url);
});


// Create chat bot
var connector = new builder.ChatConnector({
  appId: process.env.BOT_APP_ID,
  appPassword: process.env.BOT_APP_PASSWORD
});

server.post('/api/messages', connector.listen());
server.get("/api/oauthcallback", function (req, res, next) {
  console.log("OAUTH CALLBACK");
  /*var authCode = req.query.code,
    address = JSON.parse(req.query.state),
    oauth = getOAuthClient();*/
  console.log(req);
  //bot.beginDialog(address, "/oauth-success", tokens);
  res.send(200, {});
  return next();
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
  var redirectURL = 'https://0d915e12.ngrok.io/api/oauthcallback';
  var url = 'https://www.coinbase.com/oauth/authorize?response_type=code&client_id=' + process.env.COINBASE_CLIENT_ID + '&redirect_uri=' + encodeURIComponent(redirectURL) + '&scope=wallet:accounts:read'

  session.send(new builder.Message(session).addAttachment(
    new builder.SigninCard(session)
    .text("Authenticate with Coinbase")
    .button("Sign-In", url)));
});

//https%3A%2F%2Fexample.com%2Foauth%2Fcallback
//https%3A%2F%2Fcryptobotbitcoin.azurewebsites.net%2Fapi%2Foauthcallback

bot.dialog("/oauth-success", function (session, tokens) {
  session.privateConversationData.tokens = tokens;
  session.send("oAuth Success!");

  people.people.get({
    resourceName: "people/me",
    auth: oauth
  }, function (err, response) {
    if (!err) {
      if (response.names && response.names.length > 0) {
        var name = response.names[0].givenName || response.names[0].displayName;
        session.privateConversationData.name = name;
        session.send("Nice to meet you, %s!", name);
      }
    } else {
      session.send("There was an error retrieving your profile.");
    }
    session.endDialog();
  });
});