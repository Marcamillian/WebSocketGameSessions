`use strict`;

const session = require('express-session')
const express = require('express');
const http = require('http');
const uuid = require('uuid')

const WebSocket = require('ws');
 
const app = express();

// we need tyhe same instance of the session parser in express and websocket servers

const sessionParser = session({
    saveUninitialized: false,
    secret: 'passOpen',
    resave: false
})

// serve files from the right folder
app.use(express.static('./../client'));
app.use(sessionParser);

app.post('/login', (req, res)=>{
    // "Log in" user and set userId to session
    const id= uuid.v4();

    console.log(`Updating session for user ${id}`);
    req.session.userId = id;
    res.send({result:"OK", message: 'Session updated'})
})

app.delete('./logout', (req, res)=>{
    console.log('Destroying session');
    req.session.destroy();
    response.send({result:'OK', message:'Session destroyed'})
})

// create the http server ourselves
const server = http.createServer(app)

const wss = new WebSocket.Server({
    
})