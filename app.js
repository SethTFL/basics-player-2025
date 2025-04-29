import 'https://js.boxcast.com/v3.min.js';

import React, { createElement as h, useState, useEffect, useRef, render } from "./bundle-preact.js";


/** @type {(props:{channel:string, interval:number, mockURL?:string})=>any} */
const App = props =>
{
    const [ListGet, ListSet] = useState(/** @type {Boxcast.Broadcast[]}*/([]));
    const [SelectedGet, SelectedSet] = useState(/** @type {string|null} */(null));
    const [LeadingGet, LeadingSet] = useState(/** @type {Boxcast.Broadcast|null} */(null));
    const [AlertGet, AlertSet] = useState(false);
    const [UserClickGet, UserClickSet] = useState(false);

    /** @type {(inList:Array<Boxcast.Broadcast>)=>Array<Boxcast.Broadcast>} */
    const SortStart = (inList) => {
        inList.sort((a, b) => a.starts_at > b.starts_at ? 1 : -1);
        inList.forEach( item => item.start = DateParse(item.starts_at));
        return inList;
    };

    const PlayerID = "boxcast-player";
    const Player = useRef(/** @type {Boxcast.Player | null}*/(null));
    const ScrollToRef = useRef(/** @type {HTMLElement | null} */(null));

    /////////////////////////////////////////////////////////////////////////////

    const TRACKS = React.useRef(/** @type {TextTrack[]} */([]));

    /** @typedef {[label:string, on:boolean]} TrackWrap */

    const [TracksGet, TracksSet] = React.useState(/** @type {TrackWrap[]} */([]));

    const updateTrackState =()=>
    {
        TracksSet(TRACKS.current.map(t=>[t.label, t.mode == "showing"]));
    }

    const scan =()=>
    {
        const video = Player.current?._el.querySelector('video');
        TRACKS.current = video?.textTracks ? Array.from(video.textTracks) : [];
    
        if(video?.textTracks)
        {
            video.textTracks.removeEventListener("change", updateTrackState);
            video.textTracks.addEventListener("change", updateTrackState);
            updateTrackState();
        }
    };
    
    /** @type {(index:number)=>void} */
    const pick =(index)=>
    {
        index = TRACKS.current[index].mode == "showing" ? -1 : index;
        TRACKS.current.forEach( (t, i)=>TRACKS.current[i].mode = (i==index) ? "showing" : "disabled" );
        updateTrackState();
    
        Player.current?._el.querySelectorAll('i.boxcast-cc-checked').forEach(c=>c.classList.remove("boxcast-icon-check"));
        Player.current?._el.querySelector(`[data-cc-${index === -1 ? 'disable-captions' : `enable-caption-id-${index}`}-checked]`)?.classList.add('boxcast-icon-check');
        Player.current?._el.querySelector("button[data-cc-button]")?.classList[index !== -1 ? "add" : "remove"]("enabled");
    }

    /////////////////////////////////////////////////////////////////////////////

    // on mount
    useEffect(()=>
    {
        Player.current = boxcast(`#${PlayerID}`);

        /** @type {()=>Promise<void>} */
        const Ping = async () =>
        {
            const response = await fetch(props.mockURL ? props.mockURL : `https://rest.boxcast.com/channels/${props.channel}/broadcasts?l=50`);
            /** @type {Array<Boxcast.BroadcastRaw>} */
            const json = await response.json();
            ListSet(SortStart(json));
            //console.log(Player.current);
            
            scan();
        };

        console.log("MOUNT", Player.current);

        Ping();
        const timer = setInterval(Ping, props.interval);
        return ()=>clearInterval(timer);
    }
    , []);

   // on new list
   useEffect(()=>
   {
       let leading;
       for(let i=0; i<ListGet.length; i++)
       {
           if(ListGet[i].timeframe != "past")
           {
               leading = ListGet[i];

               if(leading.timeframe == "current" || leading.timeframe == "preroll") // if something is selected other than the leading event, alert the user
               {
                    if(leading.id != LeadingGet?.id)// is the leading item about to change?
                    {
                        if(leading.id != SelectedGet)
                        {
                            AlertSet(true);
                        }
                    }
               }

               if(SelectedGet == null) // if nothing is selected select the leading event
               {
                   SelectedSet(leading.id);
               }

               LeadingSet(leading);

               return;
           }
       }

        if(ListGet.length) // if there are events but theres no leading event, clear leading and select the first event
        {
            LeadingSet(null);
            if(SelectedGet == null)
            {
                SelectedSet(ListGet[0].id);
            }
            AlertSet(false);
        }
    }
    , [ListGet]);

    // on new video selected
    useEffect(()=>
    {
        console.log("new video select")
        const settings = {
            selectedBroadcastId: SelectedGet,
            showTitle: true,
            showDescription: true,
            showCountdown: true,
            showRelated: false,
            autoplay: true,
            defaultVideo: "next",
            onPlayerStateChanged:/** @type {Boxcast.PlayerHandler} */(state, details)=>{ console.log("CHANGE", state, details);},
        };

        globalThis.player = Player.current;

        Player.current?.loadChannel(props.channel, settings);
        if(UserClickGet)
        {
            setTimeout(()=>ScrollToRef.current?.scrollIntoView({ behavior: "smooth" }), 500);
            UserClickSet(false);
        }
    }
    , [SelectedGet, UserClickGet]);


    /** @type {(inItem:Boxcast.Broadcast)=>void} */
    const SelectionTransition = (inItem) => 
    {
        SelectedSet(inItem.id);
        UserClickSet(true);
    };

    const selectedIndex = ListGet.findIndex((item)=>item.id == SelectedGet);
    const selected = ListGet[selectedIndex]; // we need the index of the boxcat event to lookup the index of the spfio event

    return h("div", {}, [
        h("div", { className: "Boxcast-Upper", ref: ScrollToRef }, [
            h("div", { className: "Boxcast-Player", id: PlayerID }),
            h("div", { className: "Boxcast-Active" }, [
                h("h2", {}, selected?.name)
            ]),
            h("div", {class:"languages"}, TracksGet.map((t, i)=>h("button",
                {
                    onClick:()=>pick(i),
                    className: t[1] ? "active" : "",
                }, t[0]))
            )
        ]),
        h("div", { className: "Boxcast-Playlist" }, 
            ListGet.map((item, index) =>
                h(BroadcastItem, {
                    item: item,
                    previous: ListGet[index - 1],
                    priority: item.id == LeadingGet?.id,
                    selected: item.id == SelectedGet,
                    select: () => SelectionTransition(item)
                })
            )
        ),
        h("div", { className: `Boxcast-Alert ${AlertGet ? "Show" : ""}` }, [
            h("span", { className: "Close", onClick: () => { AlertSet(false); } }, "Dismiss ×"),
            h("h4", {}, "A new session is starting:"),
            h("p", {}, LeadingGet?.name),
            h("button", { onClick: () => { LeadingGet && SelectionTransition(LeadingGet); AlertSet(false); } }, "Watch Now")
        ])
    ]);

}

