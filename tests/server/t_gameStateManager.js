test = require('tape')
GameStateManager = require('./../../src/server/GameStateManager.js')

const stateTemplate = {
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

test("Testing the gameCreation process", (t)=>{

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

    // mock up a gamestate to test
    state1 = Object.assign({},stateTemplate)
    player1_1 = Object.assign({},playerTemplate)
    player1_2 = Object.assign({},playerTemplate)

    state1.

    // test the function using the mock as a second argument

    t.ok(true, "testing this")
    t.end()
})