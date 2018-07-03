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

test("Testing the update stateMachine - lobby to proposal transition", (t)=>{

    let gsManager = GameStateManager();

    t.test("5 players all ready", (ts)=>{
        // a state with 5 ready players
        let state = {players:[], gamePhase: 'lobby'}
        for(var i=0; i<5; i++){ state.players.push({ready:true}) }

        let result = gsManager.update(undefined, state);
        let playersReady = result.players.map((player)=>{ return player.ready })
        ts.equals(result.gamePhase, 'proposal', "gameState should move on")
        ts.equals(playersReady.join(), "false,false,false,false,false", "Ready gets reset");
        
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

    t.test("not enough players - all ready", (ts)=>{ 
        // a state with 5 players - not all ready
        let state = {players:[], gamePhase: 'lobby'}
        for(var i=0; i<3; i++){ state.players.push({ready:true}) }

        ts.equals(gsManager.update(undefined, state).gamePhase, 'lobby', "not enought to start")
        ts.end()
    })

    t.test("too many players - all ready", (ts)=>{
        // a state with 5 players - not all ready
        let state = {players:[], gamePhase: 'lobby'}
        for(var i=0; i<13; i++){ state.players.push({ready:true}) }

        ts.throws(()=>{gsManager.update(undefined, state)}, /Too many players/i, "Too many players for the game")
        ts.end()
    })

    t.end()
})

test("Testing the update stateMachine - proposal to vote transition", (t)=>{
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

test("Testing the update stateMachine - vote to legislative/proposal/endGame", (t)=>{

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
        player3.president = true;
        player2.prevGov = true;
        player4.prevGov = true;

        gameState1.players.push(player1)
        gameState1.players.push(player2)
        gameState1.players.push(player3)
        gameState1.players.push(player4)

        gameState1.players.forEach((player)=>{player.voteCast = true})

        let result = gsManager.update(undefined,gameState1);

        // see if the player votes contain either true or false
        let playerVotes = result.players.map( player => player.voteCast);
        let votesDirty = playerVotes.includes(true) || playerVotes.includes(false);

        ts.equals(result.gamePhase, "legislative", "Success vote - move to legislative")
        ts.equals(votesDirty, false , "Votes have been reset to undefined")
        ts.equals(player3.prevGov, true, "president is part of a successful gov")
        ts.equals(player1.prevGov, true, "chancellor is part of a successful gov")
        ts.equals(player2.prevGov, false, "No longer previous government")
        ts.equals(player4.prevGov, false, "no longer a member of the previous government")

        ts.end()
    })

    t.test("Success vote - hitler chancellor enough fascist to finish", (ts)=>{
        let gsManager = GameStateManager()

        let gameState1 = StateTemplate();
        let player1 = PlayerTemplate()
        let player2 = PlayerTemplate()
        let player3 = PlayerTemplate()
        let player4 = PlayerTemplate()

        gameState1.gamePhase = 'election'

        player1.proposedChancellor = true;
        player1.character = 'hitler';
        player2.president = true;

        gameState1.players.push(player1)
        gameState1.players.push(player2)
        gameState1.players.push(player3)
        gameState1.players.push(player4)

        gameState1.policyTrackFascist = [true, true, true, false, false, false]

        gameState1.players.forEach((player)=>{player.voteCast = true})

        let result = gsManager.update(undefined,gameState1)
        //let hasPresident = gameState.players.

        // see if the player votes contain either true or false
        let playerVotes = result.players.map( player => player.voteCast);
        let votesDirty = playerVotes.includes(true) || playerVotes.includes(false);

        ts.equals(result.gamePhase, "endGame", "Success vote - hitler is chancellor - end game");
        ts.equals(votesDirty, false , "Votes have been reset to undefined");
        ts.end()
    })
    
    t.test("Success vote - hitler chancellor NOT enough fascist to finish", (ts)=>{
        let gsManager = GameStateManager()

        let gameState1 = StateTemplate();
        let player1 = PlayerTemplate()
        let player2 = PlayerTemplate()
        let player3 = PlayerTemplate()
        let player4 = PlayerTemplate()

        gameState1.gamePhase = 'election'

        player1.proposedChancellor = true;
        player1.character = 'hitler';
        player2.president = true;

        gameState1.players.push(player1)
        gameState1.players.push(player2)
        gameState1.players.push(player3)
        gameState1.players.push(player4)

        gameState1.policyTrackFascist = [false, false, false, false, false, false]

        gameState1.players.forEach((player)=>{player.voteCast = true})

        let result = gsManager.update(undefined,gameState1)
        
        // see if the player votes contain either true or false
        let playerVotes = result.players.map( player => player.voteCast);
        let votesDirty = playerVotes.includes(true) || playerVotes.includes(false);
        
        ts.equals(result.gamePhase, "legislative", "Success vote - hitler doesn't have enough power to win")
        ts.equals(votesDirty, false , "Votes have been reset to undefined")
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

        player3.president = true;

        gameState1.gamePhase = 'election'

        gameState1.players.forEach((player)=>{player.voteCast = false})

        let result = gsManager.update(undefined,gameState1)
        // see if the player votes contain either true or false
        let playerVotes = result.players.map( player => player.voteCast);
        let votesDirty = playerVotes.includes(true) || playerVotes.includes(false);

        ts.equals(result.gamePhase, "proposal", "Unsuccessful gov election - elect another")
        ts.equals(votesDirty, false , "Votes have been reset to undefined")
        ts.end()
    })

    t.end()
})

test("Testing the update stateMachine - legislative to endgame/power", (t)=>{
    
    
    t.test("Fascist passed - no power", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative'
        gameState.policyHand = ['fascist'];
        gameState.players = [{},{},{},{},{}]
        
        let result = gsManager.update(undefined,gameState)

        t.equals(result.gamePhase, "proposal", "Policy Passes - next proposal")
        // TODO: check that the players were set to previous govornment
        // TODO: check that president is updated

        ts.end()
    })

    t.test("Liberal passed - no power", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative'
        gameState.policyHand = ['liberal']
        gameState.players = [{},{},{},{},{}]
        
        t.equals(gsManager.update(undefined,gameState).gamePhase, "proposal", "Policy Passes - next proposal")

        ts.end()
    })

    t.test("Fascist passed - Power Activated", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative';
        gameState.policyHand = ['fascist'];
        gameState.policyTrackFascist = [true, true, true, false, false, false];
        gameState.policyTrackLiberal = [false]
        gameState.players = [{},{},{},{},{}];

        t.equals(gsManager.update(undefined,gameState).gamePhase, "power", "Policy Passes - power activated")

        ts.end()
    })

    t.test("Fascist passed - check which powers activated", (ts)=>{
        ts.test("update with 5 players 3 fascist policies", (tss)=>{
            let gsManager = GameStateManager();

            let testState = {
                gamePhase: 'legislative',
                powerActive: undefined,
                policyHand: ['fascist'],
                players:[ {},{},{},{},{} ],
                policyTrackFascist: [true ,true, false, false, false, false],
                policyTrackLiberal: [false]
            }

            let result = gsManager.update(undefined, testState)

            tss.equals(result.gamePhase,'power', "A power has been identified")
            tss.equals(result.activePower, 'top-3-cards', "5 players 3 policies - Top 3 card power ")
            tss.end()
        })

        ts.test("udpate with 7 players 2 fascist", (tss)=>{
            let gsManager = GameStateManager();

            let testState = {
                gamePhase: 'legislative',
                powerActive:undefined,
                policyHand:['fascist'],
                players:[{},{},{},{},{},{},{}],
                policyTrackFascist:[true, false, false, false, false,false],
                policyTrackLiberal:[false]
            }

            let result = gsManager.update(undefined, testState);

            tss.equals(result.gamePhase, 'power', "A power has been identified")
            tss.equals(result.activePower, 'investigate', "7 players 2 fascist - investigate happens")
            tss.end()
        })

        ts.test("update with 10 players 3 fascist polices ",(tss)=>{
            let gsManager = GameStateManager();

            let testState = {
                gamePhase: 'legislative',
                powerActive:undefined,
                policyHand:['fascist'],
                players:[{},{},{},{},{},{},{},{},{},{}],
                policyTrackFascist:[true, true, false, false, false,false],
                policyTrackLiberal:[false]
            }

            let result = gsManager.update(undefined, testState)

            tss.equals(result.gamePhase, 'power', "A power has been identified");
            tss.equals(result.activePower, 'special-election',"10 players 3 fascist - special election power")
            tss.end()
        })

        ts.test("udpate with 6 players 4 fascist policies",(tss)=>{
            let gsManager = GameStateManager();

            let testState = {
                gamePhase: 'legislative',
                powerActive:undefined,
                policyHand:['fascist'],
                players:[{},{},{},{},{},{}],
                policyTrackFascist:[true, true, true, false, false,false],
                policyTrackLiberal:[false]
            }

            let result = gsManager.update(undefined, testState)

            tss.equals(result.gamePhase, 'power', "A power has been identified");
            tss.equals(result.activePower, 'kill',"6 players 4 fascist - kill power")
            tss.end()
        })

        ts.end()
    })

    t.test("Fascist passed - Facisits win", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative'
        gameState.policyHand = ['fascist']
        gameState.policyTrackFascist = [true, true, true, true, true, true]

        t.equals(gsManager.update(undefined,gameState).gamePhase, "endGame", "Fascists win")

        ts.end()
    })

    t.test("Liberal passed - Game end", (ts)=>{
        let gsManager = GameStateManager();

        let gameState = StateTemplate();

        gameState.gamePhase = 'legislative'
        gameState.policyHand = ['liberal']
        gameState.policyTrackLiberal = [true, true, true, true, true]

        ts.equals(gsManager.update(undefined,gameState).gamePhase, "endGame", "Liberals win")

        ts.end()
    })

    t.end()
})