/** @type {(props:{item:Boxcast.Broadcast, previous: false | Boxcast.Broadcast,  priority:boolean, selected:boolean, select:()=>void})=>any} */
const BroadcastItem = ({item, previous, priority, selected, select}) =>
{
    // pointer
    let pointerText;
    if (priority){ pointerText = h("div", {class:"Badge Next"}, "Next") }
    if(item.timeframe == "preroll"){ pointerText = h("div", {class:"Badge Soon"}, "Soon") }
    if(item.timeframe == "current"){ pointerText = h("div", {class:"Badge Live"}, "Live") }

    // (date) partition
    let partition;
    if(!previous || (previous.start.Date !== item.start.Date))
    {
        partition = h("h3", {class:"Partition", key:item.id+item.start.Day},
            `${item.start.Day}, ${item.start.Month} ${item.start.Date}` 
        )
    }

    // button
    let buttonText;
    if(item.timeframe == "past"){ buttonText = "Rewatch"; }
    if(item.timeframe == "current" || item.timeframe == "preroll"){ buttonText = "Watch"; }
    if(item.timeframe == "future"){ buttonText = "Preview"; }

    return h("div", {}, 
        partition,
        h("div", { className: `Broadcast ${item.timeframe}`, key: item.id }, [
            h("div", { className: "Time" }, `${item.start.Hours}:${item.start.Minutes} ${item.start.M}`),
            h("div", { className: "Title" }, item.name),
            h("div", { className: "Control" },
                h("button", { onClick: select, disabled: selected }, selected ? "Watching" : buttonText)
            ),
            h("div", { className: "Pointer" }, pointerText)
        ])
    );
};


/** @type {{Days:Boxcast.NamedDay[], Months:Boxcast.NamedMonth[]}} */
const NamedTime =
{
    Days:["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    Months:["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
}

/** @type {(inDate:string)=>Boxcast.Date} */
const DateParse = (inDateString) =>
{
    const date = new Date(inDateString);
    /** @type {Boxcast.Date} */
    const obj = {
        Zone: date.toString().match(/\(([A-Za-z\s].*)\)/),
        Day: NamedTime.Days[date.getDay()],
        Month: NamedTime.Months[date.getMonth()],
        Date: date.getDate(),
        Hours: date.getHours(),
        Minutes: date.getMinutes(),
        Epoch: date.valueOf()
    };

    obj.Zone = obj.Zone ? obj.Zone[1] : "local time";
    obj.M = obj.Hours >= 12 ? "PM" : "AM";
    obj.Hours %= 12;
    if(obj.Hours == 0){ obj.Hours = 12; }
    if(typeof obj.Minutes == "number" && obj.Minutes < 10){ obj.Minutes = "0"+obj.Minutes; }
    return obj;
};

/** @type {(inChannel:string, inSelector:string, inInterval:number, mockURL?:string)=>void} */
export default (inChannel, inSelector, inInterval, mockURL) => 
{
    const root = document.querySelector(inSelector);
    if(root)
    {
        const styles = document.createElement("link");
        styles.setAttribute("rel", "stylesheet");
        styles.setAttribute("type", "text/css");
        styles.setAttribute("href", import.meta.resolve("./styles.css"));
        root.appendChild(styles);
        
        const appRoot = document.createElement("div");
        root.appendChild(appRoot);
        render(h(App, {channel:inChannel, interval:inInterval, mockURL}), appRoot)
    }
    else
    {
        console.warn("root element", inSelector, "not found, cannot build player.");
    }
};