const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const http = require("superagent");

// const { secret, redirectUri, clientId } = require("../../shared/AppData.js");

const clientId = process.env.CLIENT_ID;
const secret = process.env.SECRET;
const redirectUri = process.env.REDIRECT_URI;

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan("tiny"));
app.use(cors());
app.options("*", cors());

app.get("/", (req, res) => {
    res.send({
        message: "hello there",
    });
});

app.get("/requestToken/:state/:code", (req, res) => {
    state = req.params.state;
    code = req.params.code;

    const tokenUrl = "https://www.reddit.com/api/v1/access_token";

    var form = {
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
    };

    var request = http
        .post(tokenUrl)
        .type("form")
        .send(form)
        .auth(clientId, secret)
        .set(
            "User-Agent",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"
        )
        .set("Content-Type", "application/x-www-form-urlencoded")
        .then(response => {
            res.send(response.body);
        })
        .catch(error => {
            res.send(error);
        });
});

async function storeSaved(posts, whereToSave) {
    posts.forEach(post => {
        if (!post.data.thumbnail) {
            post.data.thumbnail =
                "https://proxy.duckduckgo.com/iu/?u=http%3A%2F%2F1000logos.net%2Fwp-content%2Fuploads%2F2017%2F05%2FColor-Reddit-Logo.jpg&f=1";
        }
        whereToSave.push(post.data);
    });
}

async function getAllSavedPosts(username, after, token) {
    var savedPosts = [];

    do {
        const url = `https://oauth.reddit.com/user/${username}/saved.json?&limit=100&after=${after}`;

        var posts = await http
            .get(url)
            .set("Authorization", "Bearer " + token, { type: "auto" })
            .set("User-Agent", "reddit-transfer/v1.0 by paintballcore")
            .set("Content-Type", "application/json")
            .then(response => {
                after = response.body.data.after;
                storeSaved(response.body.data.children, savedPosts);
            })
            .catch(error => {
                console.log("error in getall: " + error);
            });
    } while (after);

    return savedPosts;
}

var oldSavedPosts = [];

app.get("/getSaved/:username/:token", (req, res) => {
    var token = req.params.token;
    var username = req.params.username;
    var after = "";


    getAllSavedPosts(username, after, token)
        .then(posts => {
            oldSavedPosts = posts;
            res.send(posts);
        })
        .catch(error => {
            res.send(error);
        });
});

app.get("/getUsername/:token", (req, res) => {
    const url = `https://oauth.reddit.com/api/v1/me`;
    var token = req.params.token;

    http.get(url)
        .set("Authorization", "Bearer " + token, { type: "auto" })
        .set("User-Agent", "reddit-transfer/v1.0 by paintballcore")
        .set("Content-Type", "application/json")
        .then(response => {
            res.send(response.body);
        })
        .catch(error => {
            res.send(error);
        });
});

app.get('/save/:token', (req, res) => {
    var token = req.params.token;
    var tempPosts = [];


    oldSavedPosts.forEach(post => {
        var name = post.name;
        const url = `https://oauth.reddit.com/api/save?id=${name}&category=`;
        http.post(url)
        .set('Authorization', 'Bearer ' + token, {type: "auto"})
        .then(response => {
            res.send(response.body);
        })
        .catch(error => {
            res.send(error.body);
        })
        
    });


})
const port = process.env.PORT || 8081
app.listen(port);