test("Testing the update stateMachine - power to endgame", (t)=>{
    t.test("hitler was killed", (ts)=>{
        gsManager = GameStateManager();

        let testState = {
            gamePhase:'power',
            powerActive: 'kill',
            powerComplete: true,
            players:[
                {
                    playerName: 'player1',
                    playerRef: 'one',
                    character: 'hitler',
                    alive:false
                }
            ]
        }

        let result1 = gsManager.update(undefined, testState);
        ts.equals(result1.gamePhase, 'endgame', "If hitler is killed game ends")
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

        let result = base.gsManager.proposeChancellor({playerRef: "player1", gameState:base.gs})

        let targetPlayer = result.players.filter((player)=>{return player.playerRef == 'player1'})[0]
        ts.equals(targetPlayer.proposedChancellor, true, "Correct chancellor proposed")

        ts.end()
    })

    t.test("Suggest a playerRef not in the game", (ts)=>{
        let base = getTestBase();

        base.gs.gamePhase = 'proposal';
        base.gs.players.push(base.player1, base.player2)

        ts.throws(()=>{base.gsManager.proposeChancellor({ playerRef:"player3", gameState:base.gs} )}, /No players with that playerRef/i, "Proposed chancellor not in game")
        ts.end()
    })

    t.test("Suggest a playerRef that matches multiples",(ts)=>{

        let base = getTestBase();

        base.gs.gamePhase = 'proposal';
        base.player2.playerRef = "player1"
        base.gs.players.push(base.player1, base.player2)

        ts.throws(()=>{base.gsManager.proposeChancellor({playerRef:"player1", gameState:base.gs}), /Multiple players with this playerRef/i, "Proposed chancellor playerRef matches mutliple players"})

        ts.end()
    })

    t.end()
})

