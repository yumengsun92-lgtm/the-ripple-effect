const podcastData = {
  title: "在慢一点的节奏里，重新听见生活的重点",
  subtitle:
    "这一页是单集 podcast 的网页预览，用来模拟未来真实内容上线后的阅读和收听体验。",
  publishedAt: "2026年03月16日",
  duration: "25 分钟 15 秒",
  coverSrc: "",
  audioSrc: "./assets/the-ripple-effect.mp3",
  summary:
    "这一集先用占位内容演示页面结构：上方是大封面和播放器，中段是节目简介，下方是 host 与参考资料。整体采用更大的字号、清晰按钮和宽松留白，让长时间阅读与点击都更轻松。",
  description: [
    "页面布局参考了 iPhone Podcasts 的信息层级，但把播放器做得更像音乐播放器，让封面、播放按钮和进度条成为视觉中心。手机端是单栏滚动，桌面端会把播放器固定在左侧，方便一边阅读一边收听。",
    "为了适配老年用户，正文与按钮都保持偏大的尺寸，颜色对比更明显，交互控件也留出了更充足的点击面积。后续你提供真实的封面、音频、简介、host 资料、transcript 和 mindmap 后，只需要替换这份数据对象即可。",
  ],
  hosts: [
    {
      name: "Sherry",
      role: "节目策划 / 主持人",
      bio: "关注内容结构、叙事节奏和信息整理，负责把每期主题拆解为更容易理解、也更适合长期收听的表达方式。",
    },
    {
      name: "Guest Host",
      role: "研究支持 / 共创嘉宾",
      bio: "负责补充背景资料、案例与参考路径，让节目在轻松收听之外，也保留继续深入阅读和回看的入口。",
    },
  ],
  resources: {
    transcript: {
      previewText:
        "Transcript 预览：欢迎来到本期节目。今天我们会用一个网页原型，测试大字号、清晰播放器和参考资料区如何协同工作。后续这里可以替换为真实的逐字稿节选。",
      fileHref: "",
    },
    mindmap: {
      previewImage: "",
      fileHref: "",
    },
    links: [
      {
        label: "Apple Podcasts 设计参考",
        href: "https://www.apple.com/apple-podcasts/",
      },
      {
        label: "播客节目结构与长文内容整理示例",
        href: "https://www.nngroup.com/articles/senior-citizens-on-the-web/",
      },
      {
        label: "老年用户网页可读性研究参考",
        href: "https://www.w3.org/WAI/older-users/",
      },
    ],
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
  transcriptPreview: document.getElementById("transcript-preview"),
  transcriptDownload: document.getElementById("transcript-download"),
  transcriptStatus: document.getElementById("transcript-status"),
  mindmapPreview: document.getElementById("mindmap-preview"),
  mindmapDownload: document.getElementById("mindmap-download"),
  mindmapStatus: document.getElementById("mindmap-status"),
  linksList: document.getElementById("links-list"),
  audio: document.getElementById("audio-element"),
  playToggle: document.getElementById("play-toggle"),
  progressSlider: document.getElementById("progress-slider"),
  currentTime: document.getElementById("current-time"),
  totalTime: document.getElementById("total-time"),
  playerBadge: document.getElementById("player-badge"),
  playerNote: document.getElementById("player-note"),
};

const playbackState = {
  usingPlaceholderAudio: false,
  objectUrl: "",
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
  elements.playToggle.textContent = "播放";
  elements.playToggle.setAttribute("aria-label", "播放音频");
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
  elements.playerBadge.textContent = "占位音频";
  elements.playerNote.textContent = noteText;
}

function prepareAudioSource() {
  if (podcastData.audioSrc) {
    releasePlaceholderAudio();
    resetPlayerLoadingState();
    elements.audio.src = podcastData.audioSrc;
    elements.audio.load();
    playbackState.usingPlaceholderAudio = false;
    elements.playerBadge.textContent = "真实音频";
    elements.playerNote.textContent = "当前已接入节目音频，可直接播放并拖动进度。";
    return;
  }

  usePlaceholderAudio("暂无真实音频文件，当前使用 32 秒静音示意轨道测试播放器交互。");
}

function renderHero() {
  elements.title.textContent = podcastData.title;
  elements.subtitle.textContent = podcastData.subtitle;
  elements.publishedAt.textContent = podcastData.publishedAt || "待补充";
  elements.durationLabel.textContent = podcastData.duration || "待补充";

  if (podcastData.coverSrc) {
    elements.coverArt.classList.add("has-image");
    elements.coverArt.style.backgroundImage = `url("${podcastData.coverSrc}")`;
    elements.coverArt.setAttribute("aria-label", "Podcast 封面");
  }
}

function renderDescription() {
  elements.summary.textContent = podcastData.summary || "节目摘要待补充。";
  elements.description.innerHTML = "";

  const paragraphs = Array.isArray(podcastData.description) && podcastData.description.length
    ? podcastData.description
    : ["完整节目介绍待补充，后续可以把本集内容、适合谁收听、关键亮点等信息放在这里。"];

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
          name: "待补充",
          role: "Host 信息",
          bio: "主持人介绍尚未提供，后续可在这里放入姓名、身份和简介。",
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
    role.textContent = host.role || "身份待补充";

    const bio = document.createElement("p");
    bio.className = "host-bio";
    bio.textContent = host.bio || "介绍待补充";

    copy.append(name, role, bio);
    card.append(avatar, copy);
    elements.hostsGrid.appendChild(card);
  });
}

