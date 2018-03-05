const envelope = document.querySelector('.envelope')
const flap = document.querySelector('.envelope .flap')

var toggleClass=(element, tag)=>{
    element.classList.toggle(tag)
}

var toggleEnvelopeOpen = ()=>{

    if(!envelope.classList.contains("open")){
        toggleClass(flap, "flipped")
        window.setTimeout(()=>{toggleClass(envelope, "open")}, 999)
        window.setTimeout(()=>{toggleClass(envelope, "show-card")}, 1000)
    }else{
        toggleClass(envelope,"show-card")
        window.setTimeout(()=>{toggleClass(envelope, "open")}, 999)
        window.setTimeout(()=>{toggleClass(flap, "flipped")}, 1000)
    }

}

flap.addEventListener("click",()=>{
    toggleEnvelopeOpen()
})