test("Testing interaction functions: Election vote", (t)=>{
    t.test("Positive vote for a proposed govornment", (ts)=>{
        let base = getTestBase();

        base.gs.gamePhase = 'election';
        base.gs.players.push(base.player1, base.player2);
        
        let result = base.gsManager.castVote(undefined, "player1", true, base.gs)
        
        let targetPlayer = result.players.filter((player)=>{return player.playerRef == "player1"})[0]

        ts.equal(targetPlayer.voteCast, true, "Vote for government")

        ts.end()
    }) 

    t.test("Negative vote for a proposed govornment", (ts)=>{
        let base = getTestBase();

        base.gs.gamePhase = 'election';
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
        for(var i=0; i < 4; i++){players.push({alignment: undefined,character: undefined, president: false})}

        ts.throws(()=>{gameStateManager.assignRoles(players)}, /not enough players to assign roles/i, "Can't assign roles")
        
        ts.end()
    })

    t.test("Assigning roles: 5 player",(ts)=>{
        let players = []
        for(var i=0; i < 5; i++){players.push({alignment: undefined,character: undefined, president: false})}

        let result = gameStateManager.assignRoles(players)

        let fascists = result.filter((player)=>{ return player.alignment == 'fascist' })
        let hitler = result.filter((player)=>{ return player.character == 'hitler'})

        ts.equals(fascists.length,2, "Two fascists")
        ts.equals(hitler.length, 1, "Only one hitler")

        ts.end()
    })

    t.test("Assigning roles: 7 player", (ts)=>{
        let players = []
        for(var i=0; i < 7; i++){players.push({alignment: undefined,character: undefined, president: false})}

        let result = gameStateManager.assignRoles(players)

        let fascists = result.filter((player)=>{ return player.alignment == 'fascist' })
        let hitler = result.filter((player)=>{ return player.character == 'hitler'})

        ts.equals(fascists.length,3, "Three fascists")
        ts.equals(hitler.length, 1, "Only one hitler")
        ts.end()
    })

    t.test("Assigning roles: 10 players", (ts)=>{
        let players = []
        for(var i=0; i < 10; i++){players.push({alignment: undefined,character: undefined, president: false})}

        let result = gameStateManager.assignRoles(players)

        let fascists = result.filter((player)=>{ return player.alignment == 'fascist' })
        let hitler = result.filter((player)=>{ return player.character == 'hitler'})

        ts.equals(fascists.length,4, "Two fascists")
        ts.equals(hitler.length, 1, "Only one hitler")
        ts.end()
    })

    t.test("Assigning roles: Too many players",(ts)=>{

        let players = []
        for(var i=0; i < 12; i++){players.push({alignment: undefined,character: undefined, president: false})}

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
             playerName: 'one',
             alignment: 'liberal',
             character: 'liberal'},
            {playerRef:'player2',
             playerName: 'two',
             alignment:'fascist',
             character: 'hitler'},
            {playerRef:'player3',
             playerName: 'three',
             alignment:'fascist',
             character: 'hitler'}
        ]}

        let libResult = stateManager.getPrivatePlayerInfo(undefined, 'player1', gameState)
        let fasResult = stateManager.getPrivatePlayerInfo(undefined,'player2', gameState)

        ts.equals(libResult.alignment, 'liberal', "Checking liberal alignment")
        ts.equals(libResult.character, 'liberal', "Checking liberal character")
        ts.equals(fasResult.alignment, 'fascist', "Checking fascist alignment")
        ts.equals(fasResult.character, 'hitler', "Checking fascist character")
        ts.equals(fasResult.teamMates.length,2, "Checking for teammates" )
        ts.equals(fasResult.teamMates[0], 'two', "Index of myself")
        ts.equals(fasResult.teamMates[1], 'three', "Index of teammate")


        ts.end()
    })

    t.test("Player ref not in the game", (ts)=>{
        let gameState =
        {gamePhase: 'proposal',
        players: [
            {playerRef: 'player1',
             alignment: 'liberal',
             character: 'liberal'},
            {playerRef:'player2',
             alignment:'fascist',
             character: 'hitler'}
        ]}

        ts.throws(()=>{stateManager.getPrivatePlayerInfo(undefined,'player3',gameState)}, /playerRef not in game/i, "Error if payerRef not present")

        ts.end()
    })

    t.test("Player Info when in legislative phase- pres policy choice", (ts)=>{

        gameState = {
            gamePhase: 'legislative',
            policyHand: ['liberal', 'fascist', 'fascist'],
            players: [
                {
                    playerRef: 'player1',
                    playerName: 'one',
                    alignment: 'liberal',
                    character: 'liberal',
                    president: true
                },
                {
                    playerRef:'player2',
                    playerName:'two',
                    alignment: 'liberal',
                    character: 'liberal'
                },
                {
                    playerRef:'player3',
                    playerName: 'three',
                    alignment: 'fascist',
                    character: 'fascist',
                    chancellor: true
                }
            ]
        }

        let result = stateManager.getPrivatePlayerInfo(undefined, 'player1', gameState)

        ts.ok(result.policyHand, "President is given policies to chose from")
        ts.equals(result.policyHand.join(), 'liberal,fascist,fascist', "President given the right policy hand")

        let result2 = stateManager.getPrivatePlayerInfo(undefined, 'player2', gameState);
        ts.equals(result2.policyHand, undefined, "no policies given to non-president")

        let result3 = stateManager.getPrivatePlayerInfo(undefined, 'player3', gameState);
        ts.equals(result3.policyHand, undefined, "no policies for chancellor with 3 in hand")

        ts.end()
    })

    t.test("PlayerInfo when in legislative phase - chancellor choice", (ts)=>{
        let gameState = {
            gamePhase: 'legislative',
            policyHand:['liberal', 'fascist'],
            players:[
                {
                    playerRef: 'player1',
                    playerName: 'one',
                    alignment: 'liberal',
                    character: 'liberal',
                    chancellor: true
                },
                {
                    playerRef:'player2',
                    playerName: 'two',
                    alignment: 'liberal',
                    character:'liberal'
                },
                {
                    playerRef: 'player3',
                    playerName: 'three',
                    alignment: 'fascist',
                    character:'fascist',
                    president: true
                }
            ]
        }

        let result = stateManager.getPrivatePlayerInfo(undefined, 'player1', gameState);

        ts.ok(result.policyHand, "Chancellor has poicy hand")
        ts.equals(result.policyHand.join(), "liberal,fascist", "Chancellor has the right policyHand")

        let result2 = stateManager.getPrivatePlayerInfo(undefined, 'player2', gameState);
        ts.equals(result2.policyHand, undefined, "non-government doesn't get a policy hand")
        
        let result3 = stateManager.getPrivatePlayerInfo(undefined, 'player3', gameState);
        ts.equals(result3.policyHand, undefined, "President doesn't get policyHand with 2 in hand")

        ts.end()
    })

    t.test("PlayerInfo when in power phase", (ts)=>{
      ts.test("top-3-cards power", (tss)=>{

        let gsManager = GameStateManager();

        let testState = {
          gamePhase: 'power',
          powerActive: 'top-3-cards',
          players:[
            { playerName:'player1',
              playerRef:'one',
              alignment:'liberal',
              character:'liberal',
              president:true
            },
            { playerName:'player2',
              playerRef:'two',
              alignment:'liberal',
              character:'liberal',
              chancellor:true
            },
            { playerName:'player3',
              playerRef:'three',
              character: 'fascist',
              alignment: 'fascist',
            }
          ],
          policyDeck:['liberal','liberal','fascist', 'liberal']  
        }

        let result1 = gsManager.getPrivatePlayerInfo(undefined, 'one', testState);
        tss.equals(result1.topPolicyCards.join(), "liberal,liberal,fascist", "President can see top 3 cards")
        tss.equals(testState.policyDeck.join(), "liberal,liberal,fascist,liberal", "PolicyDeck on the gameState unchanged")

        let result2 = gsManager.getPrivatePlayerInfo(undefined, 'two', testState);
        tss.equals(result2.topPolicyCards, undefined, "No top cards for chancellor");

        let result3 = gsManager.getPrivatePlayerInfo(undefined, 'three', testState);
        tss.equals(result3.topPolicyCards, undefined, "No top cards for non-government");

        // TODO: how does this work if/when there are two cards in the deck - should it always check to see if there are 2 in deck and reshuffle deck then

        tss.end()

      })
      
      ts.test("investion power", (tss)=>{
        let gsManager = GameStateManager();

        // after the president has selected a player to investigate
        let testState = {
          gamePhase:'power',
          powerActive: 'investigate',
          players:[
            { playerName:'player1',
              playerRef:'one',
              alignment:'liberal',
              character:'liberal',
              president:true,
            },
            {
              playerName:'player2',
              playerRef:'two',
              alignment:'fascist',
              character:'hitler'
            }
          ],
          powerTarget: 'two'
        }

        let result1 = gsManager.getPrivatePlayerInfo(undefined, 'one', testState);
        tss.equals(result1.investigationResult.playerName, "player2", "investigationResult present for president");
        tss.equals(result1.investigationResult.alignment, "fascist", "investigationResult present for president");

        let result2 = gsManager.getPrivatePlayerInfo(undefined, 'two', testState);
        tss.equals(result2.investigationResult, undefined, "no investigationResult for non-president")

        tss.end()

      })
      
      ts.end()
    })

    t.end()
})

