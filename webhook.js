'use strict';

var config = require("./config.js");
const PAGE_ACCESS_TOKEN = config.PAGE_ACCESS_TOKEN;
const APIAI_TOKEN = config.APIAI_TOKEN ;
const WEATHER_API_KEY = config.WEATHER_API_KEY;

const accountSid = config.accountSid ;
const authToken =config.authToken ;

console.log(PAGE_ACCESS_TOKEN);
console.log(APIAI_TOKEN);
console.log(WEATHER_API_KEY);


const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(OPENSHIFT_NODEJS_PORT || 5000, () => {
        console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

//var twilio = require('twilio');
//var client = new twilio(accountSid, authToken);

const apiaiApp = require('apiai')(APIAI_TOKEN);

app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'correct_token') {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.status(403).end();
    }
});


const request = require('request');

app.post('/webhook', (req, res) => {
    console.log(req.body);
    if (req.body.object === 'page') {
        req.body.entry.forEach((entry) => {
            entry.messaging.forEach((event) => {
                 if (!event.hasOwnProperty('delivery')&& event.message && event.message.text) {
                    sendMessage(event);
                }
            });
        });
        res.sendStatus(200);
    }
});

function sendMessage(event) {
        let sender = event.sender.id;
        let text = event.message.text;

        /*client.messages.create({
         body: text,
         to: '+13215490272',  // Text this number
         from: '+14157612848' // From a valid Twilio number
         },function(err,message){
         if(err){
         console.log(err.message);
         }
         else{
         console.log(message);
         }
         })


         request({
         url: 'https://graph.facebook.com/v2.6/me/messages',
         qs: {access_token: PAGE_ACCESS_TOKEN},
         method: 'POST',
         json: {
         recipient: {id: sender},
         message: {text: text}
         }
         }, function (error, response) {
         if (error) {
         console.log('Error sending message: ', error);
         } else if (response.body.error) {
         console.log('Error: ', response.body.error);
         }
         });
         */
        console.log(text);
        let apiai = apiaiApp.textRequest(text, {
            sessionId: 'new_session'
        });


        apiai.on('response', (response) => {

            console.log(response);
            console.log(response.result.fulfillment.speech);
            let aiText = response.result.fulfillment.speech;

            if (aiText) {
                aiText = aiText;
            }
            else
            {
                aiText="Sorry, I do not understand this";
            }
            request({
                url: 'https://graph.facebook.com/v2.6/me/messages',
                qs: {access_token: PAGE_ACCESS_TOKEN},
                method: 'POST',
                json: {
                    recipient: {id: sender},
                    message: {text: aiText}
                }
            }, (error, response) => {
                if (error) {
                    console.log('Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                }
            });

        });



        apiai.on('error', function (error) {
            console.log(error);
        });

        apiai.end();
}


app.post('/ai', (req, res) => {
    console.log('*** Webhook for api.ai query ***');
    console.log(req.body.result);

    if (req.body.result.action === 'weather') {
        console.log('*** weather ***');
        let city = req.body.result.parameters['geo-city'];
        let restUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+WEATHER_API_KEY+'&q='+city;

        request.get(restUrl, (err, response, body) => {
            if (!err && response.statusCode == 200) {
                let json = JSON.parse(body);
                console.log(json);
                let tempF = ~~(json.main.temp * 9/5 - 459.67);
                let tempC = ~~(json.main.temp - 273.15);
                let msg = 'The current condition in ' + json.name + ' is ' + json.weather[0].description + ' and the temperature is ' + tempF + ' ℉ (' +tempC+ ' ℃).'
                return res.json({
                    speech: msg,
                    displayText: msg,
                    source: 'weather'
                });
            } else {
                let errorMessage = 'I failed to look up the city name.';
                return res.status(400).json({
                    status: {
                        code: 400,
                        errorType: errorMessage
                    }
                });
            }
        })
    }

});





