const StateTemplate = ()=>{
    return {
        gamePhase: 'lobby',     // 'lobby' || 'proposal' || 'election' || 'legislative' || 'power' || 'endgame'
        players:[], // collection of player objects
        spectators:[], // list of spectator references
        policyDeck:[], // collection of card objects to be drawn
        policyDiscardPile:[], // collection of card objects discarded
        policyHand:[],  // hand of cards for the govornment to pick
        voteFailTrack:[false, false, false],  // prevent repeated failed elections
        policyTrackFascist:[false, false, false, false, false, false], // 6 long - policies played
        policyTrackLiberal:[false, false, false, false, false],  // 5 long - policies played
        powerTarget: undefined,  // target of the power - playerRef
        powerActive: undefined, // string naming the active power
        powerComplete: false, // boolean for if the power is complete
        specialPresident: undefined // playerRef of specially elected president
    }
}

module.exports = StateTemplate;