test("Testing function: nameToRef", (t)=>{
    let stateManager = GameStateManager();

    t.test("Player in the game", (ts)=>{
        gameState = {
            players:[{ playerRef:'player1', playerName:'one'},
                    {playerRef:'player2', playerName:'two'}]
        }

        ts.equals(stateManager.nameToRef(undefined, 'one', gameState), "player1", "Player is present")
        ts.end()
    })

    t.test("Player not in the game", (ts)=>{
        gameState = {
            players:[{ playerRef:'player1', playerName:'one'},
                    {playerRef:'player2', playerName:'two'}]
        }

        ts.throws(()=>{stateManager.nameToRef(undefined, 'three', gameState)}, /player not in game/i, "Player isn't in game")
        ts.end()
    })

    t.test("Multiple players with that name", (ts)=>{
        gameState = {
            players:[{ playerRef:'player1', playerName:'one'},
                    {playerRef:'player2', playerName:'one'}]
        }

        ts.throws(()=>{stateManager.nameToRef(undefined, 'one', gameState)}, /Multiple with that name/i, "multiple players with that name")
        ts.end()
    })

    t.end()
})

test("Test function: getPlayer",(t)=>{
    let stateManager = GameStateManager()

    t.test("Get existing player", (ts)=>{
        let gameState =
        {
            players:[{ playerRef:"player1", playerName:"one"},
                    {   playerRef:"player2", playerName:"two"}]
        }

        ts.equals(stateManager.getPlayer({gameState:gameState, playerRef:"player1"}).playerName, "one", "Checking getting a player")
        ts.end()
    })

    t.test("Try for player not in the game", (ts)=>{
        let gameState =
        {
            players:[{ playerRef:"player1", playerName:"one"},
                    {   playerRef:"player2", playerName:"two"}]
        }

        ts.throws(()=>{stateManager.getPlayer({gameState:gameState, playerRef:"player3"})}, /not in game/i, "Searching for player not there")
        ts.end()
    })

    t.test("Try for player in the game twice", (ts)=>{
        let gameState =
        {
            players:[{ playerRef:"player1", playerName:"one"},
                    {   playerRef:"player1", playerName:"two"}]
        }

        ts.throws(()=>{stateManager.getPlayer({gameState:gameState, playerRef:"player1"})}, /has multiple entries/i, "Searching for player represented twice")
        ts.end()
    })

    t.end()
})

