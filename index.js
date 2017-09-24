var restify = require('restify');
const builder = require('botbuilder');
var request = require('request');
const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
require('dotenv').config()

// Setup App
const app = express();
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());


// Create chat bot
var connector = new builder.ChatConnector({
  appId: process.env.BOT_APP_ID,
  appPassword: process.env.BOT_APP_PASSWORD
});

app.post('/api/messages', connector.listen());

app.get("/api/oauthcallback", function (req, res) {
  var codeIndex = req.url.indexOf('=');
  var code = (req.url.substr(codeIndex + 1));
  console.log(code);
  var postData = {
    grant_type: "authorization_code",
    code: code,
    client_id: process.env.COINBASE_CLIENT_ID,
    client_secret: process.env.COINBASE_CLIENT_SECRET,
    redirect_uri: "https://e7c80afd.ngrok.io/api/oauthcallback"
  }
  var url = 'https://api.coinbase.com/oauth/token';
  var options = {
    method: 'post',
    body: postData,
    json: true,
    url: url
  }
  request(options, function (err, response, body) {
    if (err) {
      console.error('Error getting token: ', err)
      throw err
    }
    res.status(200).send('Copy this: ' + body.access_token);
  })

});

app.listen(4000, function () {
  console.log('App listening on port 4000!')
})


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

intents.matches(/^what/i, [
  function (session) {
    const url = "https://api.gemini.com/v1/pubticker/btcusd";
    fetch(url)
      .then(response => {
        response.json().then(json => {
          console.log(json);
          session.send('The current price is ' + json.last);
        });
      })
      .catch(error => {
        console.log(error);
      });
  }
]);

var currentPrice;
intents.matches(/^buy/i, [
  function (session) {
    const url = "https://api.gemini.com/v1/pubticker/btcusd";
    fetch(url)
      .then(response => {
        response.json().then(json => {
          currentPrice = json.last;
          session.send('How much would you like to buy ($)?');
          builder.Prompts.text(session, 'Bitcoin is currently valued at $' + currentPrice);
        });
      })
      .catch(error => {
        console.log(error);
      });
  },
  function (session, results) {
    var bitcoinAdd = Number(Math.round(String(results.response / currentPrice) + 'e' + '8') + 'e-' + '8');
    session.userData.bitcoinBought += bitcoinAdd;
    console.log(session.userData);
    session.send('Great, $' + results.response + ' bought.')
    session.endDialog();
  }
]);

intents.matches(/^sell/i, [
  function (session) {
    session.send('How much would you like to sell (bitcoin)?')
    builder.Prompts.text(session, 'You currently have ' + session.userData.bitcoinBought + ' bitcoins.');
  },
  function (session, results) {
    session.userData.bitcoinBought -= results.response;
    session.send('Great, ' + results.response + ' bitcoins sold.')
    session.endDialog();
  }
]);

intents.matches(/^how/i, [
  function (session) {
    var bitcoinAmount = Number(Math.round(String(session.userData.bitcoinBought) + 'e' + '8') + 'e-' + '8');
    session.send('You have ' + bitcoinAmount + ' bitcoins.');
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
    session.userData.bitcoinBought = 0;
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

bot.dialog("/login", [
  function (session) {
    var redirectURL = 'https://e7c80afd.ngrok.io/api/oauthcallback';
    var url = 'https://www.coinbase.com/oauth/authorize?response_type=code&client_id=' + process.env.COINBASE_CLIENT_ID + '&redirect_uri=' + encodeURIComponent(redirectURL) + '&scope=wallet:accounts:read';
    builder.Prompts.text(session, new builder.Message(session).addAttachment(
      new builder.SigninCard(session)
      .text("Authenticate with Coinbase")
      .button("Sign-In", url)));
  },
  function (session, results) {
    session.privateConversationData.access_key = results.response;
    session.send("Great, you're logged in! What would you like to do?");
    session.endDialog()
  }
]);

//https%3A%2F%2Fexample.com%2Foauth%2Fcallback
//https%3A%2F%2Fcryptobotbitcoin.azurewebsites.net%2Fapi%2Foauthcallback

bot.dialog("/oauth-success", function (session, token) {
  session.privateConversationData.tokens = token;
  session.send("Success logging in!");
});