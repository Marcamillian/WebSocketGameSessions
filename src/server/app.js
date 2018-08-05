`use strict`;
// npm imports
const session = require('express-session')
const express = require('express');
const http = require('http');
const io = require('socket.io')
const util = require('util')
const socketioSession = require('express-socket.io-session')
 
const GameStateManager = require('./GameStateManager')

// game objects
var app = express();  // express app - for handelling routes
var sessionParser;   // for handelling sessions
var server;           // http server
var wss;              // websocket server
var stateManager = GameStateManager()   

// we need the same instance of the session parser in express and websocket servers
sessionParser = session({
    saveUninitialized: true,
    secret: 'passOpen',
    resave: true
})

// CONFIGURE EXPRESS APP - serve files from the right folder
app.set('port', (process.env.PORT || 8080))
app.use(express.static('./src/client'));
app.use(sessionParser);


// send test gameState
app.put('/gameInstance/:gameRef/stateTest', (req,res)=>{
    try{
        let gameRef = req.params.gameRef;
        let gameState = JSON.parse(req.headers["game-state"])
        let privateInfo = stateManager.getPrivatePlayerInfo(undefined, gameState.players[0].playerRef ,gameState)

        gameState = stateManager.filterGameState(gameState);

        wss.broadcast(gameRef, gameState, privateInfo);

        res.send({result:'OK', messasge:'game state sent to client'})
    }catch(e){
        res.send({result:'Error', mesage: e.message})
    }

})


//  ======  CREATE THE HTTP SERVER  ==== 
server = http.createServer(app)

// CREATE THE WEBSOCKET SERVER
wss = io(server);
wss.use(socketioSession(sessionParser, {autoSave:true}))
// CONFIGURE WEBSOCKET SERVER
wss.on('connection', (ws)=>{

    let currentUserId = ws.id; // current socket
    let oldUserId = ws.handshake.session.wsId
    console.log(`connection from user: ${currentUserId}`)

    if(!oldUserId){ // NOT visited before
        console.log(`First time visitor: ${currentUserId}`);
        // set the session userId
        ws.handshake.session.wsId = currentUserId;
        ws.handshake.session.save();
        // tell the websocket it connected
        ws.emit("connectSuccess");
    }else{ // visited before
        console.log(`returning visitor: ${oldUserId}`)
        
        // find out what game they used to be in
        let gameRef = stateManager.getGameForPlayer(oldUserId)
        // get the player object they used to be (look for players & spectators?)
        // TODO - should this be in an "update playerRef function"
        let oldPlayerObject = stateManager.searchPlayers({ gameRef, searchPairs:{ playerRef:oldUserId }, singleResponseExpected:true })[0];
        oldPlayerObject.playerRef = currentUserId;

        // set the new userID
        ws.handshake.session.wsId = currentUserId;
        ws.handshake.session.save()

        // send the gameState to all players in the game
        wss.broadcast(gameRef)
    }

    ws.on("createGame", ()=>{
        try{
            let response = {
                "result": "OK",
                "type": "gameCreate",
                "data":{
                    "gameRef": stateManager.createNewGame()
                }
            }
            console.log(`New game created : ${response.data.gameRef}`)
            ws.emit("gameCreated", response)
        }catch(e){
            let response = {
                "result": "failed",
                "type": "gameCreate",
                "data":{
                    "errorMessage": `Couldn't create game`,
                    "internalMessage": e.message
                }
            }
            ws.emit("gameCreated", response)
        }
    })

    ws.on("joinGame", ( {playerName = "someName", gameRef="XXXX"} = {} )=>{
        try{
            stateManager.joinGame(gameRef, ws.id, playerName)   // add the player to the game
            
            let data = {
                gameState: stateManager.getGameState(gameRef),
                gameRef: gameRef
            }
            ws.emit("gameJoined",{
                "result": "OK",
                "type": "joinGame",
                "data" : data 
            })
            wss.broadcast(gameRef)  // update everyone in the game
        }catch(e){
            let errorMessage = `Error - joinGame: ${e.message}`
            console.log(errorMessage)
            
            ws.emit("gameJoined",{
                result: "failed",
                type:"joinGame",
                data: {errorMessage: errorMessage}
            })
        }
    })

    ws.on("joinSpectator", ( {gameRef="XXXX"} = {} ) =>{
        try{
            console.log(`Someone trying to spectate gameRef ${gameRef}`)
            stateManager.joinSpectator({gameRef: gameRef, spectatorRef: ws.id })

            ws.emit('spectatorJoined',{
                "result":"OK",
                "type": "joinGame",
                "data": {
                    "gameRef": gameRef
                }
            })
            wss.broadcast(gameRef)
        }catch(e){
            let errorMessage = `Error - Join spectator: ${e.message}`;
            console.log(errorMessage);
            ws.emit("spectatorJoined",{
                result: "failed",
                type:"joinSpectator",
                data:{errorMessage: errorMessage}
            })
        }
        
    })

    ws.on("leaveGame", ( )=>{
        try{
            let userId = ws.id;
            let gameRef = stateManager.getGameForPlayer(userId);

            if(stateManager.getPlayerRefs(gameRef).includes(userId)){   // if the leaving client is a player
                stateManager.leaveGame(gameRef, userId);
            }else if(stateManager.getSpectatorRefs({gameRef}).includes(userId)){ // if the leaving user is a spectator
                stateManager.removeSpectator({gameRef, spectatorRef: userId}) 
            }

            ws.handshake.session.wsId = undefined;
            ws.emit("gameLeft", {result: "OK", type:"leaveGame", data:{message:`Left game ${gameRef}`}})
            wss.broadcast(gameRef)
        }catch(e){
            let errorMessage = `Error - leaveGame: ${e.message}`
            console.log(errorMessage)
            ws.emit("gameLeft",{
                result: "failed",
                type:"leaveGame",
                data: {errorMessage: errorMessage}
            })
        }
    })

    // == GAME STATE ALTERING PLAYER INPUTS

    // ready up in lobby
    ws.on("readyUp", ()=>{
        try{
            let userId = ws.id;
            let gameRef = stateManager.getGameForPlayer(userId);
            let gameState = stateManager.readyPlayer(gameRef, userId)

            gameState = stateManager.update(gameRef)

            wss.broadcast( gameRef )
            ws.emit("playerReady", {
                result:'OK',
                type: "readyUp",
                data:{message: "You are ready"}
            })
        }catch(e){
            let errorMessage = `Error - readyUp : ${e.message}`
            console.log(errorMessage)

            ws.emit("playerReady",{
                result:"failed",
                type:"readyUp",
                data:{ message: errorMessage }
            })
        }
    })

    // select a player
    ws.on("selectPlayer", ({ targetPlayerName="someName" } = {})=>{
        
        try{
            let actingPlayer = ws.id;
            let gameRef = stateManager.getGameForPlayer(actingPlayer);
            
            let targetPlayerRef = stateManager.nameToRef(gameRef, targetPlayerName)

            stateManager.selectPlayer({
                gameRef: gameRef,
                actingPlayer: actingPlayer,
                selectedPlayer: targetPlayerRef
            })
            stateManager.update(gameRef)
            wss.broadcast(gameRef)
            ws.emit("playerSelected",{result: 'OK', type:"selectPlayer", data:{message: `${targetPlayerName} selected`}})
        }catch(e){
            let errorMessage = `Error - selectPlayer : ${e.message}`
            console.log(errorMessage)
            ws.emit("playerSelected",{
                result:"failed",
                type:"selectPlayer",
                data: {errorMessage: errorMessage}
            })
        }
    })

    // vote on a government - vote:Boolean
    ws.on("castVote", ( {vote = undefined} = {})=>{
        try{
            let userId = ws.id;
            let gameRef = stateManager.getGameForPlayer(userId);

            stateManager.castVote(gameRef, userId, vote)
            stateManager.update(gameRef)
            wss.broadcast(gameRef)
            ws.emit("voteRegistered",{ result:'OK', type:"castVote",data:{message:`Vote cast: ${vote}`}})
        }catch(e){
            let errorMessage = `Error - vote : ${e.message}`
            console.log(errorMessage)
            ws.emit("voteRegistered",{
                result:"failed",
                type:"castVote",
                data:{errorMessage: errorMessage}
            })
        }
    })

    // choose policy
    ws.on("discardPolicy", ( {policyDiscard="fascist/liberal"} = {} )=>{
        
        try{
            let userId = ws.id;
            let gameRef = stateManager.getGameForPlayer(userId);
            let startPhase = stateManager.getGameState(gameRef).gamePhase;
            let endPhase

            stateManager.policyDiscard(gameRef, policyDiscard);
            let gameState = stateManager.update(gameRef)
            endPhase = gameState.gamePhase;

            if(startPhase != endPhase){;
                gameState = stateManager.clearVotes({gameRef: gameRef})
            }

            wss.broadcast(gameRef);
            ws.emit("policyDiscarded", { result:'OK', type:"discardPolicy", data:{message:`Policy discarded: ${policyDiscard}`}} )
        }catch(e){
            let errorMessage = `Error - discardPolicy: ${e.message}`;
            console.log(errorMessage)
            ws.emit("policyDiscarded",{
                result: "failed",
                type: "discardPolicy",
                data: {errorMessage: errorMessage}
            })
        }

    })
});

