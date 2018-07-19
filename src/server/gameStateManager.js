StateTemplate = require('./stateTemplate.js')
PlayerTemplate = require('./playerTemplate.js')

const powerObject = {
    fiveOrSix:[
        "no-power",
        "no-power",
        "top-3-cards",
        "kill",
        "kill",
        "end"
    ],
    sevenOrEight:[
        "no-power",
        "investigate",
        "special-election",
        "kill",
        "kill",
        "end"
    ],
    nineOrTen:[
        "investigate",
        "investigate",
        "special-election",
        "kill",
        "kill",
        "end"
    ]

}

const gameStateManager = function(){
    let gameStates = {}; // array of all the game states

    const update = (gameRef, testState)=>{

        var gameState = (testState) ? testState : gameStates[gameRef]

        // updating game - state machine
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
                    gameState.players.forEach((player)=>{ player.ready = false})
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

                let livingVoters = gameState.players.filter((player)=>{ return player.alive == true })

                let voteResult = livingVoters.map((player)=>{
                    return player.voteCast
                })

                if(voteResult.includes(undefined)){ // not all votes cast
                    return gameState// exit and don't continue
                }

                // if all the votes cast
                let positiveVotes = voteResult.reduce((sum, vote)=>{ return (vote) ? sum+1 : sum },0)
                let negativeVotes = voteResult.reduce((sum, vote)=>{ return (!vote) ? sum+1 : sum },0)

                if(positiveVotes > negativeVotes){ // vote passes
                    
                    // === check for hitler as chancellor === 
                    let chancellor = gameState.players.filter((player)=>{return player.proposedChancellor})[0]
                    let president = gameState.players.filter((player)=>{return player.president})[0]

                    let passedFascistPolicies = gameState.policyTrackFascist.reduce((accum, policy)=>{
                        return (policy === true) ? accum + 1 : accum
                    },0)

                    if(chancellor.character == "hitler" && passedFascistPolicies >= 3 ){ // if chancellor is hitler && enough fascist policies
                        gameState.gamePhase = 'endGame' // fascists win
                        gameState.players = resetPlayerVotes(gameState.players);
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
                    
                }else{  // vote fails

                    gameState.gamePhase = 'proposal';
                }

                gameState.players = resetPlayerVotes(gameState.players);
                return gameState
            break;
            case "legislative":

                if(gameState.policyHand.length == 1 ){

                    // policy played
                    let policyPlayed = gameState.policyHand[0];
                    
                    // enact the policy
                    gameState = enactPolicy({gameState:gameState})

                    // count the policy tracks
                    let fPolicy = gameState.policyTrackFascist.reduce((sum, value)=>{return (value) ? sum+1: sum },0)
                    let lPolicy = gameState.policyTrackLiberal.reduce((sum, value)=>{return (value) ? sum+1: sum },0)

                    // change the state dependant on the policies that are out
                    if(fPolicy >= 6 || lPolicy >= 5){   // if there have been enough policies
                        gameState.gamePhase = "endGame"
                    }else if(policyPlayed == "liberal"){ // if the policy played was a liberal
                        gameState.gamePhase = "proposal";
                    }else if(policyPlayed == "fascist"){ // if it was fascist 

                        let power = undefined;

                        // check if there is a power
                        try{
                            power = getPower({
                                numberOfPlayers: gameState.players.length,
                                fascistPolicyCount: fPolicy
                            })
                        }catch(err){
                            if(/not enough policies for a power/i.test(err.message)) power = 'no-power';
                            else throw(e); 
                        }

                        if(power == "no-power"){
                            gameState.gamePhase = "proposal"
                        }else{
                            gameState.gamePhase = 'power';
                            gameState.powerActive = power;
                        }
                        
                    }else{
                        throw new Error("Unhandled legislative state")
                    }
                
                }else{
                    // carry on
                }
            break;
            case "power":
                // apply the effects of the interaction
                enactPower({gameState});

                // change the state if the power resolved
                if(gameState.powerComplete == true){
                    let hitler = searchPlayers({gameState, searchPairs:{'character':'hitler'}, singleResponseExpected: true })[0];

                    if(hitler.alive == false){
                        gameState.gamePhase = 'endgame'
                    }else{
                        gameState.gamePhase = 'proposal';
                    }
                    
                }
            break
            case "endgame":

        }

        return gameState // pass back the updated state
    }
    
    const resetPlayerVotes = (players)=>{
        players.forEach((player)=>{
            player.voteCast = undefined;
        })
        return players;
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

    const getGameState = (gameRef)=>{

        if(gameStates[gameRef]){
            return filterGameState(gameStates[gameRef]);
        }else{
            throw new Error(`No game with the key ${gameRef}`)
        }


    }

    //  TODO: Write test for this
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
                voteCast: playerInfo.voteCast,
                alive: playerInfo.alive
            }
        })
        filteredState['gamePhase'] = gameState.gamePhase;
        filteredState['voteFailTrack'] = gameState.voteFailTrack;
        filteredState['policyTrackFascist'] = gameState.policyTrackFascist;
        filteredState['policyTrackLiberal'] = gameState.policyTrackLiberal;
        filteredState['powerActive'] = gameState.powerActive;
        filteredState['postSpecialPresident'] = gameState.specialPresident;

        return filteredState;
    }

    const joinGame = (gameRef, playerRef, playerName)=>{
        if(gameStates[gameRef]){

            // check the playerName isn't already in there
            let playerNames = gameStates[gameRef].players.map((player)=>{return player.playerName})  // get a list of the playerNames
            if(playerNames.includes(playerName)) throw new Error("PlayerName already taken")// check if name is already in there

            var newPlayer = PlayerTemplate();
            newPlayer.playerName = playerName;
            newPlayer.playerRef = playerRef;

            gameStates[gameRef].players.push( newPlayer );

            return true;
        }else{
            throw new Error( "session doesn't exist")
        }
    }

    const leaveGame = (gameRef, playerRef)=>{
        if(gameStates[gameRef]){
            gameStates[gameRef].players = gameStates[gameRef].players.filter((player)=>{ return player.playerRef != playerRef })
        }else{
            throw new Error("Session doesn't exist")
        }
    }

    const joinSpectator = ( { gameRef, gameState = gameStates[gameRef], spectatorRef } = {} )=>{
        if(gameState == undefined) throw new Error(`No gameState found for gameRef: ${gameRef}`)
        if(spectatorRef == undefined) throw new Error(`No spectator reference defined`) 
        gameState.spectators.push(spectatorRef)
        return gameState;
    }

    const removeSpectator = ( {gameRef, gameState = gameStates[gameRef], spectatorRef } = {})=>{
        if(gameState == undefined) throw new Error(`No gameState found for gameRef: ${gameRef}`)
        if(spectatorRef == undefined) throw new Error(`No spectatorRef defined`)
        if( !gameState.spectators.includes(spectatorRef)) throw new Error(`spectatorRef is not spectating PlayerRef: ${spectatorRef}`)
        gameState.spectators = gameState.spectators.filter((playerRef)=>{ return playerRef != spectatorRef})
        return gameState;
    }

    const getPlayerRefs = ( gameRef, suppliedStates )=>{

        let states = ( suppliedStates ) ? suppliedStates : gameStates // alt test if you want to mock gameState

        if(states[gameRef]){
            return states[gameRef].players.map((playerInfo)=>{ return playerInfo.playerRef })
        }else{
            throw new Error (`No game with the key ${gameRef}`)
        }
    }
 
    const getSpectatorRefs = ( { gameRef, gameState = gameStates[gameRef] }={} )=>{
        if(gameState == undefined) throw new Error(`No gameState found for gameRef: ${gameRef}`)
        return gameState.spectators;
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

        if(player == undefined) throw new Error("playerRef not in game")    // ensure the player is in there
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

        // if in the legislative phase - give president/chancellor policyHands
        if(gameState.gamePhase == 'legislative'){   

            if(player.president && gameState.policyHand.length == 3){  // if the president && 3 cards in hand
                privateInfo["policyHand"] = gameState.policyHand; 
            }else if(player.chancellor && gameState.policyHand.length ==2){  // else if the chancellor and 2 cards in hand
                privateInfo["policyHand"] = gameState.policyHand
            }
        }

        // if in the power phase and the player is the president
        if(gameState.gamePhase == 'power' && player.president == true){

            let powerActive = gameState.powerActive;
            // if in the top 2 cards power - show the president these cards
            if(powerActive == 'top-3-cards'){
                privateInfo["topPolicyCards"] = gameState.policyDeck.slice(0,3)
            }else if(powerActive == 'investigate'){
                // get the targetPlayer
                let targetPlayer = gameState.players.filter((player)=>{
                    return player.playerRef == gameState.powerTarget;
                })[0];


                // populate the privateInfo with the targetData
                privateInfo['investigationResult'] = (targetPlayer != undefined) ? {
                    playerName: targetPlayer.playerName,
                    alignment: targetPlayer.alignment
                } : undefined;
                
            }else if(powerActive == undefined || powerActive == 'kill' || powerActive == 'special-election'){
                // do nothing
            }else{
                throw new Error(`getPrivatePlayerInfo - unknown power: ${powerActive}`)
            }

        }

        // show the player which way they voted
        if(player.voteCast != undefined){
            privateInfo["voteCast"] = player.voteCast;
        }
        
        return privateInfo
    }

    const getPlayer = ( {gameRef , gameState = gameStates[gameRef], playerRef} )=>{ // args { gameRef ; testState ; targetPlayer}
    
        let player = gameState.players.filter((player)=>{ return player.playerRef == playerRef })

        if(player.length == 1) return player[0]
        else if(player.length < 1) throw new Error(`PlayerRef ${playerRef} not in game`)
        else throw new Error(`PlayerRef ${playerRef} has multiple entries`)
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

    const proposeChancellor = ({gameRef, gameState = gameStates[gameRef], playerRef})=>{

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

        if(policyIndex != -1){ //if there is a policy of that hand
            // split the policy hand in to with the discarded policy at the front of the "tail" array
            var head = policyHand.slice(0, policyIndex)
            var tail = policyHand.slice(policyIndex)
            var card = tail.shift() // remove the discarded card
            
            gameState.policyHand = head.concat(tail) // join the hand together again
            gameState.policyDiscardPile.push(card)  // put the card on the discard pile

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

    const selectPlayer = ( { gameRef, gameState = gameStates[gameRef] , selectedPlayer, actingPlayer } = {} )=>{
        
        let player = getPlayer({gameState: gameState, playerRef: actingPlayer})
        let target = getPlayer({gameState: gameState, playerRef: selectedPlayer})

        if(target.alive != true){
            throw new Error(`Can't select a dead player`);
        }

        if(gameState.gamePhase == "proposal"){
            if(player.president) { // if proposer and target are valid
                if(!target.prevGov){ proposeChancellor({gameState: gameState, playerRef: selectedPlayer})
                }else{ throw new Error("Selected player in previous govornment")}
            }else{ throw new Error("Selecting player not president")}
        }else if(gameState.gamePhase == "power"){
            let powerActive = gameState.powerActive;
            // all we need to do is set the target player - update will handle enacting the power
            if(player.president == true){
                if(powerActive == 'kill' || powerActive == 'investigate' || powerActive == 'special-election' ){
                    gameState.powerTarget = target.playerRef;
                }else{
                    throw new Error(`selectPlayer - power doesn't require selection`);
                }
            }

        }else{ throw new Error("phase doesn't allow selecting") }

        return gameState;

    }

    const enactPower = ( {gameRef, gameState = gameStates[gameRef] } )=>{
        
        let president;

        switch (gameState.powerActive){
            case `no-power`:
                // do nothing
            break;
            case `top-3-cards`:
                // all sent through private info
                president = searchPlayers({gameState, searchPairs:{'president':true}, singleResponseExpected:true})[0]
                if(president.ready == true){
                    president.ready = false;
                    gameState.powerComplete = true;
                }
            break;
            case `kill`:
                // if there is a powerTarget
                if(gameState.powerTarget != undefined)
                    // kill the target
                    gameState = killPlayer({gameState});
                    // remove the target
                    gameState.powerTarget = undefined;
                    // resolve the power
                    gameState.powerComplete = true;
            break;
            case `investigate`:
                president = searchPlayers({gameState, searchPairs:{'president':true}, singleResponseExpected:true})[0];
                
                // if the president is ready
                if(president.ready == true){
                  // set president to not ready
                  president.ready = false;
                  // resolve the power
                  gameState.powerComplete = true;
                }
            break;
            case `special-election`:
                // has the president selected a player
                if(gameState.targetPlayer != undefined){
                    // set a flag to check in next rotateGovernment
                    gameState.specialPresident = gameState.targetPlayer;
                    // reset the targetPlayer
                    gameState.targetPlayer = undefined;
                    // resolve the power
                    gameState.powerComplete = true;
                }
            break;
            default:
                // do nothing
            break;
        }

        return gameState;
    }

    const getPower = ( { numberOfPlayers, fascistPolicyCount } )=>{

        if(fascistPolicyCount < 1) throw new Error(`Not enough policies for a power : ${fascistPolicyCount} policies`)
        else if(fascistPolicyCount >= 6) throw new Error(`Game should have ended : ${fascistPolicyCount} policies`)

        // check how many players there are
        if (numberOfPlayers < 5) throw new Error(`Not enough players for a game: ${numberOfPlayers} players`);
        else if( numberOfPlayers <= 6 ){
            return powerObject.fiveOrSix[fascistPolicyCount - 1]
        }else if( numberOfPlayers <= 8 ){
            return powerObject.sevenOrEight[fascistPolicyCount - 1]
        }else if( numberOfPlayers <= 10){
            return powerObject.nineOrTen[fascistPolicyCount - 1]
        }else{
            throw new Error(`Too many players in the game : ${numberOfPlayers} players`)
        }
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

            gameState.policyDeck = shuffleArraysTogether([gameState.policyDiscardPile, gameState.policyDeck])
            gameState.policyDiscardPile = []
        }

        // draw the three cards
        for(var i=0; i<3 ; i++) {policyHand.push(gameState.policyDeck.shift());}

        gameState.policyHand = policyHand
        return gameState
    }

    // !! Test the new elements of this
    const rotateGovernment = ( { gameRef, gameState = gameStates[gameRef] } )=>{ // args {gameRef: gameState: }
    
        // make an array of the roles of the players
        const playerRoles = gameState.players.map((player)=>{
            if(player.president) return 'president'
            else if(player.chancellor) return 'chancellor'
            else if(player.proposedChancellor) return 'proposedChancellor'
            else return 'nonGov'
        })

        
        // == deal with assigning the next president
        const presIndex = playerRoles.indexOf('president')
        let nextPresIndex;

        // find out the index of the next president
        if ( gameState.postSpecialPresident != undefined){ // if there is a president to return to after special election
            // get the index of the plaer to return to after the 
            let postSpecialElectionPlayerObject = getPlayer({gameState, playerRef: gameState.postSpecialPresident});
            
            nextPresIndex = gameState.players.indexOf(postSpecialElectionPlayerObject);
            
            // check if the postSpecialPresident is alive
            if(postSpecialElectionPlayerObject.alive != true){ // if the proposed post special election is dead
                nextPresIndex = nextAlivePlayerByIndex({playerArray:gameState.players, currentTargetIndex:nextPresIndex})
            }
            
            gameState.postSpecialPresident = undefined;
            gameState.specialPresident = undefined;

        }else if( gameState.specialPresident != undefined ){ // if there is a special president
            // == get the index of the nominated special president
            // get tthe player object
            let specialPresidentPlayerObject = getPlayer({gameState, playerRef: gameState.specialPresident})

            // get the index of the player object in the game
            nextPresIndex = gameState.players.indexOf(specialPresidentPlayerObject);

            // check that the special president is alive
            if(specialPresidentPlayerObject.alive != true){
                // if not get the next alive player
                nextPresIndex = nextAlivePlayerByIndex({playerArray:gameState.players, currentTargetIndex: nextPresIndex })
            }

            // set the president to return to afterwards
            let playerReturnIndex = nextAlivePlayerByIndex({playerArray: gameState.players, currentTargetIndex: presIndex})

            gameState.postSpecialPresident = gameState.players[playerReturnIndex].playerRef;

            // TODO - DO we need to know if the president is special - remove the special president setting

        }else{
            // move to the next player in the list
            nextPresIndex = nextAlivePlayerByIndex({playerArray: gameState.players, currentTargetIndex: presIndex})
            //(presIndex >= gameState.players.length-1) ? 0 : presIndex+1;
        }
        
        // deal with president things
        if(presIndex != -1) {
            gameState.players[presIndex].president = undefined; // unassign old president
            gameState.players[nextPresIndex].president = true // assign new president
        }

        // deal with chancellor things
        const chancellorIndex = playerRoles.indexOf('chancellor');
        if(chancellorIndex !=-1){ // if there is a chancellor
            gameState.players[chancellorIndex].chancellor = undefined; // reset the chancellor 
        }
        const proposedChancellorIndex = playerRoles.indexOf('proposedChancellor')
        if(proposedChancellorIndex != -1){  // if there is a proposed chancellor
            gameState.players[proposedChancellorIndex].proposedChancellor = undefined   // unassign proposed
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
            trackIndex = gameState.policyTrackLiberal.indexOf(false)
            gameState.policyTrackLiberal[trackIndex] = true;
        }else if(gameState.policyHand[0] == 'fascist'){
            trackIndex = gameState.policyTrackFascist.indexOf(false)
            gameState.policyTrackFascist[trackIndex]= true;
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

    const searchPlayers = ( {gameState, searchPairs, singleResponseExpected = false } = {} )=>{
        
        let searchKeys = Object.keys(searchPairs);
        let matchedPlayers = undefined;
        
        searchKeys.forEach((searchKey)=>{
            matchedPlayers = gameState.players.filter((player)=>{
                return (player[searchKey] == searchPairs[searchKey])
            })
        })
        
        if(singleResponseExpected == true && matchedPlayers.length > 1){
            throw new Error(`Single player expected: ${matchedPlayers.length} players found`)
        }

        return matchedPlayers;
    }

    const killPlayer = ({ gameRef, gameState = gameStates[gameRef] })=>{
        let playerToKill = searchPlayers({gameState, searchPairs:{'playerRef':gameState.powerTarget}, singleResponseExpected: true})[0];
        
        playerToKill.alive = false;
        return gameState;
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

    const nextAlivePlayerByIndex = ({playerArray, currentTargetIndex, itterationCount = 0} = {})=>{

        if(itterationCount >= playerArray.length){ // escape if itterated through whole list
            throw new Error("Searched whole list - none alive");
        }

        // get the next player in the list (loop the end if necessary)
        let nextPlayerIndex = (currentTargetIndex+1 < playerArray.length) ? currentTargetIndex +1 : 0;

        // recursive loop till you get an alive player
        return (playerArray[nextPlayerIndex].alive == true)
          ? nextPlayerIndex
          : nextAlivePlayerByIndex({playerArray, currentTargetIndex: nextPlayerIndex, itterationCount: itterationCount+1})

    }

    // function to search for playerRef

    return Object.create({
        createNewGame,
        initGame, // for testing purposes
        joinGame,
        joinSpectator,
        removeSpectator,
        leaveGame,

        getGameState,
        filterGameState,
        getPlayerRefs,
        getSpectatorRefs,
        getGameForPlayer,
        getPrivatePlayerInfo,
        getPlayer,
        searchPlayers,
        killPlayer,

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
        clearVotes,
        getPower,
        enactPower,

        nextAlivePlayerByIndex
    })

}


module.exports = gameStateManager