test("Test function: Creating the policyDeck", (t)=>{
    let stateManager = GameStateManager();

    let result = stateManager.genPolicyDeck()
    let libCount = result.reduce((count, policy)=>{ return (policy == 'liberal') ? count+1: count },0)
    let fascCount = result.reduce( (count, policy)=>{ return (policy == 'fascist') ? count+1: count },0 )

    // check that there are the right number of cards
    t.equals(libCount, 6, "6 liberal cards")    
    t.equals(fascCount, 11, "11 fascist cards")

    // check that the positions are randomised
    let result2 = stateManager.genPolicyDeck()

    // need at least 1 difference
    var different = result.map((policyCard, index)=>{
        return ( policyCard != result2[index] ) ? true : false
    })
    
    t.ok(different.includes(true), "There is a difference between the two decks")

    //console.log(result, " : ", result2)

    t.end()
})

test("Combine two arrays and shuffle", (t)=>{
    let stateManager = GameStateManager();

    t.test("two arrays", (ts)=>{

        let arrays = [[1,2,3], [4,5,6]]
        let result = stateManager.shuffleArraysTogether(arrays)
        let allThere = [1,2,3,4,5,6].map((number)=>{ return result.includes(number)})

        ts.equals(result.length, 6, "Right number of components")
        ts.ok(!allThere.includes(false), "Check that all numbers are in the result arrray")

        ts.end()
    })

    t.test("one array", (ts)=>{
        
                let arrays = [[1,2,3]]
                let result = stateManager.shuffleArraysTogether(arrays)
                let allThere = [1,2,3].map((number)=>{ return result.includes(number)})
        
                ts.equals(result.length, 3, "Right number of components")
                ts.ok(!allThere.includes(false), "Check that all numbers are in the result arrray")
        
                ts.end()
    })



    t.end()
})

test("Test function: drawpolicyHand",(t)=>{
    let stateManager = GameStateManager();

    t.test("Normal card pull", (ts)=>{
        let gameState = StateTemplate();
        gameState.policyDeck = ['liberal','liberal','liberal','liberal','fascist','fascist','fascist','fascist' ]

        let result = stateManager.drawPolicyHand({gameState: gameState})

        ts.test(result.policyHand.length, 3, "Drew right number of cards")
        ts.test(result.policyDeck.length, 5, "Right number of cards left in deck")

        ts.end()
    })

    t.test("Cards in draw from last time", (ts)=>{
        let gameState = StateTemplate();
        gameState.policyDeck = ['liberal', 'liberal', 'fascist', 'liberal']
        gameState.policyHand = ['liberal'];

        ts.throws(()=>{stateManager.drawPolicyHand({gameState: gameState})}, /policyHand not empty/i, "Errors if there is something in policy hand");
    
        ts.end()
    })

    t.test("Less than 3 cards in deck", (ts)=>{
        let gameState = StateTemplate();
        gameState.policyDeck = ['liberal']
        gameState.policyDiscard = ['fascist', 'fascist', 'liberal']

        let result = stateManager.drawPolicyHand({gameState: gameState})

        ts.equals(result.policyHand.length, 3, "Drew three cards")
        ts.equals(result.policyDiscard.length, 0, "Empty discard")
        ts.equals(result.policyDeck.length, 1, "Right number of cards left in deck")

        ts.end()
    })

    t.end()
})

test("Test function: rotateGovernment",(t)=>{
    let stateManager = GameStateManager();

    t.test('successful govornment pass policy', (ts)=>{
        
        let player1 = {playerRef: 'player1', playerName: 'p1', president: true, chancellor:false}
        let player2 = {playerRef: 'player2', playerName: 'p2', president: false, chancellor:true}
        let player3 = {playerRef: 'player3', playerName: 'p3', president: false, chancellor:false}
        let player4 = {playerRef: 'player4', playerName: 'p4', president: false, chancellor:false}


        let gameState = {
            gamePhase: 'legislative',
            players: [player1, player2, player3, player4]
        }

        let result = stateManager.rotateGovernment({gameState:gameState})
        let chancellorCount = result.players.reduce((count, player)=>{ return (player.chancellor) ? 1 : count},0)
        
        ts.equals(player1.president, false, "prev pres removed")
        ts.equals(player2.president, true, "Next player assigned president")
        ts.equals(player2.chancellor, false, "Prev chancellor removed");
        ts.equals(chancellorCount, 0, "No chancellors in the result")
        
        ts.end()
    })

    t.test('failed govornment lose vote', (ts)=>{
        let player1 = {playerRef: 'player1', playerName: 'p1', president: true, chancellor:false}
        let player2 = {playerRef: 'player2', playerName: 'p2', president: false, chancellor:false, proposedChancellor:true}
        let player3 = {playerRef: 'player3', playerName: 'p3', president: false, chancellor:false}
        let player4 = {playerRef: 'player4', playerName: 'p4', president: false, chancellor:false}

        let gameState = {
            gamePhase: 'election',
            players: [player1, player2, player3, player4]
        }

        let result = stateManager.rotateGovernment({gameState:gameState})
        let chancellorCount = result.players.reduce((count, player)=>{ return (player.chancellor) ? 1 : count},0)
        let proposedChancellorCount = result.players.reduce((count, player)=>{ return (player.proposedChancellor) ? 1 : count},0)

        ts.equals(player1.president, false, "prev pres removed")
        ts.equals(player2.president, true, "Next player assigned president")
        ts.equals(proposedChancellorCount, 0, "No proposed chancellors");
        ts.equals(chancellorCount, 0, "No chancellors in the result")

        ts.end()
    })

    // !! write the tests for this
    t.test('special president defined', (ts)=>{
        const stateManager = GameStateManager();

        let gameState = {
            players:[
                {playerRef:'p1', playerName: 'player1', president:true },
                {playerRef:'p2', playerName: 'player2', chancellor:true },
                {playerRef:'p3', playerName: 'player3' },
                {playerRef:'p4', playerName: 'player4' },
                {playerRef:'p5', playerName: 'player5' }
            ],
            specialPresident: 'p3'
        }

        let result = stateManager.rotateGovernment({gameState});
        let presidents = result.players.filter( (player) => {return player.president == true })
        let chancellorCount = result.players.reduce( (count, player)=>{ return (player.chancellor == true) ? 1: count },0);
        let proposedChancellorCount = result.players.reduce( (count, player)=>{ return (player.proposedChancellor == true) ? 1: count},0 )

        ts.equals(presidents.length, 1, "Only one president set");
        ts.equals(presidents[0].playerRef, 'p3', "The right special president assigned");
        // Do we need to reset the special president indicator here?
        //ts.equals(result.specialPresident, undefined, "Special president flag removed")
        ts.equals(result.postSpecialPresident, 'p2', "The correct player is set to take over next");
        ts.equals(chancellorCount, 0, "Chancellor cleared");
        ts.equals(proposedChancellorCount, 0, "No proposedCancellors in result");
        ts.end()
    })

    t.test('postSpecialPresident Defined',(ts)=>{
        const stateManager = GameStateManager();

        let gameState = {
            players:[
                {playerRef:'p1', playerName: 'player1'},
                {playerRef:'p2', playerName: 'player2', chancellor:true },
                {playerRef:'p3', playerName: 'player3' },
                {playerRef:'p4', playerName: 'player4', president: true },
                {playerRef:'p5', playerName: 'player5' }
            ],
            postSpecialPresident: 'p2',
            specialPresident:'p4'
        }

        let result = stateManager.rotateGovernment({gameState});
        let presidents = result.players.filter( (player) =>{ return player.president == true } );
        let chancellorCount = result.players.reduce( (count, player)=>{ return (player.chancellor == true) ? 1: count },0 );
        
        ts.equals(presidents.length, 1, "Only one president assigned");
        ts.equals(presidents[0].playerRef, 'p2', "Predidency returned to the right player")
        ts.equals(gameState.specialPresident, undefined, "Special president removed")
        ts.equals(gameState.postSpecialPresident, undefined, "postSpecial President removed")
        ts.equals(chancellorCount, 0, "No chancellors in the rotated government")

        ts.end()

    })

    t.end()
})

