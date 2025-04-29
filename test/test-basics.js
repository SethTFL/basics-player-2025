const ROOT = /** @type {HTMLDivElement} */ (document.querySelector("[data-boxcast]"));
const BUTTONS = document.createElement("div");
document.body.append(BUTTONS);
let TRACKS = /** @type {TextTrack[]} */([]);


/** @typedef {[label:string, on:boolean]} TrackWrap */


const SetState =()=>{
    /** @type {TrackWrap} */
    const trackState = TRACKS.map(t=>[t.label, t.mode == "showing"]);

    // mock rendering
    BUTTONS.innerHTML = "";
    trackState.forEach((t, i)=>
    {
        const button = document.createElement("button");
        button.innerText = t[0];
        button.addEventListener("click", ()=>pick(i));
        button.setAttribute("data-active", t[1]);
        BUTTONS.append(button);    
    });
}

const scan =()=>
{
    const video = ROOT.querySelector('video');
    TRACKS = Array.from(video?.textTracks);

    if(video?.textTracks)
    {
        video.textTracks.removeEventListener("change", SetState);
        video.textTracks.addEventListener("change", SetState);
        SetState();
    }
};

/** @type {(index:number)=>void} */
const pick =(index)=>
{
    index = TRACKS[index].mode == "showing" ? -1 : index;
    TRACKS.forEach( (t, i)=>TRACKS[i].mode = (i==index) ? "showing" : "disabled" );
    SetState();

    ROOT.querySelectorAll('i.boxcast-cc-checked').forEach(c=>c.classList.remove("boxcast-icon-check"));
    ROOT.querySelector(`[data-cc-${index === -1 ? 'disable-captions' : `enable-caption-id-${index}`}-checked]`)?.classList.add('boxcast-icon-check');
    ROOT.querySelector("button[data-cc-button]")?.classList[index !== -1 ? "add" : "remove"]("enabled");
}

globalThis.scan = scan;
globalThis.pick = pick;