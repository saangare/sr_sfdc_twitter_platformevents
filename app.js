'use strict';

// ==============================================
// Load libraries
// ==============================================

var dotenv = require('dotenv').config();          // necessary if running via 'node app.js' instead of 'heroku local'
var jsforce = require('jsforce');                  // salesforce client
var express = require('express');                  // nodejs de-facto web server
var exphbs = require('express-handlebars');       // for html templating responses
var path = require('path');                     // utility for parsing and formatting file paths
var bodyParser = require('body-parser')

// define node modules
require('cometd-nodejs-client').adapt();
let lib = require('cometd');
let cometd = new lib.CometD();
let platformEventName = 'SocialMedia__e';
var Twit = require('twit');
var config = require('./config')
var TinyURL = require('tinyurl');
var urlencode = require('urlencode');

var atoken = '';
var iurl = '';
var vrsn = '';

var promise = require('promise');
var app = express();
var T = new Twit(config);
var handlebars = require('express-handlebars').create({ defaultLayout: 'main' });
var SALESFORCE_LOGIN_URL='https://technyc-dev-ed.my.salesforce.com';
var SALESFORCE_CLIENT_ID='3MVG9uudbyLbNPZNDTUHHCFtilhUxenQeGEFG_rZl0D8vAmZ6nf5Dy51XKi.EMtcmp36vCzuqsTCZ44FWPhwT';
var SALESFORCE_CLIENT_SECRET='7277814903660320375';
var SALESFORCE_REDIRECT_URI='https://platformapp.herokuapp.com/oauth2/callback';
var SF_USER='sravanthi@tg.com';
var SF_PASS='fall2020VIDyy92yIWr0DjcV3CVznlVP8';

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.use(require('body-parser').urlencoded({ extended: true }));

// serve up static content from this folder
app.use(express.static(__dirname + '/public'));

app.listen(process.env.PORT || 8080);
// ==============================================
// Salesforce OAuth Settings (reusable)
// ==============================================
var conn = new jsforce.Connection({
    oauth2: {
        // you can change loginUrl to connect to sandbox or prerelease env.
        loginUrl: SALESFORCE_LOGIN_URL,
        clientId: SALESFORCE_CLIENT_ID,
        clientSecret: SALESFORCE_CLIENT_SECRET,
        redirectUri: SALESFORCE_REDIRECT_URI
    }
});

conn.login(SF_USER, SF_PASS, function (err, userInfo) {
    if (err) { return console.error(err); }
    // Now you can get the access token and instance URL information.
    // Save them to establish connection next time.
    console.log(conn.accessToken);
    console.log(conn.instanceUrl);
    // logged in user property
    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);
    subscribeToEvents();
    // ...
});
//subscribeToEvents();
app.get('/', function (req, res) {
    res.render('home');
});

app.use(function (req, res, next) {
    console.log("Looking for URL : " + req.url);
    next();
});

app.get('/about', function (req, res) {
    res.render('about');
});

app.get('/contact', function (req, res) {
    console.log(conn.instanceUrl);
    console.log("in contact get :: url" + conn.instanceUrl + "token::" + conn.accessToken);
    res.render('contact', {
        csrf: 'CSRF token here',
        atoken: conn.accessToken,
        iurl: conn.instanceUrl,
        eventId: req.query.eventId,
        campaingName: req.query.name
    });
});