test("Test function: enactPolicy",(t)=>{
    const stateManager = GameStateManager();

    test('liberal policy passed', (ts)=>{
        const gameState = {
            policyHand:['liberal'],
            policyTrackLiberal:[false, false, false, false,false,],
            policyTrackFascist:[false, false, false, false, false, false]
        }
        
        const result = stateManager.enactPolicy({gameState: gameState});
        
        ts.equals(result.policyTrackLiberal.indexOf(true), 0, "Liberal track has a policy"); 
        ts.equals(result.policyTrackFascist.indexOf(true), -1, "Fascist track has no policies")
        ts.equals(result.policyHand.length, 0, "Policy hand is empty")

        ts.end()
    })

    test('second liberal policy passed', (ts)=>{
        const gameState = {
            policyHand:['liberal'],
            policyTrackLiberal:[true, false, false, false, false, false],
            policyTrackFascist:[false, false, false, false, false, false]
        }
        const result = stateManager.enactPolicy({gameState: gameState});
        ts.equals(result.policyTrackLiberal[1], true, "second item is true in liberal track");
        ts.equals(result.policyTrackLiberal.filter(val => val == true).length, 2, "there are 2 true items in the liberal track");
        ts.equals(result.policyTrackFascist.indexOf(true), -1, "Fascist track has nothing");
        ts.equals(result.policyHand.length, 0, "policy hand is empty");

        ts.end()
    })

    test('fascist policy passed', (ts)=>{
        const gameState = {
            policyHand:['fascist'],
            policyTrackLiberal:[false, false, false, false,false,],
            policyTrackFascist:[false, false, false, false, false, false]
        }

        const result = stateManager.enactPolicy({gameState: gameState});
        
        ts.equals(result.policyTrackFascist.indexOf(true), 0, "Fascist track has a policy");
        ts.equals(result.policyTrackLiberal.indexOf(true), -1, "Fascist track has no policies")
        ts.equals(result.policyHand.length, 0, "Policy hand is empty")

        ts.end()
    })

    test('no policies in hand',(ts)=>{

        const gameState = {
            policyHand:[],
            policyTrackLiberal:[false, false, false, false,false,],
            policyTrackFascist:[false, false, false, false, false, false]
        }

        ts.throws(()=>{stateManager.enactPolicy({gameState: gameState})},/no policies to enact/i, "Error when no poliies are in hand" )

        ts.end()
    })

    test('too many policies in hand', (ts)=>{

        const gameState = {
            policyHand:['liberal', 'fascist'],
            policyTrackLiberal:[false, false, false, false,false,],
            policyTrackFascist:[false, false, false, false, false, false]
        }

        ts.throws(()=>{stateManager.enactPolicy({gameState: gameState})},/more than one policy to enact/i, "Error when multiple policies in hand" )

        ts.end()
    })

    t.end()
})

test("Test function: joinSpectator", (t)=>{
    
    t.test("joining a spectator ref", (ts)=>{
        const stateManager = GameStateManager();

        let testState = {
            spectators:[]
        }

        let result = stateManager.joinSpectator({gameState: testState, spectatorRef:'s1'})

        ts.equal(result.spectators.length, 1, "Only one spectator added");
        ts.equal(result.spectators[0], 's1', "Correct spectator")
        ts.end()
    })

    t.test("Join without spectatorRef", (ts)=>{
        const stateManager = GameStateManager();

        let testState = {
            spectators:[]
        }

        ts.throws(()=>{stateManager.joinSpectator({gameState:testState})}, /No spectator reference defined/i, "Throws error when no spectator reference given")
        ts.end()
    })

    t.test("Join without gameState", (ts)=>{
        const stateManager = GameStateManager();
        
        ts.throws(()=>{stateManager.joinSpectator()}, /No gameState found for gameRef/i, "Error thrown when no gameState or sessionKey given")
        ts.end()
    })

    t.end()
})

