// type KeyArtistTrack = {
//     artist: string,
//     internationalArtist: string,
//     alternativeName?: string[] | null,
//     tracks: Track[]
// }

// type Track = {
//     name: string,
//     internationalName: string,
// }

// type Library = KeyArtistTrack[]

// interface KeyArtistTrack<T> {
//     track: {
//         [data:string]: T[]
//     }
// }

// interface Track {
//     name: string;
//     artist: string;
//     artists?: string[]
//     internationalName?: string;
//     internationalArtist?: string;
//     alternativeName?: string[];
//     alternativeArtist?: string[]
// }

// const library: KeyArtistTrack<Track> = {
//     track: {
//         "容易受傷的女人": [
//             {
//                 name: "容易受傷的女人",
//                 artist: "Faye Wong",
//                 internationalName: "Rong Yi Shou Shang De Nu Ren",
//                 alternativeName: ["Fragile Women"],
//                 alternativeArtist: ["Wang Fei", "王菲"],
//             },
//         ],
//     },
// };

import { DatabaseArtist, DatabaseTrack } from "./types/game.js";

interface ArtistsEntry extends Required<Pick<DatabaseArtist, "internationalArtist">> {
  track: Record<string, TrackInfo>;
}

type TrackInfo = Required<Pick<DatabaseTrack, "internationalName">>;

const library: Record<string, ArtistsEntry> = {
  "Faye Wong": {
    internationalArtist: "Wang Fei",
    track: {
      容易受傷的女人: {
        internationalName: "Rong Yi Shou Shang De Nu Ren",
      },
    },
  },
};