wss.broadcast = (gameRef, gameState = stateManager.getGameState(gameRef), privateInfo)=>{

    try{
        let playersInGame = stateManager.getPlayerRefs(gameRef) // some call to the state manager for the playerRefs
        let spectatorsInGame = stateManager.getSpectatorRefs({gameRef:gameRef});

        let clientsInGame = Object.keys(wss.sockets.connected).filter((socketKey)=>{ return playersInGame.includes(socketKey) })

        clientsInGame.forEach((socketKey)=>{ // if the clients playerRef is included in game - broadcast to them

            let ws = wss.sockets.connected[socketKey]
            let hiddenInfo = (privateInfo == undefined) ? stateManager.getPrivatePlayerInfo(gameRef,ws.id) : privateInfo;

            let response = {
                result: 'OK',
                type: 'updateGameState',
                data:{
                    gameRef: gameRef,
                    gameState: gameState,
                    privateInfo: hiddenInfo
                }
            }

            ws.emit("updateGameState",response) // send the gamestate to the players in the game
            //ws.send(JSON.stringify(message));
        })

        spectatorsInGame.forEach((socketKey)=>{
            let ws = wss.sockets.connected[socketKey];
            let response = {
                result: "OK",
                type: "updateSpectator",
                data:{
                    gameRef: gameRef,
                    gameState: gameState
                }
            }
            ws.emit("updateSpectator", response)
        })

    }catch(e){
        throw new Error(`websocket broadcast failed || ${e.message}`)
    }
}

// START THE SERVER
server.listen(app.get('port'), ()=> console.log(`Listening on port ${app.get('port')}`));




// OLD HTML ENDPOINT TRIGGERS

// ===  EXPRESS APP - ROUTING TRIGGERS for PLAYER input
{

    // login to the game
    app.post('/createSession', (req, res)=>{
        if (!req.session.userId){
            res.send({result:"OK", message: 'Session updated '})
        } else {
            // get the game that they are in - this makes sure that the actually have a session
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
}
