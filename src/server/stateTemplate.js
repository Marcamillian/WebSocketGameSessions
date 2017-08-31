const StateTemplate = ()=>{
    return {
        gamePhase: 'lobby',
        players:[], // collection of player objects
        policyDraw:[], // collection of card objects
        policyDiscard:[], // collection of card objects
        voteFailTrack:[false, false, false]  // 
    }
}

module.exports = StateTemplate;