import 'https://js.boxcast.com/v3.min.js';
import { html } from "https://esm.sh/htm@3.1.1/react";
import styled from 'https://esm.sh/styled-components@5.3.10?deps=react@18.2.0';
import { createElement as h, useState, useEffect, useRef } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";

const StyledRoot = styled.div`
.Boxcast-Upper
{
    background: white;
    box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.1);

    .Boxcast-Player
    {
        .boxcast-well-container
        {
            display: none;
        }
        .boxcast-well
        {
            display:flex;
            justify-content: center;
            align-items: center;
            gap: 10px 10px;
            min-height: 10px;
            margin: 0;

            & > span, .boxcast-linkback
            {
                display:none;
            }

            & > *
            {
                margin: 0;
            }
        }
    }
    .Boxcast-Active
    {
        text-align: center;
        padding:20px;
        background: white;
        & > * { margin: 0; }
    }
}

.Boxcast-Playlist
{
    max-width: 550px;
    margin: 30px auto;

    .Partition
    {
        margin: 30px 0 0 0;
        padding: 0 0 8px 0;
        border-bottom: 1px solid #dddddd;
        text-align: center;
    }
    .Broadcast
    {
        position: relative;
        display: flex;
        padding: 5px 0 5px 0;

        & > *
        {
            box-sizing: border-box;
            padding: 5px;
        }

        .Pointer
        {
            width: 75px;
            text-align: right;
            .Badge
            {
                display: inline-block;
                border-radius: 20px;
                padding: 2px 8px;
                font-size: 12px;
                font-weight: 900;
                font-family: sans-serif;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                text-align: center;

                &.Next
                {
                    background: yellow;
                    color: black;
                }
                &.Soon
                {
                    background: orange;
                    color: white;
                }
                &.Live
                {
                    background: red;
                    color: white;
                }
            }
        }
        .Time
        {
            width: 80px;
            font-size: 16px;
            text-align: right;
        }
        .Title
        {
            flex: 1;
            font-weight: 900;
        }
        .Control
        {
            width: 100px;

        }

        button
        {
            position: relative;
            appearance: none;
            display: block;
            width: 100%;
            max-width:150px;
            padding: 5px 10px 5px 10px;
            background: #0e2a3f;
            cursor: pointer;
            border: none;
            color: white;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.4s;
        }
        button:hover
        {
            border-radius: 50px;
        }
        button[disabled]
        {
            border-radius: 50px;
            background: red !important;
        }

        &.future button
        {
            background: #c3b7a9;
        }

        @media(max-width:500px)
        {
            flex-wrap: wrap;
            .Time
            {
                order: 0;
                width: 30%;
            }
            .Title
            {
                order: 1;
                flex: none;
                width: 60%;
            }
            .Pointer
            {
                order: 2;
                width: 30%;
            }
            .Control
            {
                order: 3;
                width: 60%;
            }
        }
    }
}

.Boxcast-Alert
{
    position: fixed;
    right: 20px;
    bottom: -300px;
    width: 300px;
    padding: 20px 0 40px 0;
    background: #333;
    border-radius: 5px;
    transition: bottom 0.4s;
    color: #fff;
    text-align: center;

    &.Show
    {
        bottom: 20px;
    }

    button
    {
        padding: 5px 15px;
        border: none;
        background: white;
        cursor: pointer;
        font-weight: 900;
    }

    .Close
    {
        display: inline-block;
        position: absolute;
        padding: 5px 10px 5px 10px;
        border-radius: 20px;
        border: 3px solid white;
        top: -20px;
        right: 10px;
        background: #000000;
        cursor: pointer;
        color: #fff;
    }
}
`;

