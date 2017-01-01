'use strict';
var url = require('url')
const express = require('express');
const simpleOauthModule = require('simple-oauth2');

const app = express();
const oauth2 = simpleOauthModule.create({
    client: {
        id: '8700',
        secret: 'JbYhe7zK73gEYv3Kd58itg((',
    },
    auth: {
        tokenHost: 'https://stackexchange.com',
        tokenPath: '/oauth/access_token',
        authorizePath: '/oauth/dialog',
    },
});
//app.use(express.static(__dirname + '/public'));
// Authorization uri definition
const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: 'http://localhost:3000/callback',
    scope: 'no_expiry' /*,
     state: '3(#0/!~',*/
});

// Initial page redirecting to Github
app.get('/auth', (req, res) => {
    console.log(authorizationUri);
res.redirect(authorizationUri);
/*res.redirect('https://stackexchange.com/oauth/dialog?client_id=8700&scope=no_expiry&'+
    'redirect_uri=http://localhost:3000/callback');*/
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', (req, res) => {
    console.log(req.originalUrl);
const code = req.query.code;
const options = {
    code,
};

oauth2.authorizationCode.getToken(options, (error, result) => {
    if (error) {
        console.error('Access Token Error', error.message);
        return res.json('Authentication failed');
    }

    console.log('The resulting token: ', result);
const token = oauth2.accessToken.create(result);

return res
    .status(200)
    .json(token);
});
});

app.get('/success', (req, res) => {
    res.send('');
});

app.get('/', (req, res) => {
    res.send('Hello<br><a href="/auth">Log in with StackExchange</a>');
});

app.listen(3000, () => {
    console.log('Express server started on port 3000'); // eslint-disable-line
});


// Credits to [@lazybean](https://github.com/lazybean)