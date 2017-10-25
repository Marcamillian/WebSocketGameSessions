test = require('tape')
GameStateManager = require('./../../src/server/GameStateManager.js')
PlayerTemplate = require('./../../src/server/playerTemplate.js')
StateTemplate = require('./../../src/server/stateTemplate.js')

let getTestBase = ()=>{
    let player1 = PlayerTemplate()
    let player2 = PlayerTemplate()

    player1.playerRef = "player1"
    player2.playerRef = "player2"

    return {
        gsManager: GameStateManager(),
        gs: StateTemplate(),
        player1: player1,
        player2: player2
    }
}

test.skip("Testing the gameCreation process", (t)=>{

    let gsManager = GameStateManager();

    t.ok(gsManager.createNewGame, "Checking createNewGame exposed")
    t.ok(gsManager.getGameState, "Checking getGameState exposed")
    t.ok(gsManager.initGame, "Checking initGame exposed")

    let gameKey = gsManager.createNewGame();
    t.ok(gsManager.getGameState(gameKey),"Checking the game is created")
    t.throws(()=>{gsManager.getGameState("dgs")}, /No game with the key/i, "Errors when non-existant ref used" )

    t.throws(()=>{gsManager.initGame(gameKey)}, /already exists/i, "Throws error when sessionKey already used")

    t.end()
})

test("Testing the getPlayerRefs method", (t)=>{

    let gsManager = GameStateManager();

    // mock up a gamestate to test
    state1 = StateTemplate()
    player1_1 = PlayerTemplate()
    player1_2 = PlayerTemplate()

    // test the function using the mock as a second argument

    t.ok(gsManager.update, "testing this")
    t.end()
})

test("Testing the stateMachine - lobby to proposal transition", (t)=>{

    let gsManager = GameStateManager();

    t.test("5 players all ready", (ts)=>{
        // a state with 5 ready players
        let state = {players:[], gamePhase: 'lobby'}
        for(var i=0; i<5; i++){ state.players.push({ready:true}) }

        ts.equals(gsManager.update(undefined, state).gamePhase, 'proposal', "gameState should move on")
        ts.end()
    })

    t.test("enough players - not all ready", (ts)=>{
        // a state with 5 players - not all ready
        let state = {players:[], gamePhase: 'lobby'}
        for(var i=0; i<5; i++){ state.players.push({ready:true}) }
        state.players[0].ready = false

        ts.equals(gsManager.update(undefined, state).gamePhase, 'lobby', "not everyone ready")
        ts.end()
    })

    t.test("not enough players - all ready", (ts)=>{ // TODO this is failing
        // a state with 5 players - not all ready
        let state = {players:[], gamePhase: 'lobby'}
        for(var i=0; i<3; i++){ state.players.push({ready:true}) }

        ts.equals(gsManager.update(undefined, state).gamePhase, 'lobby', "not enought to start")
        ts.end()
    })

    t.test("too many players - all ready", (ts)=>{ // TODO this is failing
        // a state with 5 players - not all ready
        let state = {players:[], gamePhase: 'lobby'}
        for(var i=0; i<13; i++){ state.players.push({ready:true}) }

        ts.throws(()=>{gsManager.update(undefined, state)}, /Too many players/i, "Too many players for the game")
        ts.end()
    })

    t.end()
})

test("Testing the stateMachine - proposal to vote transition", (t)=>{
    let gsManager = GameStateManager()

    let gameState1 = StateTemplate();
    let player1 = PlayerTemplate()
    let player2 = PlayerTemplate()

    gameState1.gamePhase = 'proposal'
    gameState1.players.push(player1)
    gameState1.players.push(player2)

    t.equals(gsManager.update(undefined,gameState1).gamePhase, "proposal", "No chancellor proposed - stay in proposal phase")

    player2.proposedChancellor = true;

    t.equals(gsManager.update(undefined,gameState1).gamePhase, "election", "Chancellor proposed - move to vote phase")

    t.end()
})

