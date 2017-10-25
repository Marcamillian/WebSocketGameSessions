StateTemplate = require('./stateTemplate.js')
PlayerTemplate = require('./playerTemplate.js')

let gameStateManager = function(){
    let gameStates = {}; // array of all the game states

    let update = (gameRef, testState)=>{

        var gameState = (testState) ? testState : gameStates[gameRef]

        // updating game
        switch(gameState.gamePhase){
            case "lobby":

                // v2 - do we have between 5 & 10 players
            
                // array of ready values for the players
                let playersReady = gameState.players.map((player)=>{
                    return player.ready
                })

                if(playersReady.length > 10) throw new Error("Too many players")


                if(playersReady.includes(false) || playersReady.length < 5){ // someone unready || not enough
                    // do nothing

                        
                }else{
                    assignRoles(gameState.players)
                    gameState.gamePhase = 'proposal'    // go to the next step

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

        gameStates[gameKey] = StateTemplate()
    }

    let createSessionKey = (length)=>{
        return Math.random().toString(36).substring(2,2+length)
    }

    let getGameState = (sessionKey)=>{

        if(gameStates[sessionKey]){

            let returnState = {};

            let targetState = gameStates[sessionKey];
            returnState['players'] = targetState.players.map( (playerInfo)=>{ return {playerName: playerInfo.playerName,
                                                                                      president: playerInfo.president,
                                                                                      chancellor: playerInfo.chancellor,
                                                                                      ready: playerInfo.ready,
                                                                                      prevGov: playerInfo.prevGov,
                                                                                      proposedChancellor: playerInfo.proposedChancellor,
                                                                                      voteCast: playerInfo.voteCast }
                                                                            })
            returnState['gamePhase'] = targetState.gamePhase;
            returnState['voteFailTrack'] = targetState.voteFailTrack;
            returnState['policyTrackFascist'] = targetState.policyTrackFascist;
            returnState['policyTrackLiberal'] = targetState.policyTrackLiberal;

            return returnState
        }else{
            throw new Error(`No game with the key ${sessionKey}`)
        }


    }

    let joinGame = (sessionKey, playerRef, playerName)=>{
        if(gameStates[sessionKey]){

            var newPlayer = PlayerTemplate();
            newPlayer.playerName = playerName;
            newPlayer.playerRef = playerRef;

            gameStates[sessionKey].players.push( newPlayer );

            return true;
        }else{
            throw new Error( "session doesn't exist")
        }
    }

    let leaveGame = (sessionKey, playerRef)=>{
        if(gameStates[sessionKey]){
            gameStates[sessionKey].players = gameStates[sessionKey].players.filter((player)=>{ return player.playerRef != playerRef })
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
 
    let getGameForPlayer= (userId, suppliedStates)=>{

        let states = (suppliedStates) ? suppliedStates : gameStates // alt test if you want to mock the gameStates
        let stateRefs = Object.keys(states) // get the games of the gameStates

        // loop over the games
        for(var i=0; i < stateRefs.length; i++){
            let inGame = false;
            states[stateRefs[i]].players.forEach((player)=>{
                if(player.playerRef == userId) return inGame = true
            })

            if(inGame)return stateRefs[i]
        }

        // if not found return nothing
        return undefined
    }

    let getPrivatePlayerInfo = (gameRef, userId, suppliedState)=>{
        return {character: '', allignment: '', teamMates:[]}
    }



    // === affect game state ===

    let readyPlayer = (gameRef, playerRef, testState )=>{

        // use the passed state or the internal state with the Ref
        let gameState = (testState) ? testState : gameStates[gameRef]

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

    let proposeChancellor = (gameRef, playerRef, testState)=>{

        let gameState = (testState) ? testState : gameStates[gameRef]

        let matchedPlayers = gameState.players.filter((player)=>{return player.playerRef == playerRef})
        
        if(matchedPlayers.length == 1){
            matchedPlayers[0].proposedChancellor = true;
        }else if(matchedPlayers.length >1)  throw new Error("Multiple players with this playerRef")
        else throw new Error("No players with that playerRef")

        return gameState
    }

    let castVote = (gameRef, playerRef, vote, testState)=>{

        let gameState = (testState) ? testState : gameStates[gameRef]

        // throw if values not set
        if(vote == undefined) throw new Error("Vote not defined")
        if(playerRef == undefined) throw new Error("PlayerRef not defined")

        let targetPlayer = gameState.players.filter((player)=>{ return player.playerRef == playerRef })

        if(targetPlayer.length == 1){
            targetPlayer[0].voteCast = vote
        }else if(targetPlayer >1) throw new Error("Multiple players with this playerRef")
        else throw new Error("No players with that playerRef")

        return gameState
    }

    let policyDiscard = (gameRef, policyType, testState)=>{

        let gameState = (testState) ? testState : gameStates[gameRef]

        let policyHand = gameState.policyHand
        let policyIndex = policyHand.indexOf(policyType)

        if(policyIndex != -1){ //if there is a policy of that hand
            var head = policyHand.slice(0, policyIndex)
            var tail = policyHand.slice(policyIndex)
            var card = tail.shift()
            
            gameState.policyHand = head.concat(tail)
            gameState.policyDiscardPile.push(card)

        }else throw new Error("No policy of that type")

        return gameState
    }

    let assignRoles = (playerList)=>{

        let result = []
        let fascistCount = undefined
        let positions = []

        // choose how many fascists we need
        if(playerList.length < 5) throw new Error("not enough players to assign roles")
        else if( playerList.length < 7) fascistCount = 2;
        else if( playerList.length < 9) fascistCount = 3;
        else if( playerList.length <= 10) fascistCount = 4;
        else {throw new Error("too many players to assign roles")}

        // == pick the indexes of the fascists == 
        for(var i=0; i<playerList.length;i++) positions.push(i) //all possible positions in an array
        positions = shuffleArray(positions)// shuffle all of the numbers

        //set everyone as a liberal
        playerList.map((player)=>{
            player.character = 'liberal';
            player.allignment = 'liberal';
        })

        // make the first X in the randomised position array fascist        
        for (var i=0; i< fascistCount; i++){
            playerList[positions[i]].allignment = 'fascist';
            playerList[positions[i]].character = 'fascist'
        }
        // make the first in the randomised array hitler
        playerList[positions[0]].character = 'hitler'

        return playerList
    }

    let shuffleArray = (array)=>{ // https://github.com/Daplie/knuth-shuffle
        var currentIndex = array.length
        var tempValue;
        var randomIndex;

        // While there are still elements to shuffle
        while(0 != currentIndex){
            // Pick a remaining element
            randomIndex = Math.floor(Math.random()*currentIndex);
            currentIndex -= 1;

            // swap it with the current element
            tempValue = array[currentIndex];
            array[currentIndex] = array[randomIndex]
            array[randomIndex] = tempValue
        }

        return array
    }


    // function to search for playerRef

    return Object.create({
        createNewGame: createNewGame,
        initGame: initGame, // for testing purposes
        joinGame:joinGame,
        leaveGame: leaveGame,

        getGameState: getGameState,
        getPlayerRefs: getPlayerRefs,
        getGameForPlayer: getGameForPlayer,
        getPrivatePlayerInfo: getPrivatePlayerInfo,

        update: update,
        readyPlayer: readyPlayer,
        proposeChancellor: proposeChancellor,
        castVote: castVote,
        policyDiscard: policyDiscard,
        assignRoles: assignRoles
    })

}


module.exports = gameStateManager