`use strict`;
// npm imports
const session = require('express-session')
const express = require('express');
const http = require('http');
const uuid = require('uuid')
const WebSocket = require('ws');
const util = require('util')
 
const GameStateManager = require('./GameStateManager')

// game objects
var app = express();  // express app - for handelling routes
var sessionParser;   // for handelling sessions
var server;           // http server
var wss;              // websocket server
var stateManager = GameStateManager()   


// we need the same instance of the session parser in express and websocket servers
sessionParser = session({
    saveUninitialized: false,
    secret: 'passOpen',
    resave: false
})

// CONFIGURE EXPRESS APP - serve files from the right folder
app.set('port', (process.env.PORT || 8080))
app.use(express.static('./src/client'));
app.use(sessionParser);


// ===  EXPRESS APP - ROUTING TRIGGERS for PLAYER input


// login to the game
app.post('/login', (req, res)=>{
    // "Log in" user and set userId to session
    const id= uuid.v4();

    if (!req.session.userId){
        req.session.userId = id; // if there is already a session under that user
        res.send({result:"OK", message: 'Session updated '})
    } else {
        // get the game that they are in
        let gameRef = stateManager.getGameForPlayer(req.session.userID)
        res.send({result:"OK", message: "You are already in a game"})
    } 
    
})

// remove your login session
app.delete('/logout', (request, response) => {
  console.log('Destroying session');
  request.session.destroy();
  response.send({ result: 'OK', message: 'Session destroyed' });
});

// create a new game session
app.put('/gameinstance', (req, res)=>{
    let gameRef = stateManager.createNewGame() // create the session - returns the ref

    res.send({'result':"OK", 'gameRef': gameRef})
    
})

// get the gamestate for the session with the reference in the URL
app.get('/gameinstance/:gameRef', (req, res)=>{
    let gameState = stateManager.getGameState(req.params.gameRef)
    console.log(gameState)

    res.send({result: 'OK', gameState: gameState})
})

// joiningGame via URL
app.post('/gameinstance/:gameRef/players', (req, res)=>{
    let playerName = req.headers["player-name"];
    let gameRef = req.params.gameRef
    
    stateManager.joinGame(gameRef, req.session.userId, playerName)
    req.session.currentGame = gameRef
    
    res.send({result:'OK', 'gameState':stateManager.getGameState(gameRef)})

    // broadcast the new gamestate
    wss.broadcast(gameRef)
})

// leave game via URL
app.delete('/gameinstance/:gameRef/players', (req, res)=>{
    
    let gameRef = req.params.gameRef
    
    stateManager.leaveGame(gameRef, req.session.userId)
    delete req.session.currentGame

    res.send({result:'OK', message:"Left the game"})
})

// == GAME STATE ALTERING PLAYER INPUTS ==

// ready up in the lobby
app.post('/gameinstance/:gameRef/players/ready', (req, res)=>{
    // get the game and player references
    let gameRef = req.params.gameRef;
    let playerID = req.session.userId

    // ready the player -- the gameState playerObject doesn't have a playerRef -- the getGameState doesn't include playerRefs
    let gameState = stateManager.readyPlayer(gameRef, playerID)
    gameState = stateManager.update(gameRef)
    endPhase = gameState.gamePhase;

    // send back the updated game state
    wss.broadcast( gameRef )
    res.send({result:'OK', message:"You are ready"})
})

// select a player
app.put(`/gameInstance/:gameRef/players/:targetPlayer`,(req, res)=>{ // general purpose select player endpoint
    let gameRef = req.params.gameRef;
    let targetPlayer = req.params.targetPlayer;
    let targetPlayerRef = stateManager.nameToRef(gameRef, targetPlayer)
    let actingPlayerRef = req.session.userId;

    try{
        stateManager.selectPlayer({gameRef: gameRef,actingPlayer: actingPlayerRef, selectedPlayer: targetPlayerRef })
        stateManager.update(gameRef)
        wss.broadcast( gameRef );
        res.send({result:'OK', message:`${targetPlayer} suggested`})
    }catch(e){
        console.log(e)
        res.send({result:'Error', message:e.message})
    }
    
})

// vote on a govornment
app.put(`/gameInstance/:gameRef/elect/:vote`,(req,res)=>{
    let gameRef = req.params.gameRef;
    let playerID = req.session.userId;
    let vote = req.params.vote;

    try{
        stateManager.castVote(gameRef, playerID, vote) // cast the vote
        stateManager.update(gameRef)    // update
        wss.broadcast(gameRef)
        res.send({result:'OK', message:'Vote cast'})
    }catch(e){
        console.log(e)
        res.send({result:'Error', message: e.message})
    }
})

