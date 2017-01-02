/**
 * Created by MZAMAM on 10/13/2016.
 */

var http = require('http');
var Helper = require('./helper');
var fs = require('fs');
var util         = require('util'),
    express = require('express'),
    io          = require('socket.io');
var path = require("path");
var csv = require("fast-csv");
var app = express();



const server = http.createServer(app).listen(3000, function(err) {
    if (err) {
        console.log(err);
    } else {
        const host = server.address().address;
        const port = server.address().port;
    }


});        



app.use(express.static(__dirname + '/public'));

var socket = io.listen(server);



socket.on('connection', function (client){
    // new client is here!
    setTimeout(function () {
        client.send('Waited two seconds!');
    }, 2000);

    client.on('message', function (message) {
    }) ;

    client.on('token', function (token) {
        //Identify user
        Helper.getUserInfoFromStackExchange(token, function (res) {
            console.log(res);
        });
    }) ;

    client.on('disconnect', function () {
    });

    client.on('follow', function (message) {
        var json = "";
        json += message;
        var jsonObj = JSON.parse(json);
        Helper.follow(jsonObj.follower, jsonObj.followee,function (res) {
            console.log(res);
        });

    }) ;

    client.on('unfollow', function (message) {
        var json = "";
        json += message;
        var jsonObj = JSON.parse(json);
        Helper.unfollow(jsonObj.follower, jsonObj.followee,function (res) {
            console.log(res);
        });
    }) ;

    client.on('followers', function (message) {
        var json = "";
        json += message;
        var jsonObj = JSON.parse(json);
        Helper.findfollowers(jsonObj.user ,function (res) {
            console.log(res);
        });
    }) ;

    client.on('followees', function (message) {
        var json = "";
        json += message;
        var jsonObj = JSON.parse(json);
        Helper.findfollowees(jsonObj.user ,function (res) {
            console.log(res);
        });
    }) ;

    client.on('posts', function (message) {
        var json = "";
        json += message;
        var jsonObj = JSON.parse(json);
        Helper.getFolloweesPosts(jsonObj.token, "1" ,function (res) {
            console.log(res);
        });
    });

    client.on('getRecommendations', function (message) {
        var json = "";
        json += message;
        var jsonObj = JSON.parse(json);
        Helper.getRecommendations(jsonObj.user ,function (res) {
            console.log(res);
        });
    });
});



app.set('port', process.env.PORT || 3000);

app.get('/', function(req, res){
    console.log("Connected successfully to server");

});


