const podcastData = {
  title: "The Ripple Effect",
  subtitle:
    "A Podcast about the Entangled Work of Pedagogists in Relation with Children, Educators and More-than-human Others",
  publishedAt: "March 17, 2026",
  duration: "25 min 17 sec",
  coverSrc: "./assets/ripple-cover-square.jpg",
  coverPosition: "center",
  audioSrc: "./assets/the-ripple-effect-v4.mp3",
  summary:
    "This is a podcast for educators and leaders who are curious about new ideas shaping early childhood education.",
  description: [
    "In today's episode, we explore the role of the pedagogist — an emerging role in Canada that is reshaping how we think about curriculum, leadership, and pedagogical practice in early learning settings.",
  ],
  hosts: [
    {
      name: "Jane McGhee",
      role: "Facilitator",
    },
    {
      name: "Ilam Muralidharan",
      role: "Contributor",
    },
    {
      name: "Min Jeong Kim",
      role: "Contributor",
    },
    {
      name: "Cindy Ng",
      role: "Contributor",
    },
    {
      name: "Yumeng Sun",
      role: "Contributor",
    },
  ],
  resources: {
    transcript: {
      fileHref: "./assets/the-ripple-effect-transcript.pdf",
    },
    mindmap: {
      fileHref: "./assets/the-ripple-effect-mindmap.jpg",
    },
  },
};

const elements = {
  title: document.getElementById("episode-title"),
  subtitle: document.getElementById("episode-subtitle"),
  publishedAt: document.getElementById("published-at"),
  durationLabel: document.getElementById("duration-label"),
  coverArt: document.getElementById("cover-art"),
  summary: document.getElementById("episode-summary"),
  description: document.getElementById("episode-description"),
  hostsGrid: document.getElementById("hosts-grid"),
  transcriptDownload: document.getElementById("transcript-download"),
  mindmapDownload: document.getElementById("mindmap-download"),
  audio: document.getElementById("audio-element"),
  playToggle: document.getElementById("play-toggle"),
  progressSlider: document.getElementById("progress-slider"),
  volumeToggle: document.getElementById("volume-toggle"),
  volumeSlider: document.getElementById("volume-slider"),
  speedButtons: Array.from(document.querySelectorAll("[data-speed-rate]")),
  currentTime: document.getElementById("current-time"),
  totalTime: document.getElementById("total-time"),
  playerBadge: document.getElementById("player-badge"),
  playerNote: document.getElementById("player-note"),
};

const playbackState = {
  usingPlaceholderAudio: false,
  objectUrl: "",
  previousVolume: 0.85,
  playbackRate: 1,
};

function initialsFromName(name) {
  if (!name) return "P";
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) {
    return "00:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createSilentWavBlob(durationSeconds = 32, sampleRate = 22050) {
  const channelCount = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const frameCount = sampleRate * durationSeconds;
  const dataSize = frameCount * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  return new Blob([buffer], { type: "audio/wav" });
}

function resetPlayerLoadingState() {
  elements.playToggle.disabled = true;
  elements.progressSlider.disabled = true;
  elements.playToggle.textContent = "Play";
  elements.playToggle.setAttribute("aria-label", "Play audio");
  elements.playToggle.setAttribute("aria-pressed", "false");
  elements.progressSlider.value = "0";
  elements.currentTime.textContent = "00:00";
  elements.totalTime.textContent = "00:00";
}

function releasePlaceholderAudio() {
  if (playbackState.objectUrl) {
    URL.revokeObjectURL(playbackState.objectUrl);
    playbackState.objectUrl = "";
  }
}

function usePlaceholderAudio(noteText) {
  releasePlaceholderAudio();
  resetPlayerLoadingState();

  const silentBlob = createSilentWavBlob();
  playbackState.objectUrl = URL.createObjectURL(silentBlob);
  playbackState.usingPlaceholderAudio = true;
  elements.audio.src = playbackState.objectUrl;
  elements.audio.load();
  elements.playerBadge.textContent = "Placeholder Audio";
  elements.playerNote.textContent = noteText;
}