test("Testing the stateMachine - vote to legislative/proposal/endGame", (t)=>{

    t.test("No votes", (ts)=>{
        let gsManager = GameStateManager()
        
        let gameState1 = StateTemplate();
        let player1 = PlayerTemplate()
        let player2 = PlayerTemplate()
        let player3 = PlayerTemplate()
        let player4 = PlayerTemplate()

        gameState1.gamePhase = 'election'

        gameState1.players.push(player1)
        gameState1.players.push(player2)
        gameState1.players.push(player3)
        gameState1.players.push(player4)

        ts.equals(gsManager.update(undefined,gameState1).gamePhase, "election", "No votes - stay in proposal phase")

        ts.end()
    })

    t.test("Some votes", (ts)=>{
        let gsManager = GameStateManager()

        let gameState1 = StateTemplate();
        let player1 = PlayerTemplate()
        let player2 = PlayerTemplate()
        let player3 = PlayerTemplate()
        let player4 = PlayerTemplate()

        gameState1.gamePhase = 'election'

        gameState1.players.push(player1)
        gameState1.players.push(player2)
        gameState1.players.push(player3)
        gameState1.players.push(player4)

        player2.voteCast = true;

        ts.equals(gsManager.update(undefined,gameState1).gamePhase, "election", "One vote - stay in proposal phase")
        ts.end()
    })

    t.test("Success vote", (ts)=>{
        let gsManager = GameStateManager()

        let gameState1 = StateTemplate();
        let player1 = PlayerTemplate()
        let player2 = PlayerTemplate()
        let player3 = PlayerTemplate()
        let player4 = PlayerTemplate()

        gameState1.gamePhase = 'election'

        player1.proposedChancellor = true;
        player2.character = 'hitler';

        gameState1.players.push(player1)
        gameState1.players.push(player2)
        gameState1.players.push(player3)
        gameState1.players.push(player4)

        gameState1.players.forEach((player)=>{player.voteCast = true})

        ts.equals(gsManager.update(undefined,gameState1).gamePhase, "legislative", "Success vote - move to legislative")
        ts.end()
    })

    t.test("Success vote - hitler chancellor", (ts)=>{
        let gsManager = GameStateManager()

        let gameState1 = StateTemplate();
        let player1 = PlayerTemplate()
        let player2 = PlayerTemplate()
        let player3 = PlayerTemplate()
        let player4 = PlayerTemplate()

        gameState1.gamePhase = 'election'

        player1.proposedChancellor = true;
        player1.character = 'hitler';

        gameState1.players.push(player1)
        gameState1.players.push(player2)
        gameState1.players.push(player3)
        gameState1.players.push(player4)

        gameState1.players.forEach((player)=>{player.voteCast = true})

        ts.equals(gsManager.update(undefined,gameState1).gamePhase, "endGame", "Success vote - hitler is chancellor - end game")
        ts.end()
    })

    t.test("Failed vote ", (ts)=>{
        let gsManager = GameStateManager()

        let gameState1 = StateTemplate();
        let player1 = PlayerTemplate()
        let player2 = PlayerTemplate()
        let player3 = PlayerTemplate()
        let player4 = PlayerTemplate()

        gameState1.players.push(player1)
        gameState1.players.push(player2)
        gameState1.players.push(player3)
        gameState1.players.push(player4)

        gameState1.gamePhase = 'election'

        gameState1.players.forEach((player)=>{player.voteCast = false})

        ts.equals(gsManager.update(undefined,gameState1).gamePhase, "proposal", "Unsuccessful gov election - elect another")
        ts.end()
    })

    t.end()
})

test("Testing the stateMachine - legeslative to endgame/power", (t)=>{
    
    
    t.test("Fascist passed - no power", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative'
        gameState.policyDraw = ['fascist']

        t.equals(gsManager.update(undefined,gameState).gamePhase, "proposal", "Policy Passes - next proposal")

        ts.end()
    })

    t.test("Liberal passed - no power", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative'
        gameState.policyDraw = ['liberal']

        t.equals(gsManager.update(undefined,gameState).gamePhase, "proposal", "Policy Passes - next proposal")

        ts.end()
    })

    t.test("Fascist passed - Power Activated", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative'
        gameState.policyDraw = ['fascist']
        gameState.policyTrackFascist = [true, true, true, false, false, false]

        t.equals(gsManager.update(undefined,gameState).gamePhase, "power", "Policy Passes - power activated")

        ts.end()
    })

    t.test("Fascist passed - Facisits win", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative'
        gameState.policyDraw = ['fascist']
        gameState.policyTrackFascist = [true, true, true, true, true, true]

        t.equals(gsManager.update(undefined,gameState).gamePhase, "endGame", "Fascists win")

        ts.end()
    })

    t.test("Liberal passed - Game end", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative'
        gameState.policyDraw = ['liberal']
        gameState.policyTrackLiberal = [true, true, true, true, true]

        ts.equals(gsManager.update(undefined,gameState).gamePhase, "endGame", "Liberals win")

        ts.end()
    })

    t.end()
})