/** @type {(props:{channel:string, interval:number, mock?:string})=>any} */
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

    // on mount
    useEffect(()=>
    {
        Player.current = boxcast(`#${PlayerID}`);

        /** @type {()=>Promise<void>} */
        const Ping = async () =>
        {
            const response = await fetch(props.mock ? props.mock : `https://rest.boxcast.com/channels/${props.channel}/broadcasts?l=50`);
            /** @type {Array<Boxcast.BroadcastRaw>} */
            const json = await response.json();
            ListSet(SortStart(json));
        };

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
            console.log(ListGet[i].name, ListGet[i].timeframe);
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
        const settings = {
            selectedBroadcastId: SelectedGet,
            showTitle: true,
            showDescription: true,
            showCountdown: true,
            showRelated: false,
            autoplay: true,
            defaultVideo: "next"
        };

        Player.current?.loadChannel(props.channel, settings);
        if(UserClickGet)
        {
            setTimeout(()=>ScrollToRef.current?.scrollIntoView({ behavior: "smooth" }), 500);
            UserClickSet(false);
        }
    }
    , [SelectedGet]);


    /** @type {(inItem:Boxcast.Broadcast)=>void} */
    const SelectionTransition = (inItem) => 
    {
        SelectedSet(inItem.id);
        UserClickSet(true);
    };

    return html`
    <${StyledRoot}>
        <div class="Boxcast-Upper" ref=${ScrollToRef}>
            <div class="Boxcast-Player" id=${PlayerID}></div>
            <div class="Boxcast-Active">
                <h2>${ ListGet.filter( item=>item.id == SelectedGet )[0]?.name }</h2>
            </div>
        </div>
        <div class="Boxcast-Playlist">
        ${
            ListGet.map( (item, index) =>
            {
                return h(BroadcastItem,
                {
                    item: item,
                    previous: ListGet[index-1],
                    priority: item.id == LeadingGet?.id,
                    selected: item.id == SelectedGet,
                    select: () => SelectionTransition(item)
                });
            })
        }
        </div>
        <div class=${`Boxcast-Alert ${ AlertGet ? " Show" : null }`}>
            <span class="Close" onClick=${()=>{ AlertSet(false); }}>Dismiss ×</span>
            <h4>A new session is starting:</h4>
            <p>${LeadingGet?.name}</p>
            <button onClick=${()=>{ LeadingGet&&SelectionTransition(LeadingGet); AlertSet(false); }}>Watch Now</button>
        </div>
    <//>
    `;
}

/** @type {(props:{item:Boxcast.Broadcast, previous: false | Boxcast.Broadcast,  priority:boolean, selected:boolean, select:()=>void})=>any} */
const BroadcastItem = ({item, previous, priority, selected, select}) =>
{
    // pointer
    let pointerText;
    if (priority){ pointerText = html`<div class="Badge Next">Next</div>`; }
    if(item.timeframe == "preroll"){ pointerText = html`<div class="Badge Soon">Soon</div>`; }
    if(item.timeframe == "current"){ pointerText = html`<div class="Badge Live">Live</div>`; }

    // (date) partition
    let partition;
    if(!previous || (previous.start.Date !== item.start.Date))
    {
        partition = html`<h3 class="Partition" key=${item.id+item.start.Day} >
            ${item.start.Day}, ${item.start.Month} ${item.start.Date}
        </h3>`;
    }

    // button
    let buttonText;
    if(item.timeframe == "past"){ buttonText = "Rewatch"; }
    if(item.timeframe == "current" || item.timeframe == "preroll"){ buttonText = "Watch"; }
    if(item.timeframe == "future"){ buttonText = "Preview"; }

    return html`
    ${ partition }
    <div class=${`Broadcast ${item.timeframe}`} key=${item.id}>
        <div class="Time">${item.start.Hours}:${item.start.Minutes} ${item.start.M}</div>
        <div class="Title">${item.name}</strong>
        <div class="Control">
            <button onClick=${select} disabled=${selected}>${buttonText}</button>
        </div>
        <div class="Pointer">${ pointerText }</div>
    </div>`;
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

/** @type {(inChannel:string, inSelector:string, inInterval:number, mock?:string)=>void} */
export default (inChannel, inSelector, inInterval, mock) => 
{
    const root = document.querySelector(inSelector);
    root ? createRoot(root).render(h(App, {channel:inChannel, interval:inInterval, mock})) : console.log(inSelector, "not found in dom");
};