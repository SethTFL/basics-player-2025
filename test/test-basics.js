const ROOT = /** @type {HTMLDivElement} */ (document.querySelector("[data-boxcast]"));
const BUTTONS = document.createElement("div");
document.body.append(BUTTONS);
/** @type {TextTrackList|undefined} */
let TRACKS = undefined;

const LANGS = [];

const handlerTrack =()=>
{
    if(TRACKS)
    {
        for(let i=0; i<TRACKS.length; i++)
        {
            BUTTONS.children[i].setAttribute("data-active", TRACKS[i].mode == "showing");
        }
    }
};

const scan =()=>
{
    const video = ROOT.querySelector('video');
    TRACKS = video?.textTracks;
    BUTTONS.innerHTML = "";
    LANGS = [];
    if(TRACKS)
    {
        for(let i=0; i<TRACKS.length; i++)
        {
            LANGS[i] = TRACKS[i].label;
            const button = document.createElement("button");
            button.innerText = TRACKS[i].label;
            button.addEventListener("click", ()=>pick(i));
            BUTTONS.append(button);
        }

        TRACKS.removeEventListener("change", handlerTrack);
        TRACKS.addEventListener("change", handlerTrack);
        handlerTrack();
    }
};

/** @type {(index:number)=>void} */
const pick =(index)=>
{
    if(TRACKS)
    {
        if(TRACKS[index].mode == "showing")
        {
            index = -1;
        }

        for(let i=0; i<TRACKS.length; i++)
        {
            TRACKS[i].mode = "disabled";
        }
    
        const cc = index !== -1;
        cc && (TRACKS[index].mode = "showing");

        ROOT.querySelectorAll('i.boxcast-cc-checked').forEach(c=>c.classList.remove("boxcast-icon-check"));
        ROOT.querySelector(`[data-cc-${index === -1 ? 'disable-captions' : `enable-caption-id-${index}`}-checked]`)?.classList.add('boxcast-icon-check');
        ROOT.querySelector("button[data-cc-button]")?.classList[cc ? "add" : "remove"]("enabled");
    }
}

globalThis.scan = scan;
globalThis.pick = pick;