test("Testing interaction functions: player lobby ready up", (t)=>{ 
   
    t.test("ready up a single player", (ts)=>{
        let gsManager = GameStateManager();
        let gameState = StateTemplate();

        let player1 = PlayerTemplate();
        let player2 = PlayerTemplate();

        player1.playerRef = "player1"
        player2.playerref = "player2"

        gameState.gamePhase = "lobby";
        gameState.players.push(player1, player2)

        let result = gsManager.readyPlayer(undefined, "player1", gameState)

        let changedPlayer  = result.players.filter((player)=>{return player.playerRef == 'player1'})
        ts.equals(changedPlayer[0].ready, true, "Is the players ready state changed")

        ts.end()
    })
    
    t.test("search for a player that doesn't exist", (ts)=>{
        let gsManager = GameStateManager();
        let gameState = StateTemplate();

        let player1 = PlayerTemplate();
        let player2 = PlayerTemplate();

        player1.playerRef = "player1";
        player2.playerRef = "player2";
        
        gameState.gamePhase = "lobby";
        gameState.players.push(player1, player2);

        //ts.throws(()=>{gsManager.readyPlayer(gameState, "player3")}, /Player not in game/i, "Player not in game to ready")

        //ts.throws(()=>{gsManager.readyPlayer(gameState, "player3")},/Player not in game to ready/i, "Player not in game to ready")
        ts.throws(()=>{gsManager.readyPlayer(undefined, "player3", gameState)}, /PlayerRef not in game/i, "Ready playerRef that doesn't exist" )

        ts.end()
    })

    t.test("search for a player with no players in the list", (ts)=>{
        let gsManager = GameStateManager();
        let gameState = StateTemplate();

        gameState.gamePhase = "lobby";
        ts.throws(()=>{ gsManager.readyPlayer(undefined, "player1", gameState), /PlayerRef not in game/i, "Ready when no players in game" })

        ts.end()
    })

    t.test("Search for a player that has duplicate playerIds in the gameState", (ts)=>{
        
        let gsManager = GameStateManager();
        let gameState = StateTemplate();

        let player1 = PlayerTemplate();
        let player2 = PlayerTemplate();

        player1.playerRef = "player1";
        player2.playerRef = "player1";

        gameState.gamePhase = "lobby";
        gameState.players.push(player1, player2);

        ts.throws(()=>{ gsManager.readyPlayer(undefined, "player1", gameState) }, /More than one player with that reference/i, "Multiple players matching PlayerRef")

        ts.end()
    })
    
    t.end()
})

test("Testing interaction functions: chancellor proposal", (t)=>{
    t.test("Suggest a player for chancellor", (ts)=>{
        let base = getTestBase()

        base.gs.gamePhase = 'proposal';
        base.gs.players.push(base.player1, base.player2)

        let result = base.gsManager.proposeChancellor(undefined, "player1", base.gs)

        let targetPlayer = result.players.filter((player)=>{return player.playerRef == 'player1'})[0]
        ts.equals(targetPlayer.proposedChancellor, true, "Correct chancellor proposed")

        ts.end()
    })

    t.test("Suggest a playerRef not in the game", (ts)=>{
        let base = getTestBase();

        base.gs.gamePhase = 'proposal';
        base.gs.players.push(base.player1, base.player2)

        ts.throws(()=>{base.gsManager.proposeChancellor(undefined, "player3", base.gs)}, /No players with that playerRef/i, "Proposed chancellor not in game")
        ts.end()
    })

    t.test("Suggest a playerRef that matches multiples",(ts)=>{

        let base = getTestBase();

        base.gs.gamePhase = 'proposal';
        base.player2.playerRef = "player1"
        base.gs.players.push(base.player1, base.player2)

        ts.throws(()=>{base.gsManager.proposeChancellor(undefined, "player1", base.gs), /Multiple players with this playerRef/i, "Proposed chancellor playerRef matches mutliple players"})

        ts.end()
    })

    t.end()
})

