declare namespace Boxcast
{
    type NamedDay = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
    type NamedMonth = "January" | "February" | "March" | "April" | "May" | "June" | "July" | "August" | "September" | "October" | "November" | "December"
    type Meridian = "AM" | "PM";
    type Date = {
        Zone: RegExpMatchArray | null | string,
        Day: NamedDay
        Month: NamedMonth,
        Date: number,
        Hours: number,
        Minutes: number | string,
        M?: Meridian,
        Epoch: number
    };

    type BroadcastRaw = {
        id: string,
        name: string,
        timeframe: "future" | "current" | "preroll" | "past",
        starts_at: string,
        stops_at: string,
        start:Date
    };

    type Broadcast = BroadcastRaw&{start:Date};

    type PlayerConstructor =  (inID:string)=> Player;
    type PlayerHandler = (state:string, details:Record<string, string>)=>void
    type Player = {loadChannel:(inID:string, inSettings:Record<string, string|boolean|number|null|PlayerHandler>)=>void}
}

declare const boxcast:Boxcast.PlayerConstructor;