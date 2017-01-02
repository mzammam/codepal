/**
 * Created by MZAMAM on 10/4/2016.
 */
var _ = require('lodash');
var forEachAsync = require('forEachAsync')
    ,fs = require('fs')
    , util = require('util')
    , stream = require('stream')
    , es = require('event-stream')
    ,path = require("path")
    ,csv = require("fast-csv")
    ,config = require("./../config"),
    zlib = require('zlib')
    request = require('request');

function getDB(callback) {
    var MongoClient = require('mongodb').MongoClient;
    var url = 'mongodb://localhost:27017/CodePal';
    MongoClient.connect(url, function(err, db) {
        callback(db);
    });
// Connection URL
    
}

module.exports.InsertUsersTagsFromFolder = InsertUsersTagsFromFolder;
module.exports.InsertUsers = InsertUsers;
module.exports.writeAllUsersTagsToFile = writeAllUsersTagsToFile;
module.exports.createVectorForEachUser = createVectorForEachUser;
module.exports.follow = follow;
module.exports.unfollow = unfollow;
module.exports.findfollowers = findfollowers;
module.exports.findfollowees = findfollowees;
module.exports.getUserInfoFromStackExchange = getUserInfoFromStackExchange;
module.exports.getFolloweesPosts = getFolloweesPosts;
module.exports.getRecommendations = getRecommendations;

function InsertUsersTagsFromFolder( folder,db, callback) {
    fs.readdir(folder, function(err, data) {
        data.forEach(function (file) {
            InsertUsersTagsFromFile(db, folder+"\\"+file, function (res) {
                callback(res);
            });

        });

    });
    
}

function InsertUsersTagsFromFile(db, file, callback)
{
    var stream = fs.createReadStream(file);
    console.log(file);
    var recs = [];
    csv
    .fromStream(stream, {headers : ["userid","tagname","weight"]})
    .on("data", function(userstags){
        //console.log(userstags);
        recs.push(userstags);
        })
    .on("end", function(){
        insertManyRecords(db, recs, function (res) {
            console.log("done");
        });

    });
}

function insertRecord(db,usertags,callback){
    var UsersTags = db.collection('UsersTags');
    //console.log('inserting answer : '+ answer.answer_id);
    UsersTags.insertOne(usertags,
        function(err, result) {
            callback(result);
        });
}

function insertManyRecords(db,usertagsCollection,callback){
    var UsersTags = db.collection('UsersTags');
    //console.log('inserting answer : '+ answer.answer_id);
    UsersTags.insertMany(usertagsCollection,
        function(err, result) {
            callback(result);
        });
}

function InsertUsers( folder,db, callback) {
    fs.readdir(folder, function(err, data) {
        // Each folder name represents a machine, so get the name and add the machine to
        // the database.
        data.forEach(function (file) {
            //Add a vehicle to the database, then parse sensor files
            InsertUsersFromFile(db, folder+"\\"+file, function (res) {
                callback(res);
            });

        });

    });

}

function InsertUsersFromFile(db, file, callback)
{
    var stream = fs.createReadStream(file);
    console.log(file);
    var recs = [];
    var i = 0;
    csv
        .fromStream(stream, {headers : ["Id","Reputation","CreationDate","DisplayName","LastAccessDate","WebsiteUrl","Location","AboutMe","Views","UpVotes","DownVotes","ProfileImageUrl","EmailHash","Age","AccountId"]})
        .on("data", function(userstags){
            //console.log(userstags);
           // getNextSequence(db,"UserId",function (res) { });
                userstags._id = i++;
                recs.push(userstags);
        })
        .on("end", function(){
            insertManyUserRecords(db, recs, function (res) {
                console.log("done");
            });

        });

}

function insertManyUserRecords(db,usertagsCollection,callback){
    var UsersTags = db.collection('Users');
    UsersTags.insertMany(usertagsCollection,
        function(err, result) {
            callback(result);
        });
}