test("Testing interaction functions: Election vote", (t)=>{
    t.test("Positive vote for a proposed govornment", (ts)=>{
        let base = getTestBase();

        base.gs.gamePhase == 'election';
        base.gs.players.push(base.player1, base.player2);

        let result = base.gsManager.castVote(undefined, "player1", true, base.gs)
        let targetPlayer = result.players.filter((player)=>{return player.playerRef == "player1"})[0]

        ts.equal(targetPlayer.voteCast, true, "Vote for government")

        ts.end()
    }) 

    t.test("Negative vote for a proposed govornment", (ts)=>{
        let base = getTestBase();

        base.gs.gamePhase == 'election';
        base.gs.players.push(base.player1, base.player2);

        let result = base.gsManager.castVote(undefined, "player1", false, base.gs)
        let targetPlayer = result.players.filter((player)=>{return player.playerRef == "player1"})[0]

        ts.equal(targetPlayer.voteCast, false, "Vote against government")

        ts.end()
    })

    t.end()
})

test("Testing interaction: Policy discard", (t)=>{
    t.test("3 policy - discard liberal", (ts)=>{
        let gs = StateTemplate();
        let gsManager = GameStateManager();

        gs.policyHand = ['fascist', 'liberal', 'fascist']

        let result = gsManager.policyDiscard(undefined, 'liberal', gs)
        let liberalDraw = result.policyHand.filter((card)=>{return card == "liberal"})

        ts.equal(result.policyHand.length, 2, "2 cards left in the policy draw")
        ts.equal(liberalDraw.length, 0, "No liberal cards left")
        ts.equal(result.policyDiscardPile[0], "liberal", "Card moved to discard")

        ts.end()
    })

    t.test("3 policy - discard fascist",(ts)=>{
        let gs = StateTemplate();
        let gsManager = GameStateManager();

        gs.policyHand = ['fascist','liberal','liberal']

        let result = gsManager.policyDiscard(undefined,'fascist', gs)
        let fascistDraw = result.policyHand.filter((card)=>{ return card == "fascist"})

        ts.equal(result.policyHand.length, 2, "2 left in the policy draw")
        ts.equal(fascistDraw.length, 0, "No fascist cards left")
        ts.equal(result.policyDiscardPile[0], "fascist", "Card is moved to discard")

        ts.end()
    })

    t.test("3 fascist - discard liberal", (ts)=>{
        let gs = StateTemplate();
        let gsManager = GameStateManager();

        gs.policyHand = ['fascist', 'fascist','fascist']

        ts.throws(()=>{gsManager.policyDiscard(undefined,"liberal", gs)}, /No policy of that type/i, "No liberal policy in hand")

        ts.end()
    })

    t.test("2 policy - discard liberal", (ts)=>{
        let gs = StateTemplate();
        let gsManager = GameStateManager()

        gs.policyHand = ['fascist', 'liberal'];

        let result = gsManager.policyDiscard(undefined, 'liberal', gs)
        let liberalDraw = result.policyHand.filter((card)=>{ return card == "liberal" })

        ts.equal(result.policyHand.length,1, "1 card left in policy draw")
        ts.equal(liberalDraw.length,0, "No liberal cards left")
        ts.equal(result.policyDiscardPile[0], "liberal", "Card moved to discard")

        ts.end()
    })

    t.test("no policies set",(ts)=>{
        let gs = StateTemplate();
        let gsManager = GameStateManager();

        ts.throws(()=>{gsManager.policyDiscard(undefined, 'liberal', gs)}, /No policy of that type/i, "No policy cards drawn")

        ts.end()
    })

    t.end()
})