test("Test function: getSpectatorRefs", (t)=>{
    t.test("Normal get spectator refs", (ts)=>{
        const stateManager = GameStateManager();

        let testState = {
            spectators:['s1']
        }

        let result = stateManager.getSpectatorRefs({gameState: testState});

        ts.equal(result.length, 1, "Returns correct number of spectators");
        ts.equal(result[0], 's1', "Returns correct spectatorRef value")

        ts.end()

    })

    t.test("getSpectatorRefs without gameState", (ts)=>{
        const stateManager = GameStateManager();

        ts.throws(()=>{stateManager.getSpectatorRefs()}, /No gameState found for gameRef:/i, "Throws error when no gameState defined")
        ts.end()
    })
})

test("Test function: removeSpectator", (t)=>{
    t.test("Remove with player in game", (ts)=>{
        const stateManager = GameStateManager();
        let testState = {
            spectators:['s1']
        }

        let result = stateManager.removeSpectator({spectatorRef: 's1', gameState: testState});
    
        ts.equal(result.spectators.length, 0, "No spectators left");
        ts.end()
    })

    t.test("Try to remove a spectator not spectating", (ts)=>{
        const stateManager = GameStateManager();
        let testState = {
            spectators: ['s1']
        }

        ts.throws(()=>{stateManager.removeSpectator( {spectatorRef: 's2', gameState: testState} )}, /spectatorRef is not spectating/i, "Error thrown removing player not spectating");
        ts.end()
    })

    t.test("Call function without playerRef defined", (ts)=>{
        const stateManager = GameStateManager();
        let testState = {
            spectators: ['s1']
        }

        ts.throws(()=>{stateManager.removeSpectator( {gameState:testState} )}, /No spectatorRef defined/i, "Error thrown if no playerRef defined")
        ts.end()
    })

    t.test("Call function without gameState", (ts)=>{
        const stateManager = GameStateManager();
        
        ts.throws(()=>{stateManager.removeSpectator( )}, /No gameState found for gameRef/i, "Error thrown if no gameState provided")
        ts.end()
    })

    t.end()
})

test("Test selectPlayer function", (t)=>{
    t.test("Select player for chancellor proposal", (ts)=>{

        const stateManager = GameStateManager();

        const testState = {
            gamePhase: "proposal",
            players:[
                {playerRef: 'p1', playerName: 'player1', president: true},
                {playerRef: 'p2', playerName: 'player2'}
            ]
        }
        
        const result = stateManager.selectPlayer({gameState: testState, selectedPlayer:'p2', actingPlayer:'p1'});
        const  targetPlayer = result.players.filter((player)=>{return player.playerRef == 'p2'})[0]

        ts.equals(targetPlayer.proposedChancellor, true, "Correct chancellor proposed")

        ts.end()
    })

    t.test("Select player in powers phase",(ts)=>{
        ts.test("kill power", (tss)=>{
            const gsManager = GameStateManager();

            const testState = {
                gamePhase: "power",
                powerActive: "kill",
                powerTarget: undefined,
                players:[
                    { playerName:'player1',
                      playerRef: 'one',
                      president:true
                    },
                    { playerName: 'player2',
                      playerRef: 'two'
                    }
                ]
            }

            let result = gsManager.selectPlayer({gameState:testState, selectedPlayer: 'two', actingPlayer:'one'});
            tss.equals(result.powerTarget, 'two', "Target player to kill set");

            tss.end()
        })

        ts.test("investigate power", (tss)=>{
            const gsManager = GameStateManager();

            const testState = {
                gamePhase: "power",
                powerActive: "investigate",
                powerTarget: undefined,
                players:[
                    { playerName:'player1',
                      playerRef: 'one',
                      president:true
                    },
                    { playerName: 'player2',
                      playerRef: 'two'
                    }
                ]
            }

            let result = gsManager.selectPlayer({gameState:testState, selectedPlayer: 'two', actingPlayer:'one'});
            tss.equals(result.powerTarget, 'two', "Target player to kill set");

            tss.end()
        })

        ts.test("special-election power", (tss)=>{
            const gsManager = GameStateManager();

            const testState = {
                gamePhase: "power",
                powerActive: "special-election",
                powerTarget: undefined,
                players:[
                    { playerName:'player1',
                      playerRef: 'one',
                      president:true
                    },
                    { playerName: 'player2',
                      playerRef: 'two'
                    }
                ]
            }

            let result = gsManager.selectPlayer({gameState:testState, selectedPlayer: 'two', actingPlayer:'one'});
            tss.equals(result.powerTarget, 'two', "Target player to kill set");

            tss.end()
        })

        ts.test("top-3-cards power", (tss)=>{
            const gsManager = GameStateManager();

            const testState = {
                gamePhase: "power",
                powerActive: "top-3-cards",
                powerTarget: undefined,
                players:[
                    { playerName:'player1',
                      playerRef: 'one',
                      president:true
                    },
                    { playerName: 'player2',
                      playerRef: 'two'
                    }
                ]
            }

            tss.throws(()=>{gsManager.selectPlayer({
                        gameState:testState,
                        selectedPlayer: 'two',
                        actingPlayer:'one'
                    });
                },
                /power doesn't require selection/i,
                "top-3-cards errors when selecting"
            )
            

            tss.end()
        })

        ts.end()
    })

    t.test("Select players if inappropriate phase", (ts)=>{

        ts.test("election", (tss)=>{
            const gsManager = GameStateManager();

            const testState = {
                gamePhase: 'election',
                players:[
                    { playerName:'player1',
                      playerRef: 'one',
                      president:true
                    },
                    { playerName: 'player2',
                      playerRef: 'two'
                    }
                ]
            }

            tss.throws(()=>{
                gsManager.selectPlayer({
                    gameState:testState,
                    selectedPlayer: 'two',
                    actingPlayer: 'one'
                }),
                /phase doesn't allow selecting/i
            })

            tss.end()
        })
        ts.end()
    })

    t.end()
})