function writeAllUsersTagsToFile(folder,db,callback){
    var wcsvStream = csv.createWriteStream({headers : ["userid","tagname","weight"]}),
        writableStream = fs.createWriteStream(folder+"userstags.csv");
    writableStream.on("finish", function(){
        console.log("DONE!");
        wcsvStream.end();
    });
    wcsvStream.pipe(writableStream);
    var UsersTags = db.collection('UsersTags').find().toArray(function(err, docs) {
        if (docs.length){
            
            docs.forEach(function (item,index) {
               // console.log(index);
                
                wcsvStream.write(
                    {   userid: item.userid,
                             tagname:item.tagname,
                             weight:item.weight
                    });
            });
            
        }else{
            console.log('isnt exists');
        }

    });
}

function createVectorForEachUser(folder,db,callback){
    //-------------- prepare for write------------------
    var wcsvStream = csv.createWriteStream({}),
        writableStream = fs.createWriteStream(folder+"usersTagsMatrix.csv");
    writableStream.on("finish", function(){
        console.log("DONE!");
        wcsvStream.end();
    });
    wcsvStream.pipe(writableStream);
    //-------------------------------------------------
    var stream = fs.createReadStream('./data/tags.csv');
    var tags = [];
    csv
        .fromStream(stream, {headers : ["tagname"]})
        .on("data", function(tag){
            tags.push(tag.tagname);
        })
        .on("end", function(){
            wcsvStream.write(tags);
            db.collection('Users').find({},
                {Id:1, _id:0}).toArray(function(err, users) {
                if (users.length){
                    forEachAsync.forEachAsync(users, function (next1, user, index1, array1) {
                        var row = [];
                        db.collection('UsersTags').find({userid:user.Id},{tagname:1,weight:1, _id:0})
                            .toArray(function(err, thisUserTagRec) {
                                _tags = thisUserTagRec.map(function(UserTag){
                                    return UserTag.tagname;
                                });
                                _weights = thisUserTagRec.map(function(UserTag){
                                    return UserTag.weight;
                                });
                                tags.forEach(function (tag, index) {
                                    if(_tags.indexOf(tag)== -1) {
                                        row.push(0);
                                    } else {
                                        row.push(_weights[_tags.indexOf(tag)]);
                                    }
                                });
                                wcsvStream.write(row);
                            });
                        next1();
                    }).then(function () {
                        console.log("Done!");
                    });
                    
                }
            });
        });
}

var walk = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function(file) {
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};

function getNextSequence(db,name,callback) {
    var counters = db.collection('counters');
    counters.updateOne(
        { _id: name },
        {
            $inc: {  "seq" : 1 }
        }, function(err, result) {
            //console.log(result);
            counters.find({_id: name}).toArray(function(err, docs) {
                //console.log(docs[0].seq);
                callback(docs[0].seq);

            });
        });


}

function follow(follower, followee,callback) {
    getDB(function (db) {
        db.collection('follow').
        insertOne({"follower":follower,
            "followee": followee},
            function(err, result) {
                callback(result);
            });
    });
}

function unfollow(follower, followee,callback) {
    getDB(function (db) {
        db.collection('follow').deleteOne(
            {"follower": follower, "followee": followee},
            function (err, results) {
                callback(results);
            }
        );
    });
}

function findfollowers(user, callback) {
    getDB(function (db) {
        db.collection('follow').find({"followee": user}, {follower:1, _id:0}).
        toArray(function(err, followers) {
            getUsersDetails(followers.map(function (item) {
                return item.follower
            }), function (res) {
                callback(res);
            });
        }); 
    });
}

function findfollowees(user, callback) {
    getDB(function (db) {
        db.collection('follow').find({"follower": user}, {followee:1, _id:0}).
        toArray(function(err, followees) {
            getUsersDetails(followees.map(function (item) {
                return item.followee
            }), function (res) {
                callback(res);
            });
        });
    });
}

