 console.log("Let's write JavaScript");

let currentSong = new Audio(); // the one audio player for the whole app
let songs = [];                // list of song file names in the current folder
let currFolder;                // current folder, e.g. "songs/cs"

// Convert seconds to mm:ss (and hide NaN)
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

// Load all .mp3 files of a folder and show them in the left playlist
async function getSongs(folder) {
    currFolder = folder;

    // Relative URL, works on Live Server and when hosted
    let a = await fetch(`/${folder}/`);
    let response = await a.text();

    // Put the directory listing in a temporary div so we can read its links
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");

    songs = [];
    for (const element of as) {
        if (element.href.endsWith(".mp3")) {
            // Take only the file name after "/songs/cs/"
            songs.push(element.href.split(`/${folder}/`)[1]);
        }
    }

    // Show the songs in the playlist
    let songUL = document.querySelector(".songlist").getElementsByTagName("ul")[0];
    songUL.innerHTML = "";
    for (const song of songs) {
        // data-track stores the exact file name, so clicking never depends on the text
        songUL.innerHTML += `
        <li data-track="${song}">
            <img class="invert" width="22px" src="music.svg" alt="">
            <div class="info">
                <div>${decodeURI(song)}</div>
                <div>Nitesh</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img src="playsong.svg" alt="">
            </div>
        </li>`;
    }

    // Click on a song to play it
    Array.from(document.querySelector(".songlist").getElementsByTagName("li")).forEach(li => {
        li.addEventListener("click", () => {
            playMusic(li.dataset.track);
        });
    });

    return songs;
}

// Play a track (or just load it if pause = true)
const playMusic = (track, pause = false) => {
    currentSong.src = `/${currFolder}/` + track;

    if (!pause) {
        currentSong.play();
        play.src = "pause.svg";
    } else {
        play.src = "playsong.svg";
    }

    document.querySelector(".songinfo").innerHTML = decodeURI(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
};

// Build the album cards from each folder's info.json
async function displayAlbums() {
    let a = await fetch(`/songs/`);
    let response = await a.text();

    let div = document.createElement("div");
    div.innerHTML = response;
    let anchors = Array.from(div.getElementsByTagName("a"));
    let cardContainer = document.querySelector(".cardContainer");

    // for...of so each fetch finishes before the next one starts
    for (const e of anchors) {
        if (e.href.includes("/songs/") && !e.href.endsWith(".mp3")) {
            // ".../songs/cs/" -> "cs"
            let folder = e.href.split("/").slice(-2)[0];

            try {
                // Album details: {"title": "...", "description": "..."}
                let res = await fetch(`/songs/${folder}/info.json`);
                let info = await res.json();

                cardContainer.innerHTML += `
                <div data-folder="${folder}" class="card">
                    <div class="play">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                            <circle cx="12" cy="12" r="12" fill="#1DB954" />
                            <path d="M9 7.5L17 12L9 16.5V7.5Z" fill="#000" />
                        </svg>
                    </div>
                    <img src="/songs/${folder}/cover.jpg" alt="">
                    <h2>${info.title}</h2>
                    <p>${info.description}</p>
                </div>`;
            } catch (err) {
                // Skip folders that have no info.json
                console.log("Skipping folder without info.json:", folder);
            }
        }
    }

    // Load the album's songs when a card is clicked
    // (done here, after the cards exist)
    Array.from(document.getElementsByClassName("card")).forEach(card => {
        card.addEventListener("click", async item => {
            await getSongs(`songs/${item.currentTarget.dataset.folder}`);
            playMusic(songs[0]);
        });
    });
}

async function main() {
    // Load the default album and show its first song (without playing)
    await getSongs("songs/cs");
    playMusic(songs[0], true);

    // Wait for the cards to appear before moving on
    await displayAlbums();

    // Play / pause button
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "pause.svg";
        } else {
            currentSong.pause();
            play.src = "playsong.svg";
        }
    });

    // Update the time text and move the seekbar circle while playing
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML =
            `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;

        if (!isNaN(currentSong.duration)) {
            let percentage = (currentSong.currentTime / currentSong.duration) * 100;
            document.querySelector(".circle").style.left = percentage + "%";
        }
    });

    // Click on the seekbar to jump to that part of the song
    const seekbar = document.querySelector(".seekbar");
    seekbar.addEventListener("click", e => {
        const rect = seekbar.getBoundingClientRect();
        const percentage = ((e.clientX - rect.left) / rect.width) * 100;
        document.querySelector(".circle").style.left = percentage + "%";
        currentSong.currentTime = (currentSong.duration * percentage) / 100;
    });

    // Open / close the sidebar on mobile
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    // Previous song
    previous.addEventListener("click", () => {
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if (index - 1 >= 0) {
            playMusic(songs[index - 1]);
        }
    });

    // Next song
    next.addEventListener("click", () => {
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if (index + 1 < songs.length) {
            playMusic(songs[index + 1]);
        }
    });

    // Volume slider (the "input" event updates while dragging)
    document.querySelector(".range input").addEventListener("input", e => {
        currentSong.volume = e.target.value / 100;
    });

    // Mute / unmute when the volume icon is clicked
    const volumeIcon = document.querySelector(".volume>img");
    const volumeSlider = document.querySelector(".range input");
    volumeIcon.addEventListener("click", e => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = e.target.src.replace("volume.svg", "mute.svg");
            currentSong.volume = 0;
            volumeSlider.value = 0;
        } else {
            e.target.src = e.target.src.replace("mute.svg", "volume.svg");
            currentSong.volume = 0.1;
            volumeSlider.value = 10;
        }
    });
}

main();