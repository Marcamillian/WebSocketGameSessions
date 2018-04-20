StateTemplate = require('./stateTemplate.js')
PlayerTemplate = require('./playerTemplate.js')

const gameStateManager = function(){
    let gameStates = {}; // array of all the game states

    const update = (gameRef, testState)=>{

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
                    return gameState// exit and don't continue
                }

                // if all the votes cast
                let positiveVotes = voteResult.reduce((sum, vote)=>{ return (vote) ? sum+1 : sum },0)
                let negativeVotes = voteResult.reduce((sum, vote)=>{ return (!vote) ? sum+1 : sum },0)
                //console.log(`JA: ${positiveVotes} | Nein: ${negativeVotes}`)

                if(positiveVotes > negativeVotes){ // vote passes
                    
                    // === check for hitler as chancellor === 
                    let chancellor = gameState.players.filter((player)=>{return player.proposedChancellor})[0]
                    let president = gameState.players.filter((player)=>{return player.president})[0]

                    // TODO: also need check for facist policy track
                    if(chancellor.character == "hitler"/* && policy track*/){ // if chancellor is hitler
                        gameState.gamePhase = 'endGame' // fascists win
                        return gameState
                    }

                    // === if not eneded - set up for legislative ===

                    // set the proposed chancellor as chancellor - set prevGov
                    chancellor.proposedChancellor = false;
                    chancellor.chancellor = true;

                    // deal with previous govornment
                    gameState.players.forEach((player)=>{player.prevGov = false}) // clear prevGov
                    chancellor.prevGov = true;  // set chancellor as a prevGov
                    president.prevGov = true;   // set president as prevGov

                    // deal the policyhand
                    gameState = drawPolicyHand({gameState:gameState});
                    // set the gamephase to legislative
                    gameState.gamePhase = 'legislative'
                    return gameState
                    
                }else{  // vote fails

                    gameState = rotateGovernment({gameState:gameState});
                    gameState.gamePhase = 'proposal';
                    
                    return gameState
                }
                


            break;
            case "legislative":

                if(gameState.policyHand.length == 1 ){

                    // enact the policy
                    gameState = enactPolicy({gameState:gameState})

                    // count the policy tracks
                    let fPolicy = gameState.policyTrackFascist.reduce((sum, value)=>{return (value) ? sum+1: sum })
                    let lPolicy = gameState.policyTrackLiberal.reduce((sum, value)=>{return (value) ? sum+1: sum })

                    // change the state dependant on the policies that are out
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
    
    const createNewGame = ()=>{
        let sessionRef = createSessionKey(4)

        try{
            initGame(sessionRef)
        }catch(e){
            console.log(`Couldn't create new game: ${e.message}`)
        }

        return sessionRef // returns the reference to the session you have made
    }

    const initGame = (gameKey)=>{
        if(gameStates[gameKey]){ throw new Error(`Game session ${gameKey} already exists`)} // check that we arn't overwriting something

        gameStates[gameKey] = StateTemplate()
        gameStates[gameKey].policyDeck = genPolicyDeck(gameStates[gameKey])
    }

    const createSessionKey = (length)=>{
        return Math.random().toString(36).substring(2,2+length)
    }

    const getGameState = (sessionKey)=>{

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

    // TODO: Write test for this
    const filterGameState = (gameState)=>{
        let filteredState = {};

        filteredState['players'] = gameState.players.map( (playerInfo)=>{
            return {
                playerName: playerInfo.playerName,
                president: playerInfo.president,
                chancellor: playerInfo.chancellor,
                ready: playerInfo.ready,
                prevGov: playerInfo.prevGov,
                proposedChancellor: playerInfo.proposedChancellor,
                voteCast: playerInfo.voteCast
            }
        })
        filteredState['gamePhase'] = gameState.gamePhase;
        filteredState['voteFailTrack'] = gameState.voteFailTrack;
        filteredState['policyTrackFascist'] = gameState.policyTrackFascist;
        filteredState['policyTrackLiberal'] = gameState.policyTrackLiberal;

        return filteredState;
    }

    const joinGame = (sessionKey, playerRef, playerName)=>{
        if(gameStates[sessionKey]){

            // check the playerName isn't already in there
            let playerNames = gameStates[sessionKey].players.map((player)=>{return player.playerName})  // get a list of the playerNames
            if(playerNames.includes(playerName)) throw new Error("PlayerName already taken")// check if name is already in there

            var newPlayer = PlayerTemplate();
            newPlayer.playerName = playerName;
            newPlayer.playerRef = playerRef;

            gameStates[sessionKey].players.push( newPlayer );

            return true;
        }else{
            throw new Error( "session doesn't exist")
        }
    }

    const leaveGame = (sessionKey, playerRef)=>{
        if(gameStates[sessionKey]){
            gameStates[sessionKey].players = gameStates[sessionKey].players.filter((player)=>{ return player.playerRef != playerRef })
        }else{
            throw new Error("Session doesn't exist")
        }
    }

    const getPlayerRefs = ( gameRef, suppliedStates )=>{

        let states = ( suppliedStates ) ? suppliedStates : gameStates // alt test if you want to mock gameState

        if(states[gameRef]){
            return states[gameRef].players.map((playerInfo)=>{ return playerInfo.playerRef })
        }else{
            throw new Error (`No game with the key ${gameRef}`)
        }
    }
 
    const getGameForPlayer= (userId, suppliedStates)=>{

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

    const getPrivatePlayerInfo = (gameRef, userId, suppliedState)=>{

        let privateInfo = {}
        let player;
        let teamMates=[];
        let gameState = (suppliedState) ? suppliedState : gameStates[gameRef]

        // find the user
        player = gameState.players.filter((player)=>{ return player.playerRef == userId})[0]

        if(player.length == 0) throw new Error("playerRef not in game")    // ensure the player is in there
        else if (player.length > 1) throw new Error("repeated playerRef in game")   // make sure there arn't doubles

        privateInfo["playerName"] = player.playerName;
        privateInfo["character"] = player.character;
        privateInfo["alignment"] = player.alignment;

        // make a list of the teammate indexes -- if he is a fascist
        if(player.alignment == 'fascist'){
            gameState.players.forEach((player,index)=>{
                if(player.alignment == 'fascist') teamMates.push(player.playerName)
            })
            privateInfo["teamMates"] = teamMates;
        }

        if(gameState.gamePhase == 'legislative'){   // if in the legislative phase

            if(player.president && gameState.policyHand.length == 3){  // if the president && 3 cards in hand
                privateInfo["policyHand"] = gameState.policyHand; 
            }else if(player.chancellor && gameState.policyHand.length ==2){  // else if the chancellor and 2 cards in hand
                privateInfo["policyHand"] = gameState.policyHand
            }
        }

        if(player.voteCast != undefined){
            privateInfo["voteCast"] = player.voteCast;
        }
        
        return privateInfo
    }

    const getPlayer = (args)=>{ // args { gameRef ; testState ; targetPlayer}
        let gameState = (args.testState != undefined) ? args.testState : gameStates[args.gameRef];
        let player = gameState.players.filter((player)=>{ return player.playerRef == args.playerRef })

        if(player.length == 1) return player[0]
        else if(player.length < 1) throw new Error(`PlayerRef ${args.targetPlayer} not in game`)
        else throw new Error(`PlayerRef ${args.targetPlayer} has multiple entries`)
    }



    // === affect game state ===

    const readyPlayer = (gameRef, playerRef, testState )=>{

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

    const proposeChancellor = (gameRef, playerRef, testState)=>{

        let gameState = (testState) ? testState : gameStates[gameRef]

        let matchedPlayers = gameState.players.filter((player)=>{return player.playerRef == playerRef})
        
        if(matchedPlayers.length == 1){
            matchedPlayers[0].proposedChancellor = true;
        }else if(matchedPlayers.length >1)  throw new Error("Multiple players with this playerRef")
        else throw new Error("No players with that playerRef")

        return gameState
    }

    const castVote = (gameRef, playerRef, vote, testState)=>{
        
        let gameState = (testState != undefined) ? testState : gameStates[gameRef]

        // throw if values not set
        if(gameState.gamePhase !='election') throw new Error(`Can't vote in gamePhase: ${gameState.gamePhase}`)
        if(vote == undefined) throw new Error("Vote not defined")
        if(playerRef == undefined) throw new Error("PlayerRef not defined")

        let targetPlayer = gameState.players.filter((player)=>{ return player.playerRef == playerRef })

        if(targetPlayer.length == 1){
            targetPlayer[0].voteCast = vote
        }else if(targetPlayer >1) throw new Error("Multiple players with this playerRef")
        else throw new Error("No players with that playerRef")

        return gameState
    }

    const policyDiscard = (gameRef, policyType, testState)=>{
        
        let gameState = (testState) ? testState : gameStates[gameRef]

        let policyHand = gameState.policyHand
        let policyIndex = policyHand.indexOf(policyType)

        // !! TODO: For some reason this policy hand is empty
        if(policyIndex != -1){ //if there is a policy of that hand
            var head = policyHand.slice(0, policyIndex)
            var tail = policyHand.slice(policyIndex)
            var card = tail.shift()
            
            gameState.policyHand = head.concat(tail)
            gameState.policyDiscardPile.push(card)

        }else {
            
            throw new Error("No policy of that type")
        }

        return gameState
    }

    const assignRoles = (playerList)=>{

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
            player.alignment = 'liberal';
        })

        // make the first X in the randomised position array fascist        
        for (var i=0; i< fascistCount; i++){
            playerList[positions[i]].alignment = 'fascist';
            playerList[positions[i]].character = 'fascist'
        }
        // make the first in the randomised array hitler
        playerList[positions[0]].character = 'hitler'

        shuffleArray(playerList)
        playerList[0].president = true;

        return playerList
    }

    const nameToRef = (gameRef, playerName, testState)=>{
        let gameState = (testState) ? testState : gameStates[gameRef];

        let targetPlayer = gameState.players.filter((player)=>{
            return player.playerName == playerName
        })

        if(targetPlayer.length == 1) return targetPlayer[0].playerRef
        else if(targetPlayer.length > 1) throw new Error("Multiple with that name")
        else throw new Error("player not in game")
    }

    const selectPlayer = (args)=>{
        // aruments = {gameRef || testState || selectedPlayer || actingPlayer }
        let gameState = (args.testState != undefined) ? args.testState : gameStates[args.gameRef];
        let player = getPlayer({gameRef: args.gameRef, playerRef: args.actingPlayer})
        let target = getPlayer({gameRef: args.gameRef, playerRef: args.selectedPlayer})

        if(gameState.gamePhase == "proposal"){
            if(player.president) { // if proposer and target are valid
                if(!target.prevGov){ proposeChancellor(args.gameRef, args.selectedPlayer)
                }else{ throw new Error("Selected player in previous govornment")}
            }else{ throw new Error("Selecting player not president")}
        }else {throw new Error("phase doesn't allow selecting")}

    }

    const genPolicyDeck = ()=>{
        var policyDeck = [] 

        for (var i=0; i < 6; i++){policyDeck.push('liberal') }// 6 liberal
        for( var i=0; i< 11; i++){ policyDeck.push('fascist') } //11 fascist

        policyDeck = shuffleArray(policyDeck) // shuffle the cards

        return policyDeck
    }

    const drawPolicyHand = (args)=>{ // args { gameRef ; gameState}
        // take the top 3 cards from the deck
        var gameState = (args.gameState) ? args.gameState : gameStates[args.gameRef]
        var policyHand = [];

        if(gameState.policyHand.length != 0) throw new Error("policyHand not empty");

        // can we draw 3 cards
        if(gameState.policyDeck.length < 3){

            gameState.policyDeck = shuffleArraysTogether([gameState.policyDiscard, gameState.policyDeck])
            gameState.policyDiscard = []
        }

        // draw the three cards
        for(var i=0; i<3 ; i++) {policyHand.push(gameState.policyDeck.shift());}

        gameState.policyHand = policyHand
        return gameState
    }

    const rotateGovernment = (args)=>{ // args {gameRef: gameState: }
        const gameState = (args.gameRef) ? gameStates[args.gameRef] : args.gameState;
        
        const playerRoles = gameState.players.map((player)=>{
            if(player.president) return 'president'
            else if(player.chancellor) return 'chancellor'
            else if(player.proposedChancellor) return 'proposedChancellor'
            else return 'nonGov'
        })

        // get the index of the next president
        const presIndex = playerRoles.indexOf('president')
        
        const nextPresIndex = (presIndex >= gameState.players.length-1) ? 0 : presIndex+1;
        const chancellorIndex = playerRoles.indexOf('chancellor')
        const proposedChancellorIndex = playerRoles.indexOf('proposedChancellor')
        
        gameState.players[presIndex].president = false; // unassign old president
        gameState.players[nextPresIndex].president = true // assign new president

        if(chancellorIndex !=-1){ // if there is a chancellor
            gameState.players[chancellorIndex].chancellor = false; // reset the chancellor 
        }

        if(proposedChancellorIndex != -1){  // if there is a proposed chancellor
            gameState.players[proposedChancellorIndex].proposedChancellor = false   // unassign proposed
        }
        
        return gameState;
    }

    const enactPolicy = (args)=>{ // args gameRef: gameState:
        const gameState = (args.gameRef) ? gameStates[gameRef] : args.gameState;
        let trackIndex;

        // check that we have the right numebr of policies
        if(gameState.policyHand.length < 1) throw new Error("no policies to enact")
        else if(gameState.policyHand.length > 1 ) throw new Error("more than one policy to enact")

        // add to the right track
        if(gameState.policyHand[0] == 'liberal'){
            trackIndex = gameState.policyTrackLiberal.indexOf('false')
            gameState.policyTrackLiberal[trackIndex+1] = true;
        }else if(gameState.policyHand[0] == 'fascist'){
            trackIndex = gameState.policyTrackFascist.indexOf('false')
            gameState.policyTrackFascist[trackIndex+1]= true;
        }else{
            throw new Error(`Unknown policy type: ${gameState.policyHand[0]}`)
        }

        //clear the policy hand
        gameState.policyHand.pop() // remove the item

        return gameState;
    }

    const clearVotes = (args)=>{ // gameref : gameState
        const gameState = (args.gameRef) ? gameStates[args.gameRef] : args.gameState

        gameState.players.forEach((player)=>{
            player.voteCast = undefined
        })

        return gameState
    }

    
    
    // utility functions
    const shuffleArraysTogether = (arrays)=>{
        let result= [];
        arrays.forEach((array)=>{
            result = result.concat(array)
        })

        return shuffleArray(result)
    }

    const shuffleArray = (array)=>{ // https://github.com/Daplie/knuth-shuffle
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
        createNewGame,
        initGame, // for testing purposes
        joinGame,
        leaveGame,

        getGameState,
        filterGameState,
        getPlayerRefs,
        getGameForPlayer,
        getPrivatePlayerInfo,
        getPlayer,

        update,
        readyPlayer,
        proposeChancellor,
        castVote,
        policyDiscard,
        assignRoles,
        nameToRef,
        selectPlayer,
        genPolicyDeck,
        shuffleArraysTogether,
        drawPolicyHand,
        rotateGovernment,
        enactPolicy,
        clearVotes
    })

}


module.exports = gameStateManager