function syncVolumeUi() {
  const volume = Math.round(elements.audio.volume * 100);
  const isMuted = elements.audio.muted || volume === 0;

  elements.volumeSlider.value = String(volume);
  elements.volumeToggle.textContent = isMuted ? "Unmute" : "Mute";
  elements.volumeToggle.setAttribute("aria-pressed", isMuted ? "true" : "false");
  elements.volumeToggle.setAttribute("aria-label", isMuted ? "Unmute audio" : "Mute audio");
}

function applyInitialVolume() {
  elements.audio.volume = playbackState.previousVolume;
  elements.audio.muted = false;
  syncVolumeUi();
}

function syncSpeedUi() {
  const activeRate = String(playbackState.playbackRate);

  elements.speedButtons.forEach((button) => {
    const isActive = button.dataset.speedRate === activeRate;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function applyPlaybackRate(rate) {
  playbackState.playbackRate = rate;
  elements.audio.playbackRate = rate;
  syncSpeedUi();
}

function prepareAudioSource() {
  if (podcastData.audioSrc) {
    releasePlaceholderAudio();
    resetPlayerLoadingState();
    elements.audio.src = podcastData.audioSrc;
    elements.audio.load();
    playbackState.usingPlaceholderAudio = false;
    elements.audio.playbackRate = playbackState.playbackRate;
    elements.playerBadge.textContent = "Episode Audio";
    elements.playerNote.textContent = "The full episode audio is connected and ready to play.";
    return;
  }

  usePlaceholderAudio("No live episode is connected yet. A short silent track is used for preview testing.");
}

function renderHero() {
  elements.title.textContent = podcastData.title;
  elements.subtitle.textContent = podcastData.subtitle;
  elements.publishedAt.textContent = podcastData.publishedAt || "Coming soon";
  elements.durationLabel.textContent = podcastData.duration || "Coming soon";

  if (podcastData.coverSrc) {
    elements.coverArt.classList.add("has-image");
    elements.coverArt.style.backgroundImage = `url("${podcastData.coverSrc}")`;
    elements.coverArt.style.backgroundPosition = podcastData.coverPosition || "center";
    elements.coverArt.setAttribute("aria-label", "Podcast cover");
  }
}

function renderDescription() {
  elements.summary.textContent = podcastData.summary || "Episode summary coming soon.";
  elements.description.innerHTML = "";

  const paragraphs = Array.isArray(podcastData.description) && podcastData.description.length
    ? podcastData.description
    : ["A fuller episode description will appear here once the final copy is ready."];

  paragraphs.forEach((paragraph) => {
    const node = document.createElement("p");
    node.textContent = paragraph;
    elements.description.appendChild(node);
  });
}

function renderHosts() {
  elements.hostsGrid.innerHTML = "";

  const hosts = Array.isArray(podcastData.hosts) && podcastData.hosts.length
    ? podcastData.hosts
    : [
        {
          name: "Coming Soon",
          role: "Host Information",
        },
      ];

  hosts.forEach((host) => {
    const card = document.createElement("article");
    card.className = "host-card";

    const avatar = document.createElement("div");
    avatar.className = "host-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = initialsFromName(host.name);

    const copy = document.createElement("div");
    const name = document.createElement("h4");
    name.className = "host-name";
    name.textContent = host.name;

    const role = document.createElement("p");
    role.className = "host-role";
    role.textContent = host.role || "Role coming soon";

    copy.append(name, role);

    if (host.bio) {
      const bio = document.createElement("p");
      bio.className = "host-bio";
      bio.textContent = host.bio;
      copy.appendChild(bio);
    }

    card.append(avatar, copy);
    elements.hostsGrid.appendChild(card);
  });
}

function setButtonAsDownload(button, href) {
  if (!href) {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    return;
  }

  button.disabled = false;
  button.removeAttribute("aria-disabled");
  button.addEventListener("click", () => {
    window.open(href, "_blank", "noopener");
  });
}

function renderResources() {
  const transcript = podcastData.resources?.transcript || {};
  const mindmap = podcastData.resources?.mindmap || {};

  setButtonAsDownload(elements.transcriptDownload, transcript.fileHref);
  setButtonAsDownload(elements.mindmapDownload, mindmap.fileHref);
}

function syncPlayerUi() {
  const duration = Number.isFinite(elements.audio.duration)
    ? elements.audio.duration
    : 0;
  const currentTime = Number.isFinite(elements.audio.currentTime)
    ? elements.audio.currentTime
    : 0;

  elements.currentTime.textContent = formatTime(currentTime);
  elements.totalTime.textContent = formatTime(duration);
  elements.progressSlider.value = duration
    ? String(Math.round((currentTime / duration) * 100))
    : "0";
}

function togglePlayback() {
  if (elements.audio.paused) {
    elements.audio
      .play()
      .catch(() => {
        elements.playToggle.textContent = "Play";
        elements.playToggle.setAttribute("aria-pressed", "false");
      });
    return;
  }

  elements.audio.pause();
}

function bindPlayerEvents() {
  elements.playToggle.addEventListener("click", togglePlayback);

  elements.audio.addEventListener("loadedmetadata", () => {
    syncPlayerUi();
    elements.playToggle.disabled = false;
    elements.progressSlider.disabled = false;
  });

  elements.audio.addEventListener("error", () => {
    if (!playbackState.usingPlaceholderAudio) {
      usePlaceholderAudio("The live episode could not be loaded, so the player switched to a silent preview track.");
    }
  });

  elements.audio.addEventListener("timeupdate", syncPlayerUi);

  elements.audio.addEventListener("play", () => {
    elements.playToggle.textContent = "Pause";
    elements.playToggle.setAttribute("aria-label", "Pause audio");
    elements.playToggle.setAttribute("aria-pressed", "true");
  });

  elements.audio.addEventListener("pause", () => {
    elements.playToggle.textContent = "Play";
    elements.playToggle.setAttribute("aria-label", "Play audio");
    elements.playToggle.setAttribute("aria-pressed", "false");
  });

  elements.audio.addEventListener("ended", () => {
    elements.audio.currentTime = 0;
    syncPlayerUi();
  });

  elements.progressSlider.addEventListener("input", (event) => {
    const duration = Number.isFinite(elements.audio.duration)
      ? elements.audio.duration
      : 0;

    if (!duration) {
      return;
    }

    const ratio = Number(event.target.value) / 100;
    elements.audio.currentTime = duration * ratio;
    syncPlayerUi();
  });

  elements.speedButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextRate = Number(button.dataset.speedRate);

      if (!Number.isFinite(nextRate)) {
        return;
      }

      applyPlaybackRate(nextRate);
    });
  });

  elements.volumeSlider.addEventListener("input", (event) => {
    const nextVolume = Number(event.target.value) / 100;
    elements.audio.volume = nextVolume;
    elements.audio.muted = nextVolume === 0;

    if (nextVolume > 0) {
      playbackState.previousVolume = nextVolume;
    }

    syncVolumeUi();
  });

  elements.volumeToggle.addEventListener("click", () => {
    if (elements.audio.muted || elements.audio.volume === 0) {
      const restoredVolume = playbackState.previousVolume > 0 ? playbackState.previousVolume : 0.85;
      elements.audio.muted = false;
      elements.audio.volume = restoredVolume;
      syncVolumeUi();
      return;
    }

    playbackState.previousVolume = elements.audio.volume;
    elements.audio.muted = true;
    syncVolumeUi();
  });
}

function init() {
  renderHero();
  renderDescription();
  renderHosts();
  renderResources();
  bindPlayerEvents();
  prepareAudioSource();
  applyInitialVolume();
  applyPlaybackRate(playbackState.playbackRate);
  syncPlayerUi();
}

window.addEventListener("beforeunload", () => {
  releasePlaceholderAudio();
});

init();