function getUsersDetails(IdsList, callback) {
    getDB(function (db) {
        db.collection('Users').find({"Id": {$in: IdsList}}).toArray(function (err, users) {
            callback(users);
        });
    });
}

function getUsersDetailsByIndex(IdsList, callback) {
    getDB(function (db) {
        db.collection('Users').find({"_id": {$in: IdsList}}).toArray(function (err, users) {
            callback(users);
        });
    });
}

function getUserInfoFromLocalDB(token, userId, callback) {
    getDB(function (db) {
        db.collection('Users').find({"Id": userId}).toArray(function (err, user) {
            if(!user.token)
            {
                db.collection('Users').updateOne(
                    { "Id": userId },
                    {
                        $set: { "token": token }
                    }
                )
            }
            callback(user);
        });
    });
}

function getUserInfoFromStackExchange(token, callback) {
    var url = "me?order=desc&sort=creation&access_token="+token;
    issueStackExchangeAPIRequest(token, url, function (user){
        //TODO check if the account id is there
        var account_id = user.items[0].account_id;
        getUserInfoFromLocalDB(token, account_id, function (user) {
            callback(user);
        });
    });
}
/*
 Get the most recent posts (Q & A) by my followees
 */
function getFolloweesPosts(token, followeesIdsList, callback) {
    var postsURL = "users/"+followeesIdsList+"/posts?"+
        "sort=activity&access_token="+token;
    //Get the posts by my followees
    issueStackExchangeAPIRequest(postsURL, function (posts) {
        var questions = [];
        var answers = [];
        //Collect 5 questions and 5 answers
        var BreakException = {};
        try {
            for (k in posts) {
                var post = posts[k];
                if (post.post_type === 'question' && questions.length <6) {
                    questions.push(post.post_id);
                }
                if ((post.post_type === 'answer' && answers.length <6)){
                    answers.push(post.post_id);
                }
                if(questions.length === 5 && answers.length === 6)
                    throw BreakException;
            }
        } catch (e) {
            if (e !== BreakException) throw e;
        }
        var apiQURL = "questions/"+questions.join(';')+"?sort=activity"+
        "&access_token="+token;
        var apiAURL = "answers/"+answers.join(';')+"?sort=activity"+
            "&access_token="+token;
        issueStackExchangeAPIRequest(apiQURL, function (questions) {
            issueStackExchangeAPIRequest(apiAURL, function (answers) {
                callback(
                    JSON.stringify({
                    "questions":questions,
                    "answers": answers
                })
                );
            });
        });
    });
}

function issueStackExchangeAPIRequest(url, callback){
    var reqData = {
        url: "https://api.stackexchange.com/2.2/"+url+"&site=stackoverflow&key="+config.key,
        method:"get",
        headers: {'Accept-Encoding': 'gzip'}
    }
    var gunzip = zlib.createGunzip();
    var json = "";
    gunzip.on('data', function(data){
        json += data.toString();
    });
    gunzip.on('end', function(){
        var jsonObj = JSON.parse(json);
        callback(jsonObj);
    });
    request(reqData)
        .pipe(gunzip);
}

function getRecommendations(userId, callback){
    getDB(function (db) {
        db.collection('Users').find({"Id": userId}).toArray(function (err, users) {
            //TODO check if user exists


            var userIdInFile = users[0]._id - 2;
            console.log(userIdInFile);
            var stream = fs.createReadStream(config.recommendFile);
            var recommended_ids = [];
            csv
                .fromStream(stream, {headers : ["userid","recommended_user_id","weight"]})
                .on("data", function(recommendation){
                    //
                    if (recommendation.userid == userIdInFile) {
                        recommended_ids.push(parseInt(recommendation.recommended_user_id) + 2);
                    }
                })
                .on("end", function(){
                    getUsersDetailsByIndex(recommended_ids, function (users) {
                        callback(users);
                    });
                });
        });
    });
}
