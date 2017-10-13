let gameStateManager = function(){
    let gameStates = {}; // array of all the game states

    const stateTemplate = {
        gamePhase: 'lobby', // where in the state machine the state is
        players:[], // collection of player objects
        policyDraw:[], // collection of card objects
        policyDiscard:[], // collection of card objects
        voteFailTrack:[false, false, false]  // 
    }
    const playerTemplate = {
        playerRef: undefined, // string to link req.session
        playerName: undefined, // string for display name
        ready: false,           // ready to start the game
        allignment: undefined, // string to show what side they are on
        character: undefined, // if they are fascist/hitler/liberal
        prevGov: false,       // if they were in the last successful gov 
    }

    let update = (gameState)=>{
        // updating game
        switch(gameState.gamePhase){
            case "lobby":

                // array of ready values for the players
                let playersReady = gameState.players.map((player)=>{
                    return player.ready
                })

                if(playersReady.includes(false)){ // if everyone is ready
                    // do nothing

                        
                }else{
                    gameState.gamePhase = 'proposal'    // go to the next step

                    // generate the roles
                        // assign them to players
                        // send private information
                }

            break;
            case "proposal":

                let chancellorProposition = gameState.players.map((player)=>{
                    return player.proposedChancellor
                })

                if(chancellorProposition.includes(true)){
                    gameState.gamePhase = 'election'
                }else{
                    // do nothing
                }

            break;
            case "election":

                let voteResult = gameState.players.map((player)=>{
                    return player.voteCast
                })

                if(voteResult.includes(undefined)){ // not all votes cast
                    // stay in this state
                }else{
                    let positiveVotes = voteResult.reduce((sum, vote)=>{ return (vote) ? sum+1 : sum },0)
                    let negativeVotes = voteResult.reduce((sum, vote)=>{ return (!vote) ? sum+1 : sum },0)
                    //console.log(`JA: ${positiveVotes} | Nein: ${negativeVotes}`)

                    if(positiveVotes > negativeVotes){ // vote passes
                        // find hitler
                        let chancellor = gameState.players.filter((player)=>{return player.proposedChancellor})[0]
                        // TODO: also need check for facist policy track

                        if(chancellor.character == "hitler"/* && policy track*/){ // if chancellor is hitler
                            gameState.gamePhase = 'endGame'
                        }else{
                            gameState.gamePhase = 'legislative'
                        }   
                    }else{  // vote passes
                        gameState.gamePhase = 'proposal'
                    }
                }


            break;
            case "legislative":

                if(gameState.policyDraw.length == 1 ){
                        let fPolicy = gameState.policyTrackFascist.reduce((sum, value)=>{return (value) ? sum+1: sum })
                        let lPolicy = gameState.policyTrackLiberal.reduce((sum, value)=>{return (value) ? sum+1: sum })
                        if(fPolicy >= 6 || lPolicy >= 5){
                            gameState.gamePhase = "endGame"
                         }else{
                            if(fPolicy > 2){
                                gameState.gamePhase = "power"
                            }else{
                                gameState.gamePhase = "proposal"
                            }
                         }
                }else{
                    // carry on
                }
            break;
            case "power":
                // if power target selected
                    // ==> proposal
            break
            case "endgame":

        }

        return gameState // pass back the updated state
    }
    
    let createNewGame = ()=>{
        let sessionRef = createSessionKey(4)

        try{
            initGame(sessionRef)
        }catch(e){
            console.log(`Couldn't create new game: ${e.message}`)
        }

        return sessionRef // returns the reference to the session you have made
    }

    let initGame = (gameKey)=>{
        if(gameStates[gameKey]){ throw new Error(`Game session ${gameKey} already exists`)} // check that we arn't overwriting something

        gameStates[gameKey] = {
            players: [],
            score: 0
        }
    }

    let createSessionKey = (length)=>{
        return Math.random().toString(36).substring(2,2+length)
    }

    let getGameState = (sessionKey)=>{

        if(gameStates[sessionKey]){

            let returnState = {};

            let states = gameStates[sessionKey];
            returnState['players'] = states.players.map( (playerInfo)=>{ return playerInfo.playerName } )

            return returnState
        }else{
            throw new Error(`No game with the key ${sessionKey}`)
        }


    }

    let joinGame = (sessionKey, playerRef, playerName)=>{
        if(gameStates[sessionKey]){
            return gameStates[sessionKey].players.push({'playerRef':playerRef, 'playerName': playerName, 'ready':false });
        }else{
            throw new Error( "session doesn't exist")
        }
    }

    let leaveGame = (sessionKey, playerRef)=>{
        if(gameStates[sessionKey]){
            gameStates[sessionKey].players = gameStates[sessionKey].players.filter((player)=>{ return player.playerRef != playerRef })
            console.log(gameStates[sessionKey].players)
        }else{
            throw new Error("Session doesn't exist")
        }
    }

    let getPlayerRefs = ( gameRef, suppliedStates )=>{

        let states = ( suppliedStates ) ? suppliedStates : gameStates // alt test if you want to mock gameState

        if(states[gameRef]){
            return states[gameRef].players.map((playerInfo)=>{ return playerInfo.playerRef })
        }else{
            throw new Error (`No game with the key ${gameRef}`)
        }
    }
 
    let getGameForPlayer= (playerRef, suppliedStates)=>{

        let states = (suppliedStates) ? suppliedStates : gameStates // alt test if you want to mock the gameStates
        let stateRefs = Object.keys(states) // get the games of the gameStates

        // loop over the gamestates - return the state key if 
            // 


    }

    // === affect game state ===

    let readyPlayer = (gameState, playerRef )=>{

        if(gameState){
            // look for the player that we are looking for
            let targetPlayer = gameState.players.filter((player)=>{ return player.playerRef == playerRef})

            if(targetPlayer.length == 1){ // if we have exactly one players that matches
                targetPlayer[0].ready = true;
            }else if(targetPlayer.length > 1){
                throw new Error(`More than one player with that reference`)
            }else{
                //throw new Error("Player is not in game")
                throw new Error(`PlayerRef not in game`)
            }
        }else{
            throw new Error("No gameState for this ref")
        }

        return gameState
    }

    let proposeChancellor = (gameState, playerRef)=>{
        let matchedPlayers = gameState.players.filter((player)=>{return player.playerRef == playerRef})
        
        if(matchedPlayers.length == 1){
            matchedPlayers[0].proposedChancellor = true;
        }else if(matchedPlayers.length >1)  throw new Error("Multiple players with this playerRef")
        else throw new Error("No players with that playerRef")

        return gameState
    }

    return Object.create({
        createNewGame: createNewGame,
        initGame: initGame, // for testing purposes
        joinGame:joinGame,
        leaveGame: leaveGame,

        getGameState: getGameState,
        getPlayerRefs: getPlayerRefs,
        getGameForPlayer: getGameForPlayer,

        update: update,
        readyPlayer: readyPlayer,
        proposeChancellor: proposeChancellor
    })

}


module.exports = gameStateManager