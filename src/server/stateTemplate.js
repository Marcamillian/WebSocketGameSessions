const StateTemplate = ()=>{
    return {
        gamePhase: 'lobby',
        players:[], // collection of player objects
        policyDraw:[], // collection of card objects
        policyDiscard:[], // collection of card objects
        policyHand:[],
        voteFailTrack:[false, false, false],  // 
        policyTrackFascist:[false, false, false, false, false, false], // 6 long
        policyTrackLiberal:[false, false, false, false, false],  // 5 long
        powerTarget: undefined
    }
}

module.exports = StateTemplate;