app.get('/thankyou', function (req, res) {
    res.render('thankyou', {
        'firstname': firstname

    });
});
var firstname = '';
app.post('/process', function (req, res) {

    console.log('publishing new event...');
    console.log('acess token : ' + req.body._atoken);
    console.log('instance url : ' + req.body._iurl);
    console.log('CSRF token : ' + req.body._csrf);
    console.log('Email : ' + req.body.email);
    console.log('firstname : ' + req.body.fname);
    console.log('lastname : ' + req.body.lname);
    console.log('about : ' + req.body.ques);
    console.log('phone : ' + req.body.tel_no_1 + '-' + req.body.tel_no_2 + '-' + req.body.tel_no_3);
    firstname = req.body.fname;
    var sfClient = new jsforce.Connection({
        instanceUrl: conn.instanceUrl,
        accessToken: conn.accessToken,
        version: process.env.SALESFORCE_API_VERSION
    });

    sfClient.sobject('CampaignMemberEvent__e').create({

        'FirstName__c': req.body.fname,
        'CampaignId__c': req.body._eventId,
        'LastName__c': req.body.lname,
        'Email__c': req.body.email,
        'Phone__c': req.body.tel_no_1 + '-' + req.body.tel_no_2 + '-' + req.body.tel_no_3,
        'Company__c': req.body.company

    }).then(function (result) {

        console.log(result);
        // res.redirect( '/subscribe?accessToken=' + sfClient.accessToken + '&instanceUrl=' + sfClient.instanceUrl );
        res.redirect('/thankyou');

    }).catch(function (err) {

        handleError(err);

    });

});

app.use(function (req, res) {
    res.type('text/html');
    res.status(404);
    res.render('404');
});

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
});
// ==============================================
// Functions
// ==============================================

function subscribeToEvents() {
    // conn = sfAuthentication();
    console.log('subscribing to events...');
    // configure this instance of CometD
    cometd.configure({
        url: conn.instanceUrl + '/cometd/40.0',
        requestHeaders: {
            Authorization: 'Bearer ' + conn.accessToken
        },
        appendMessageTypeToURL: false
    });

    // handle the handshake's success
    cometd.handshake((shake) => {
        if (shake.successful) {
            // set your event here
            cometd.subscribe('/event/' + platformEventName, (message) => {
                console.log(message.data);
                console.log(message.channel);
                // var yourJsonObject = JSON.parse(message.data);
                var printmsg = message.data;
                console.log(printmsg.payload);
                var printmsgfinal = printmsg.payload;
                console.log('<<>>');
                //var result = parseJSON(printmsgfinal);
                console.log(printmsgfinal['Message__c']);
                //var msgpost = printmsgfinal['Message__c'] + '\r\n' + printmsgfinal['website__c'] + '?eventId=' + printmsgfinal['CampaignId__c'];
                var msgpost = printmsgfinal['Message__c'] + '\r\n' ;
				var url = 'https://'+printmsgfinal['website__c'] + '?eventId=' + printmsgfinal['CampaignId__c']+'&name='+urlencode(printmsgfinal['Campaign_Name__c']);
				//+'&name='+printmsgfinal['Campaign_Name__c'];
                console.log('msg posted:' + msgpost+':'+url);
				 TinyURL.shorten(url, function(res) {
                    console.log('shorter url:'+ res); //Returns a shorter version of http://google.com - http://tinyurl.com/2tx 
                   // twitterPost(msgpost + res);
				   twitterPost(msgpost + res);
                });
                
            });
        } else {
            console.log('An error occurred!');
            console.log(shake);
        }
    });
    atoken = conn.accessToken;
    iurl = conn.instanceUrl;
}

/**
 * Helper function to log error to console then write to response.
 */
function handleError(err, res) {

    console.error(err);

    res.status(403).send(err);

};
function twitterPost(msgdata) {
    console.log("posting message to twitter.." + msgdata)
    //var Twit = require('twit');
    //var config = require('./config')
    //var T = new Twit(config);
    //console.log('in twitter post-->'+T);
    var tweet = {
        status: msgdata
    }

    T.post('statuses/update', tweet, tweeted)

    function tweeted(err, data, response) {
        if (err) {
            console.log("Something went wrong!" + err);
        }
        else {
            console.log("Message posted to Twitter!");
        }
    }

};
function parseJSON(obj) {
    var parsedData = '';
    for (var i in obj) {
        console.log(i);
        if (typeof obj[i] == 'object') {
            parsedData += parseJSON(obj[i]);

        } else {
            console.log('<<<<<>>>>>' + obj[i]);
            parsedData += i + ' : ' + obj[i];
        }//end if
        parsedData += '\n';
    }//end for
    return parsedData;
};//end function