test("Testing function: Assigning roles", (t)=>{
    let gameStateManager = GameStateManager();

    t.test("Assigning roles: Not enough players", (ts)=>{
        let players = []
        for(var i=0; i < 4; i++){players.push({allignment: undefined,character: undefined, president: false})}

        ts.throws(()=>{gameStateManager.assignRoles(players)}, /not enough players to assign roles/i, "Can't assign roles")
        
        ts.end()
    })

    t.test("Assigning roles: 5 player",(ts)=>{
        let players = []
        for(var i=0; i < 5; i++){players.push({allignment: undefined,character: undefined, president: false})}

        let result = gameStateManager.assignRoles(players)

        let fascists = result.filter((player)=>{ return player.allignment == 'fascist' })
        let hitler = result.filter((player)=>{ return player.character == 'hitler'})

        ts.equals(fascists.length,2, "Two fascists")
        ts.equals(hitler.length, 1, "Only one hitler")

        ts.end()
    })

    t.test("Assigning roles: 7 player", (ts)=>{
        let players = []
        for(var i=0; i < 7; i++){players.push({allignment: undefined,character: undefined, president: false})}

        let result = gameStateManager.assignRoles(players)

        let fascists = result.filter((player)=>{ return player.allignment == 'fascist' })
        let hitler = result.filter((player)=>{ return player.character == 'hitler'})

        ts.equals(fascists.length,3, "Three fascists")
        ts.equals(hitler.length, 1, "Only one hitler")
        ts.end()
    })

    t.test("Assigning roles: 10 players", (ts)=>{
        let players = []
        for(var i=0; i < 10; i++){players.push({allignment: undefined,character: undefined, president: false})}

        let result = gameStateManager.assignRoles(players)

        let fascists = result.filter((player)=>{ return player.allignment == 'fascist' })
        let hitler = result.filter((player)=>{ return player.character == 'hitler'})

        ts.equals(fascists.length,4, "Two fascists")
        ts.equals(hitler.length, 1, "Only one hitler")
        ts.end()
    })

    t.test("Assigning roles: Too many players",(ts)=>{

        let players = []
        for(var i=0; i < 12; i++){players.push({allignment: undefined,character: undefined, president: false})}

        ts.throws(()=>{gameStateManager.assignRoles(players), /too many players to assign roles/i, "Too many players in game"})

        ts.end()
    })

    t.end()


})

test("Testing function: getGameForPlayer", (t)=>{
    let gameStateManager = GameStateManager()

    t.test("PlayerRef in a game",(ts)=>{

        let gameStates =
        {
            "gameOne":{players:[ {playerRef: "player1"},
                            {playerRef: "player2"}]},
            "gameTwo":{players:[ {playerRef: "player3"},
                            {playerRef: "player4"}]}   
        }


        ts.equal(gameStateManager.getGameForPlayer("player1", gameStates), "gameOne", "Player exists")
        ts.end()
    })

    t.test("PlayerRef not in any game",(ts)=>{
        let gameStates =
        {
            "gameOne":{players:[ {playerRef: "player1"},
                            {playerRef: "player2"}]},
            "gameTwo":{players:[ {playerRef: "player3"},
                            {playerRef: "player4"}]}   
        }

        ts.equal(gameStateManager.getGameForPlayer("player5", gameStates), undefined, "Player doesn't exist")
        ts.end()
    })

    t.end() 
})

test("Testing function: getPrivatePlayerInfo",(t)=>{
    let stateManager = GameStateManager();

    t.test("Player info when in govornment proposal phase", (ts)=>{
        let gameState =
        {gamePhase: 'proposal',
        players: [
            {playerRef: 'player1',
             allignment: 'liberal',
             character: 'liberal'},
            {playerRef:'player2',
             allignment:'fascist',
             character: 'hitler'},
            {playerRef:'player3',
             allignment:'fascist',
             character: 'hitler'}
        ]}

        let libResult = stateManager.getPrivatePlayerInfo(undefined, 'player1', gameState)
        let fasResult = stateManager.getPrivatePlayerInfo(undefined,'player2', gameState)

        ts.equals(libResult.allignment, 'liberal', "Checking liberal allignment")
        ts.equals(libResult.character, 'liberal', "Checking liberal character")
        ts.equals(fasResult.allignment, 'fascist', "Checking fascist allignment")
        ts.equals(fasResult.character, 'hitler', "Checking fascist character")
        ts.equals(fasResult.teamMates.length,1, "Checking for teammates" )
        ts.equals(fasResult.teamMates[0], 1, "Index of myself")
        ts.equals(fasResult.teamMates[1], 2, "Index of teammate")


        ts.end()
    })

    t.skip("Player ref not in the game", (ts)=>{
        let gameState =
        {gamePhase: 'proposal',
        players: [
            {playerRef: 'player1',
             allignment: 'liberal',
             character: 'liberal'},
            {playerRef:'player2',
             allignment:'fascist',
             character: 'hitler'}
        ]}

        ts.throws(()=>{stateManager.getPrivatePlayerInfo(undefined,'player1',gameState)}, /playerRef not in game/i, "Error if payerRef not present")

        ts.end()
    })



    t.end()
})

