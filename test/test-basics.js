const ROOT = /** @type {HTMLDivElement} */ (document.querySelector("[data-boxcast]"));
const BUTTONS = document.createElement("div");
document.body.append(BUTTONS);
let TRACKS = /** @type {TextTrack[]} */([]);

const handlerTrack =()=> TRACKS.forEach( (t, i)=>BUTTONS.children[i].setAttribute("data-active", TRACKS[i].mode ));

const scan =()=>
{
    const video = ROOT.querySelector('video');
    TRACKS = Array.from(video?.textTracks);

    BUTTONS.innerHTML = "";
    TRACKS.forEach((t, i)=>
    {
        const button = document.createElement("button");
        button.innerText = TRACKS[i].label;
        button.addEventListener("click", ()=>pick(i));
        BUTTONS.append(button);        
    })

    if(video?.textTracks)
    {
        ROOT.querySelector("[data-cc-controls]")?.remove();
        video.textTracks.removeEventListener("change", handlerTrack);
        video.textTracks.addEventListener("change", handlerTrack);
        handlerTrack();
    }

};

/** @type {(index:number)=>void} */
const pick =(index)=>
{
    index = TRACKS[index].mode == "showing" ? -1 : index;
    TRACKS.forEach( (t, i)=>TRACKS[i].mode = (i==index) ? "showing" : "disabled" );
}

globalThis.scan = scan;
globalThis.pick = pick;