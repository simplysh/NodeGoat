"use strict";

var express = require("express");
var cookieParser = require("cookie-parser");
var genuuid = require('uuid').v1;
var favicon = require("serve-favicon");
var bodyParser = require("body-parser");
var session = require("express-session");
var csrf = require('csurf');
var consolidate = require("consolidate"); // Templating library adapter for Express
var swig = require("swig");
var helmet = require("helmet");
var MongoClient = require("mongodb").MongoClient; // Driver for connecting to MongoDB
var http = require("http");
var nosniff = require('dont-sniff-mimetype');
var app = express(); // Web framework to handle routing requests
var routes = require("./app/routes");
var config = require("./config/config"); // Application config properties
var fs = require("fs");
var https = require("https");
var path = require("path");
var httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname, "./artifacts/cert/server.key")),
    cert: fs.readFileSync(path.resolve(__dirname, "./artifacts/cert/server.crt"))
};

MongoClient.connect(config.db, function(err, db) {
    if (err) {
        console.log("Error: DB: connect");
        console.log(err);

        process.exit(1);
    }
    console.log("Connected to the database: " + config.db);

    app.disable("x-powered-by");

    // Prevent opening page in frame or iframe to protect from clickjacking
    app.use(helmet.xframe());

    // Prevents browser from caching and storing page
    app.use(helmet.noCache());

    // Allow loading resources only from white-listed domains
    app.use(helmet.csp());

    // Allow communication only on HTTPS
    app.use(helmet.hsts());

    app.use(helmet.xssFilter({ setOnOldIE: true }));

    app.use(helmet.ieNoOpen())

    // Forces browser to only use the Content-Type set in the response header instead of sniffing or guessing it
    app.use(nosniff());

    // Adding/ remove HTTP Headers for security
    app.use(favicon(__dirname + "/app/assets/favicon.ico"));

    // Express middleware to populate "req.body" so we can access POST variables
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        // Mandatory in Express v4
        extended: false
    }));

    // Enable session management using express middleware
    app.use(session({
        // TODO: Add another vuln?
        genid: function(req) {
           return genuuid() // use UUIDs for session IDs
        },
        secret: config.cookieSecret,
        // Both mandatory in Express v4
        saveUninitialized: true,
        resave: true,
        key: "sessionId",
        cookie: {
            httpOnly: true,
            secure: true
        }
    }));

    // Fix for A8 - CSRF
    // Enable Express csrf protection
    app.use(csrf());
    // Make csrf token available in templates
    app.use(function(req, res, next) {
        res.locals.csrftoken = req.csrfToken();
        next();
    });

    app.use(cookieParser());

    // Register templating engine
    app.engine(".html", consolidate.swig);
    app.set("view engine", "html");
    app.set("views", __dirname + "/app/views");
    app.use(express.static(__dirname + "/app/assets"));

    // Application routes
    routes(app, db);

    // Template system setup
    swig.setDefaults({
        autoescape: true // default value
    });

    // Use secure HTTPS protocol
    https.createServer(httpsOptions, app).listen(config.port,  function() {
        console.log("Express https server listening on port " + config.port);
    });

});