function setButtonAsDownload(button, href, fallbackText) {
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

  if (fallbackText) {
    button.dataset.ready = fallbackText;
  }
}

function renderResources() {
  const transcript = podcastData.resources?.transcript || {};
  const mindmap = podcastData.resources?.mindmap || {};
  const links = podcastData.resources?.links || [];

  elements.transcriptPreview.textContent =
    transcript.previewText || "Transcript 待补充，后续会在这里显示逐字稿节选。";
  elements.transcriptStatus.textContent = transcript.fileHref
    ? "真实 transcript 文件已准备，可点击下载。"
    : "Transcript 文件暂未上传，当前仅展示预览文案。";

  setButtonAsDownload(elements.transcriptDownload, transcript.fileHref);

  if (mindmap.previewImage) {
    elements.mindmapPreview.classList.add("has-image");
    elements.mindmapPreview.style.backgroundImage = `url("${mindmap.previewImage}")`;
  }

  elements.mindmapStatus.textContent = mindmap.fileHref
    ? "Mindmap 文件已接入，可下载查看完整结构。"
    : "Mindmap 资源待补充，当前显示的是占位预览。";

  setButtonAsDownload(elements.mindmapDownload, mindmap.fileHref);

  elements.linksList.innerHTML = "";
  if (!links.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "links-list__placeholder";
    emptyItem.textContent = "参考链接待补充。";
    elements.linksList.appendChild(emptyItem);
    return;
  }

  links.forEach((item) => {
    const listItem = document.createElement("li");
    const anchor = document.createElement("a");
    anchor.href = item.href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = item.label;
    listItem.appendChild(anchor);
    elements.linksList.appendChild(listItem);
  });
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
        elements.playToggle.textContent = "播放";
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
      usePlaceholderAudio("真实音频暂时无法加载，已切换到占位音频便于继续预览页面。");
    }
  });

  elements.audio.addEventListener("timeupdate", syncPlayerUi);

  elements.audio.addEventListener("play", () => {
    elements.playToggle.textContent = "暂停";
    elements.playToggle.setAttribute("aria-label", "暂停音频");
    elements.playToggle.setAttribute("aria-pressed", "true");
  });

  elements.audio.addEventListener("pause", () => {
    elements.playToggle.textContent = "播放";
    elements.playToggle.setAttribute("aria-label", "播放音频");
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
}

function init() {
  renderHero();
  renderDescription();
  renderHosts();
  renderResources();
  bindPlayerEvents();
  prepareAudioSource();
  syncPlayerUi();
}

window.addEventListener("beforeunload", () => {
  releasePlaceholderAudio();
});

init();