test("Test function: enactPower", (t)=>{
    
    t.test("top-3-cards active - check power complete", (ts)=>{
        const stateManager = GameStateManager();

        const testState = {
            gamePhase: 'power',
            powerActive: 'top-3-cards',
            players:[
                {playerRef: 'p1', playerName: 'player1', president:true, ready:true},
                {playerRef: 'p2', playerName: 'player2'}
            ],
            policyTrackFascist: [true, true, true, false, false, false]
        }
        
        let result = stateManager.enactPower({gameState:testState})
        ts.equals(result.powerComplete, true, "3 top cards power complete")
        let president = gsManager.searchPlayers({ gameState:result, searchPairs:{'president':true}, singleResponseExpected:true})[0]
        ts.equals(president.ready, false, "president ready has been set to false")
        // 
        ts.end()

    })

    t.test("kill power active - check power complete", (ts)=>{
        const gsManager = GameStateManager();

        const testState = {
            gamePhase:'power',
            powerActive: 'kill',
            players:[
                {playerRef:'p1', playerName:'player1', alive:true}
            ],
            targetPlayer: 'p1',
            powerComplete: false
        }

        let result = gsManager.enactPower({gameState: testState});
        ts.equals(result.players[0].alive, false, "player is dead");
        ts.equals(result.targetPlayer, undefined, "targetPlayer is cleared");
        ts.equals(result.powerComplete, true, "kill power is resolved")
        ts.end()
    })

    t.test("investigate power - check power complete", (ts)=>{
        const gsManager = GameStateManager();

        const testState = {
            gamePhase: 'power',
            powerActive: 'investigate',
            players:[
                { playerRef: 'p1', playerName:'player1', ready:true, president:true}
            ],
            powerComplete: false
        }

        let result = gsManager.enactPower({gameState:testState});
        ts.equals(result.powerComplete, true, "investigate power is resolved");
        ts.equals(result.players[0].ready, false, "president ready reset")
        ts.end()

    })

    t.test("special-election - check the power completes",(ts)=>{
        const gsManager = GameStateManager();

        const testState = {
            gamePhase: 'power',
            powerActive:'special-election',
            players:[
                { playerRef: 'p1', playerName:'player1', president:true},
                { playerRef: 'p2', playerName:'player2',}
            ],
            targetPlayer:'p1'
        }

        let result = gsManager.enactPower({gameState:testState});
        ts.equals(result.powerComplete, true, "special-election power resolved");
        ts.equals(result.specialPresident, 'p1', "special president is defined");
        ts.equals(result.targetPlayer, undefined, "target player is cleared");

        ts.end()
    })

    t.end()
})

test("Testing getPower",(t)=>{
    
    const stateManager = GameStateManager();

    t.equals(stateManager.getPower({
        numberOfPlayers:5, 
        fascistPolicyCount: 1
      }),
      "no-power",
      "No power with 5 people 1 fascist policys"
    );

    t.equals(stateManager.getPower({
        numberOfPlayers:7, 
        fascistPolicyCount: 2
      }),
      "investigate",
      "Investigate with 7 people 2 fascist policies"
    );

    t.equals(stateManager.getPower({
        numberOfPlayers:9, 
        fascistPolicyCount: 1
      }),
      "investigate",
      "No power with 9 people 1 fascist policy"
    );

    t.equals(stateManager.getPower({
        numberOfPlayers:5, 
        fascistPolicyCount: 5
      }),
      "kill",
      "No power with 5 people 5 fascist policies"
    );

    t.throws(()=>{
        stateManager.getPower({
          numberOfPlayers:7, 
          fascistPolicyCount: 0
        })
      },
      /Not enough policies for a power/i,
      "Too few policies"
    );

    t.throws(()=>{
        stateManager.getPower({
          numberOfPlayers:7, 
          fascistPolicyCount: 6
        })
      },
      /Game should have ended/i,
      "Too many fascist policies"
    );

    t.throws(()=>{
        stateManager.getPower({
          numberOfPlayers:4, 
          fascistPolicyCount: 1
        })
      },
      /Not enough players for a game/i,
      "Too few players for a game"
    );

    t.throws(()=>{
        stateManager.getPower({
          numberOfPlayers:11, 
          fascistPolicyCount: 1
        })
      },
      /Too many players in the game/i,
      "Too many players for a game"
    );

    t.end()
})

test("Testing searchPlayers", (t)=>{
  t.test("Normal returns from search", (ts)=>{
    let gsManager = GameStateManager();
    let testState = {
      players:[
        {
          playerName: 'player1',
          playerRef: 'one',
          character: 'hitler',
          president: true
        },
        {
          playerName: 'player2',
          playerRef: 'two',
          alignment:'liberal',
          character: 'liberal'
        },
        {
          playerName: 'player3',
          playerRef: 'three',
          chancellor: true,
          alignment:'liberal'
        }
      ]
    }

    let result1 = gsManager.searchPlayers({ gameState:testState, searchPairs:{ playerName:'player1' } })
    ts.equals(result1.length, 1, "Only one player in result")
    ts.equals(result1[0].playerName, 'player1', "Right player passed back")
    
    let result2 = gsManager.searchPlayers({gameState:testState, searchPairs:{ character: 'hitler' } })
    ts.equals(result2.length, 1, "One player is hitler");
    ts.equals(result2[0].playerRef, 'one', "Correct hitler player returned");

    let result3 = gsManager.searchPlayers( {gameState:testState, searchPairs:{alignment:'liberal'} } );
    ts.equals(result3.length, 2, "Two liberal players in the game");
    ts.equals(result3[0].playerRef, 'two', "One liberal is correct")
    ts.equals(result3[1].playerRef, 'three', "Both liberal players are right");

    let result4 = gsManager.searchPlayers( {gameState: testState, searchPairs: {playerName:'player99'} })
    ts.equals(result4.length, 0, "Empty array returned when no matches")

    ts.end()
  })
  t.end()
})

test("Testing killPlayer", (t)=>{
    let gsManager = GameStateManager();

    let testState ={
        players:[
            {
                playerRef:'one',
                alive: true
            }
        ],
        targetPlayer:'one'
    }

    let result = gsManager.killPlayer({gameState:testState})
    t.equals(result.players[0].alive, false, "Player is no longer alive")

    t.end()
})

