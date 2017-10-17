const PlayerTemplate = ()=>{
    return {
        playerRef: undefined, // string to link req.session
        playerName: undefined, // string for display name

        allignment: undefined, // string to show what side they are on
        character: undefined, // if they are fascist/hitler/liberal

        president: false,   // currently govornment
        chancellor: false,  // currently govornment
        // lobby phase
        ready: false,           // ready to start the game
        // proposal phase
        prevGov: false,       // if they were in the last successful gov
        proposedChancellor: false,
        // vote phase
        voteCast: undefined
    }
}

module.exports = PlayerTemplate; 