// choose policy
app.put(`/gameInstance/:gameRef/policyDiscard/:policyDiscard`,(req,res)=>{
    let gameRef = req.params.gameRef;
    let playerID = req.session.userId;
    let policyDiscard = req.params.policyDiscard
    let startPhase = stateManager.getGameState(gameRef).gamePhase
    let endPhase;

    try{
        stateManager.policyDiscard(gameRef,policyDiscard); // get rid of the policy
        let gameState = stateManager.update(gameRef)
        endPhase = gameState.gamePhase

        console.log(`Game Phase : ${startPhase} --> ${endPhase}`)
        
        if(startPhase != endPhase){
            console.log("New government")
            debugger;
            gameState = stateManager.rotateGovernment({gameRef: gameRef}) // set next president
            gameState = stateManager.clearVotes({gameRef: gameRef}) // clear the votes for players
        }

        wss.broadcast(gameRef)
        res.send({result: 'OK', message: 'POlicy Discarded'})
    }catch(e){
        console.log(e);
        res.send({result: 'Error', message:e.message})
    }
})

// send test gameState
app.put('/gameInstance/:gameRef/stateTest', (req,res)=>{
    try{
        let gameRef = req.params.gameRef;
        let gameState = JSON.parse(req.headers["game-state"]);
        let privateInfo = stateManager.getPrivatePlayerInfo(undefined, gameState.players[0].playerRef ,gameState)

        wss.broadcast(gameRef, gameState, privateInfo);

        res.send({result:'OK', messasge:'game state sent to client'})
    }catch(e){
        res.send({result:'Error', mesage: e.message})
    }



})


//  ======  CREATE THE HTTP SERVER  ==== 
server = http.createServer(app)

// CREATE THE WEBSOCKET SERVER
wss = new WebSocket.Server({
    verifyClient: (info, done)=>{
        console.log('Parsing session from request....')
        sessionParser(info.req, {}, ()=>{
            console.log(`Session is parsed for user: ${info.req.session.userId}`)

            // we can reject the connection by returning false to done(). For example, reject here is uses is unknown
            done(info.req.session.userId)
        })
    },
    server
})
// CONFIGURE WEBSOCKET SERVER
wss.on('connection', (ws,req)=>{

    ws.userId = req.session.userId  // adding the userID to the websocket you can get to
 
    ws.on('message', (messageString)=>{

        // get a list of the connected clients - wss.clients

        let message = JSON.parse(messageString)

        switch(message.type){
            case 'joinGame':
                try{
                    let response = {
                        "result": "OK",
                        "type": "joinGame",
                        "data":{
                            "gameRef": message.data.gameRef
                        }
                    }
                    
                    stateManager.getGameState(message.data.gameRef)
                    ws.send(JSON.stringify(response))
                }catch(e){
                    console.error(e)
                    
                    let response = {
                        "result": "Failed",
                        "type": "joinGame",
                        "data": {
                            "errorMessage": `Couldn't find gameRef ${message.gameRef}`
                        }
                    }

                    ws.send(JSON.stringify(response))
                }
            
            break
            case 'createGame':

                let response = {
                    "result":"OK",
                    "type":"gameCreate",
                    "data": {
                        "gameRef": stateManager.createNewGame()
                    }
                }

                console.log(`New game created ${response.data.gameRef}`)
                ws.send(JSON.stringify(response)) // create a new game and return the reference
            break;
            default:
                console.log("some message sent without a type", message)
            break;

        }

    })


    let gameRef = stateManager.getGameForPlayer(ws.userId)
    // if already in a game
    if(gameRef != undefined){
        wss.broadcast(gameRef)
    }
    
});

wss.broadcast = (gameRef, gameState = stateManager.getGameState(gameRef), privateInfo)=>{

    let playersInGame = stateManager.getPlayerRefs(gameRef) // some call to the state manager for the playerRefs
    let clientsInGame = [...wss.clients].filter((ws)=>{return playersInGame.includes(ws.userId)});

    clientsInGame.forEach((ws)=>{ // if the clients playerRef is included in game - broadcast to them

        let hiddenInfo = (privateInfo == undefined) ? stateManager.getPrivatePlayerInfo(gameRef,ws.userId) : privateInfo;

        let message = {
            result: 'OK',
            type: 'updateGameState',
            gameRef: gameRef,
            gameState: gameState,
            privateInfo: hiddenInfo
        }

        if(playersInGame.includes(ws.userId)){
            ws.send(JSON.stringify(message)) // send the gamestate to the players in the game
        }
    })
}

// START THE SERVER
server.listen(app.get('port'), ()=> console.log(`Listening on port ${app.get('port')}`));