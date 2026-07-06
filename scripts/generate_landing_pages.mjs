import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docsRoot = join(root, "docs");
const version = "20260528b";
const site = "https://www.chuchotage.ai";
const lastmod = "2026-05-27";
const appStoreUrl = "https://apps.apple.com/it/app/chuchotage/id6770434335";
const playStoreUrl = "https://play.google.com/store/apps/details?id=com.andreabertoncini.chuchotage";
const appleSourceUrl = "https://support.apple.com/en-euro/123185";
const googleSourceUrl = "https://support.google.com/translate/answer/6142474?co=GENIE.Platform%3DAndroid&hl=en";

const screenshots = {
  start: {
    src: "../assets/screenshots/chuchotage-start.png",
    alt: "Chuchotage start screen with automatic source language detection and microphone choices.",
    caption: "One control to start live translation.",
  },
  listening: {
    src: "../assets/screenshots/chuchotage-listening.png",
    alt: "Chuchotage listening screen showing automatic source language detection and stop translation control.",
    caption: "Automatic source-language detection while listening.",
  },
  language: {
    src: "../assets/screenshots/chuchotage-language.png",
    alt: "Chuchotage settings screen for choosing the output language.",
    caption: "Choose the language you want to hear.",
  },
  credential: {
    src: "../assets/screenshots/chuchotage-credential.png",
    alt: "Chuchotage credential screen for API key and ChatGPT sign-in options.",
    caption: "Credential setup stays device-local.",
  },
};

const cluster = [
  ["live-speech-translation", "Live speech translation"],
  ["translate-meeting-audio", "Meeting audio translation"],
  ["headphone-translation", "Headphone translation"],
  ["android-device-audio-translation", "Android device audio"],
  ["windows-live-audio-translation", "Windows live audio"],
  ["private-speech-translation", "Private speech translation"],
  ["airpods-live-translation-alternative", "AirPods alternative"],
  ["google-translate-live-translate-alternative", "Google Translate alternative"],
];

const privacyPoints = [
  "No ads and no analytics SDKs in the app.",
  "Credentials and app preferences are stored on the device using the platform secure-storage path.",
  "During normal API-key or ChatGPT use, selected audio and translation settings are sent from the app to OpenAI while translation is active.",
  "Chuchotage does not run a hosted audio relay and does not keep transcript history.",
];

const commonPlatforms = [
  {
    name: "iPhone and iPad",
    body: "Public on the App Store. Current iOS/iPadOS use is microphone-first with translated playback; same-device app audio is not shipped yet.",
  },
  {
    name: "macOS",
    body: "Mac download is listed on the site. The Mac app is built for playback-audio translation with macOS system-audio permission on macOS 14.2+.",
  },
  {
    name: "Android",
    body: "Public on Google Play. The native Android app supports Phone mic, Headset mic, and Device audio on Android 10+ where Android permits playback capture.",
  },
  {
    name: "Windows",
    body: "The Windows companion captures selected Windows playback audio and plays translated audio to a selected output device. A preview Windows zip is available on the download page.",
  },
];

const commonSources = [
  {
    name: "Phone or built-in mic",
    body: "Good for nearby speech, rooms, travel counters, and in-person conversations. Headphones still help keep translated audio out of the mic.",
  },
  {
    name: "Headset or earbud mic",
    body: "Useful in noisy rooms. If a headset mic is selected and unavailable, Chuchotage should fail clearly instead of silently using the wrong mic.",
  },
  {
    name: "Device or app audio",
    body: "Available only where the platform allows it: Android playback capture for eligible apps, Mac playback capture on supported macOS, and Windows playback capture in the companion.",
  },
  {
    name: "Headphones and earbuds",
    body: "Recommended for private listening and feedback reduction. On Windows, separate source and translated playback devices are still the cleanest no-admin setup.",
  },
];

const pages = [
  {
    slug: "live-speech-translation",
    title: "Live Speech Translation App | Chuchotage",
    description: "Chuchotage is a live speech translation app for nearby conversations, real-time speech translation, and speech-to-speech translation in your ear.",
    eyebrow: "Live speech translation app",
    h1: "Live speech translation, in your ear.",
    lede: "Chuchotage listens to nearby speech, detects the source language automatically, and plays translated audio in the language you choose.",
    proof: [
      ["Use case", "Follow a dinner, class, counter, or hallway conversation without stopping everyone to translate each sentence."],
      ["Today", "Public iPhone, iPad, Android, and Mac paths, plus Windows platform work with clear release limits."],
      ["Not for", "Emergencies, legal decisions, medical decisions, or any situation where a certified interpreter is required."],
    ],
    whatTitle: "What it does",
    whatBody: [
      "Use Chuchotage as a personal live speech translator: start a session, choose the language you want to hear, and listen through headphones or the current device output.",
      "The app is built for listen-along moments, not meeting management. It does not ask you to pick the source language, create a transcript archive, or run a hosted Chuchotage audio server.",
    ],
    screenshotIntro: "These are real current app screens: the start control, live listening state, and output-language selection.",
    screenshots: ["start", "listening", "language"],
    platforms: commonPlatforms,
    sources: commonSources,
    limits: [
      "Needs an internet connection during translation.",
      "Live translation can be wrong, delayed, or incomplete.",
      "iOS/iPadOS same-device app audio, including Zoom audio, is not current behavior.",
      "The Windows build is a preview zip, not a Microsoft Store-signed installer yet.",
    ],
  },
  {
    slug: "translate-meeting-audio",
    title: "Translate Meeting Audio Live | Chuchotage",
    description: "Translate meeting audio live with Chuchotage for Zoom calls, webinars, trainings, and nearby meeting speech, with clear platform limits.",
    eyebrow: "Translate meeting audio live",
    h1: "Follow the meeting audio, not the transcript pile.",
    lede: "Chuchotage is for listening to live speech and app audio where the platform allows capture, then hearing the translation privately.",
    proof: [
      ["Use case", "A Zoom call, webinar, training video, or hybrid meeting where you need to follow the language in real time."],
      ["Best fit today", "Mac playback audio where macOS allows it, microphone listening on iPhone and iPad, Android where playback capture is allowed, and Windows paths with release limits."],
      ["Not a bot", "No meeting calendar, no recording archive, no meeting assistant dashboard, and no saved transcript history."],
    ],
    whatTitle: "What it does",
    whatBody: [
      "For meetings in the room, Chuchotage can listen through the microphone and play translated speech back to you.",
      "For meeting audio playing on a device, support depends on the operating system: Mac playback capture, Android Device audio for eligible apps, or the Windows companion's playback-capture path.",
    ],
    screenshotIntro: "The app surface stays small on purpose: one live control, source-language detection, and the output language you want to hear.",
    screenshots: ["listening", "language", "credential"],
    platforms: [
      {
        name: "Mac meetings",
        body: "Designed for Mac playback audio on macOS 14.2+ with the required system-audio permission. Use headphones to avoid feedback.",
      },
      {
        name: "iPhone and iPad",
        body: "Public App Store app. Current iOS/iPadOS behavior is microphone-first; same-device Zoom or app-audio capture is planned separately, not shipped.",
      },
      {
        name: "Android meetings",
        body: "Device audio is implemented for Android 10+ where the source app permits playback capture, and the Android app is public on Google Play.",
      },
      {
        name: "Windows meetings",
        body: "The companion captures selected Windows playback audio for webinars, browsers, and meeting apps. A preview Windows zip is available on the download page.",
      },
    ],
    sources: [
      {
        name: "Room audio",
        body: "Use the phone mic, headset mic, or computer microphone when the meeting sound is physically audible nearby.",
      },
      {
        name: "Zoom and browser audio",
        body: "Use Mac playback capture, Android Device audio when Android exposes that app, or Windows playback capture in the companion.",
      },
      {
        name: "Headphones",
        body: "Strongly recommended. They keep translated audio private and reduce the chance that translated speech feeds back into the source capture.",
      },
      {
        name: "Original audio",
        body: "Desktop routes should keep source capture and translated playback separated when possible. Windows single-headset capture has OS-version constraints.",
      },
    ],
    limits: [
      "No meeting bot, meeting invite, cloud recording, or transcript archive.",
      "iPhone and iPad do not currently translate same-device Zoom audio.",
      "Android only captures app audio that Android and the source app allow.",
      "The Windows build is a preview zip, not a Microsoft Store-signed installer yet.",
    ],
  },
  {
    slug: "headphone-translation",
    title: "Live Translation Through Headphones | Chuchotage",
    description: "Hear live translation in earbuds or headphones with Chuchotage, a headphone translator app for private listen-along translation.",
    eyebrow: "Headphone translator app",
    h1: "Hear live translation through headphones.",
    lede: "Put the translated voice in your ear, keep the room natural, and avoid turning every conversation into a phone-speaker moment.",
    proof: [
      ["Use case", "Conferences, school meetings, family dinners, counters, and travel moments where private audio matters."],
      ["Works with", "Ordinary wired, USB-C, Bluetooth, and AirPods-style headphones as platform routing allows."],
      ["Why it matters", "Headphones reduce echo, keep translated speech private, and make Chuchotage feel like listen-along support."],
    ],
    whatTitle: "What it does",
    whatBody: [
      "Chuchotage can play translated speech through the current device output. Headphones and earbuds are the preferred route because they keep translated audio out of the shared room.",
      "A headset or earbud microphone can also be selected where the platform exposes it. If the selected headset input is unavailable, the app should tell you instead of quietly using a different mic.",
    ],
    screenshotIntro: "The current mobile screens make headphones practical: simple start/stop, microphone selection, and output-language setup.",
    screenshots: ["start", "listening", "language"],
    platforms: commonPlatforms,
    sources: [
      {
        name: "Earbuds or headphones",
        body: "Use them for translated output on mobile and desktop. They are not required for every session, but they are usually the better experience.",
      },
      {
        name: "Headset mic",
        body: "Useful when the room is noisy or the phone is not close to the speaker. Chuchotage should fail clearly if this input is selected but absent.",
      },
      {
        name: "Built-in mic",
        body: "Use it when the phone, tablet, or computer is physically near the speech you want translated.",
      },
      {
        name: "Computer or app audio",
        body: "Use platform-specific playback capture on Mac, Android, or Windows when the source is device audio rather than a person nearby.",
      },
    ],
    limits: [
      "Headphones do not make translation offline or certified.",
      "Using speakers can cause feedback into the microphone.",
      "Some Bluetooth routes expose output but not a usable microphone input.",
      "iOS/iPadOS same-device app audio is not shipped yet.",
    ],
  },
  {
    slug: "android-device-audio-translation",
    title: "Android Device Audio Translation | Chuchotage",
    description: "Translate app audio on Android with Chuchotage Device audio support for Android 10+ playback capture, with practical limits.",
    eyebrow: "Android device audio translation",
    h1: "Translate Android app audio when Android lets you capture it.",
    lede: "Chuchotage's Android path supports Device audio for eligible app playback after the Android capture approval prompt.",
    proof: [
      ["Use case", "Follow a video, webinar, class, social clip, or app audio playing on the same Android phone."],
      ["Requirement", "Android 10 or newer, user approval through MediaProjection, and source audio that allows Android playback capture."],
      ["Status", "Implemented in the native Android app, which is publicly listed on Google Play."],
    ],
    whatTitle: "What it does",
    whatBody: [
      "On Android, Device audio means Chuchotage asks Android for a playback-capture stream, sends the captured audio to Realtime Translation while active, and plays back translated speech.",
      "This is different from microphone listening. It is for audio coming from the phone itself, but Android and the source app decide what can be captured.",
    ],
    screenshotIntro: "The visible app stays the same even when the source changes: start translation, listen, and choose the output language.",
    screenshots: ["start", "listening", "language"],
    platforms: [
      {
        name: "Android 10+",
        body: "Native implementation supports Device audio where Android playback capture is available and the source app permits capture. Install Chuchotage from Google Play.",
      },
      {
        name: "iPhone and iPad",
        body: "Public App Store app is microphone-first today. Same-device app audio requires a separate ReplayKit broadcast feature and is not shipped.",
      },
      {
        name: "macOS",
        body: "Mac playback audio capture is the desktop equivalent where macOS allows it on supported versions.",
      },
      {
        name: "Windows",
        body: "The Windows companion has a playback-audio route, and a preview Windows zip is available on the download page.",
      },
    ],
    sources: [
      {
        name: "Device audio",
        body: "Captures eligible media/app playback through Android's playback-capture path after the system prompt.",
      },
      {
        name: "Phone mic",
        body: "Use this for speech physically around you instead of audio playing inside the phone.",
      },
      {
        name: "Headset mic",
        body: "Use this when listening to people nearby in a noisy room and a headset microphone is available.",
      },
      {
        name: "Headphones",
        body: "Recommended for translated output. They reduce echo and keep translation private.",
      },
    ],
    limits: [
      "Android 9 and older cannot use this Device audio path.",
      "Some apps block playback capture, so their audio will not be available to Chuchotage.",
      "Android does not provide a reliable per-app original-audio suppression path for Chuchotage.",
      "Device audio still depends on Android playback-capture permission and source-app capture support.",
    ],
  },
  {
    slug: "windows-live-audio-translation",
    title: "Windows Live Audio Translator | Chuchotage",
    description: "Translate computer audio live on Windows for webinars, browsers, and meeting audio with the Chuchotage Windows companion, including no-admin routing limits.",
    eyebrow: "Windows live audio translator",
    h1: "Translate computer audio live on Windows.",
    lede: "The Windows companion is built for selected playback audio: webinars, browser audio, meeting sound, and translated output to the device you choose.",
    proof: [
      ["Use case", "A webinar, browser video, Teams-style call, or training audio playing on a Windows PC."],
      ["Architecture", "Electron UI with a .NET bridge for WASAPI loopback capture, Realtime Translation, and selected playback output."],
      ["Status", "Preview Windows zip is available on the download page; it is not Microsoft Store-signed yet."],
    ],
    whatTitle: "What it does",
    whatBody: [
      "The Windows companion captures audio from a selected Windows playback device, converts it to mono PCM16, streams it to OpenAI Realtime Translation, and plays translated audio to a selected output device.",
      "It is intended to run as a normal user app without admin elevation, bundled virtual audio drivers, a Teams integration, or a Chuchotage backend for normal translation.",
    ],
    screenshotIntro: "These current app screens show the shared Chuchotage flow while the Windows companion uses a desktop-specific capture backend.",
    screenshots: ["listening", "language", "credential"],
    platforms: [
      {
        name: "Windows 10/11",
        body: "Companion work targets Windows 10 2004 or newer and Windows 11. Same-device exclusion behavior is best on Windows 10 Build 20348 or newer.",
      },
      {
        name: "macOS",
        body: "Mac app is the closest public desktop path today, with playback-audio capture on supported macOS versions.",
      },
      {
        name: "iPhone and iPad",
        body: "Public App Store app for microphone listen-along, not Windows computer-audio capture.",
      },
      {
        name: "Android",
        body: "Native Android app is public on Google Play and has a Device audio path.",
      },
    ],
    sources: [
      {
        name: "Selected playback device",
        body: "Capture the output where your browser, webinar, meeting app, or media is playing.",
      },
      {
        name: "Translated playback device",
        body: "Choose a separate output device when possible, usually headphones, to avoid translating Chuchotage's own output.",
      },
      {
        name: "Single headset",
        body: "The app can try process-loopback exclusion on supported Windows builds, but separate devices are cleaner when available.",
      },
      {
        name: "Virtual drivers",
        body: "Chuchotage does not install or require virtual audio drivers. Existing admin-approved virtual devices can be used manually.",
      },
    ],
    limits: [
      "Public Windows installer/download is not posted yet.",
      "Process-loopback exclusion requires Windows 10 Build 20348 or newer.",
      "Bluetooth headset routes and meeting apps can behave differently across machines.",
      "No Teams bot, meeting recorder, cloud transcript archive, or admin-only driver install.",
    ],
  },
  {
    slug: "private-speech-translation",
    title: "Private Speech Translation App | Chuchotage",
    description: "Chuchotage is a privacy-forward speech translator app with no ads, no analytics SDKs, local credentials, and no saved transcript history.",
    eyebrow: "Private translation app",
    h1: "A speech translator with no ads and no analytics.",
    lede: "Chuchotage is designed as a personal listening tool: local credentials, no transcript history, and no hosted Chuchotage audio relay.",
    proof: [
      ["Use case", "Private listen-along support for real-life conversations, school meetings, travel, and family moments."],
      ["Privacy shape", "No ads, no analytics SDKs, no transcript history, and no normal-use Chuchotage backend requirement."],
      ["Be precise", "Translation still uses OpenAI while a session is active; it is private-forward, not offline magic."],
    ],
    whatTitle: "What it does",
    whatBody: [
      "Chuchotage helps you hear translated speech without turning the product into an analytics surface, meeting recorder, or transcript archive.",
      "Credentials and preferences stay on your device. During active translation, the chosen audio source and output-language setting are used to create the live translation.",
    ],
    screenshotIntro: "The credential and language screens make the privacy model visible without burying the main translation control.",
    screenshots: ["credential", "start", "language"],
    platforms: commonPlatforms,
    sources: commonSources,
    limits: [
      "Not offline. Chuchotage needs an internet connection for live translation.",
      "OpenAI receives selected audio during active normal translation sessions.",
      "The optional sponsored-trial path can contact a Chuchotage endpoint to mint a short-lived translation token.",
      "Do not rely on live translation for legal, medical, emergency, or other high-stakes decisions.",
    ],
  },
  {
    slug: "airpods-live-translation-alternative",
    title: "AirPods Live Translation Alternative | Chuchotage",
    description: "A factual comparison between Apple AirPods Live Translation and Chuchotage for live translation through headphones across supported platforms.",
    eyebrow: "AirPods Live Translation alternative",
    h1: "When AirPods Live Translation is not your setup.",
    lede: "Apple's feature is real and impressive. Chuchotage is a different path: a cross-platform live translation app focused on simple listening, headphones, and app-audio routes where platforms allow them.",
    proof: [
      ["Apple requirement", "Supported AirPods, iPhone 15 Pro or later, iOS 26 or later, Apple Intelligence, Translate app, latest firmware, and downloaded languages."],
      ["Chuchotage angle", "A separate app for iPhone, iPad, Mac, Android work, and Windows companion work, with clear limits per platform."],
      ["Tone", "This is a comparison for fit, not an attack on Apple's built-in feature."],
    ],
    whatTitle: "What it does",
    whatBody: [
      "Choose Chuchotage if you want a dedicated live speech translation app with ordinary headphone output, simple controls, and desktop/app-audio paths where the operating system allows them.",
      "Choose Apple's AirPods Live Translation when you have the supported Apple hardware/software stack and want Apple's native, on-iPhone processed conversation flow.",
    ],
    screenshotIntro: "Chuchotage is intentionally plain: a start control, automatic source detection, output-language choice, and local credential setup.",
    screenshots: ["start", "language", "credential"],
    platforms: commonPlatforms,
    sources: commonSources,
    comparisonTitle: "Factual Apple comparison",
    comparisonBody: [
      "Apple Support says Live Translation with AirPods works with AirPods 4 with Active Noise Cancellation, AirPods Pro 2 and later, or AirPods Max 2 with latest firmware when paired to an Apple Intelligence-enabled iPhone running iOS 26 or later.",
      "Apple also says you need iPhone 15 Pro or later, Apple's Translate app, and downloaded language models for the language being spoken and the language you want to translate to.",
      "Chuchotage does not claim to be Apple's on-device AirPods feature. It uses its own app flow and OpenAI Realtime Translation while a session is active.",
    ],
    sourceNote: {
      label: "Apple Support",
      url: appleSourceUrl,
      text: "Apple Support: Use Live Translation with your AirPods.",
    },
    limits: [
      "Chuchotage is not offline and does not process translation entirely on iPhone.",
      "iOS/iPadOS same-device app audio is not shipped yet.",
      "Live translation can be inaccurate; important information should be checked.",
      "The public Windows download is a preview zip, not a polished Microsoft Store installer yet.",
    ],
  },
  {
    slug: "google-translate-live-translate-alternative",
    title: "Google Translate Live Translate Alternative | Chuchotage",
    description: "A factual Google Translate Live Translate alternative page positioning Chuchotage as quieter, simpler, privacy-forward, and headset/app-audio oriented.",
    eyebrow: "Google Translate alternative",
    h1: "A quieter alternative to a general translation giant.",
    lede: "Google Translate owns general translation for many people. Chuchotage is narrower: live listening, headphones, simple controls, and privacy-forward product boundaries.",
    proof: [
      ["Google's strength", "General translation, many modes, and a broad Translate app ecosystem."],
      ["Chuchotage fit", "High-intent listen-along use: speech in your ear, source selection, no ads, no analytics SDKs, no transcript history."],
      ["Not a replacement", "Use Google when you need broad text, camera, document, and general translation tools."],
    ],
    whatTitle: "What it does",
    whatBody: [
      "Chuchotage is for the moment when you want to hear live speech translation and keep moving, not manage a large translation toolkit.",
      "The product is intentionally smaller: choose an output language, choose an audio source where the platform supports it, start translation, and stop when done.",
    ],
    screenshotIntro: "The current Chuchotage app screens show that narrower product shape: start, listen, choose output language, and keep credentials local.",
    screenshots: ["start", "listening", "credential"],
    platforms: commonPlatforms,
    sources: commonSources,
    comparisonTitle: "Factual Google comparison",
    comparisonBody: [
      "Google Translate Help describes Live Translate with or without headphones on phones and tablets, with modes such as Listening, Conversation, Text only, and Custom settings.",
      "Google says the headphone Listening mode needs connected headphones and lists countries where Live translate with headphones is available.",
      "Chuchotage's positioning is narrower: a quiet personal translation companion with no ads, no analytics SDKs, and platform-specific audio-source work.",
    ],
    sourceNote: {
      label: "Google Translate Help",
      url: googleSourceUrl,
      text: "Google Translate Help: Hear live speech to speech translations with Live translate.",
    },
    limits: [
      "Chuchotage does not replace Google Translate's camera, text, document, or broad general translation modes.",
      "Chuchotage is not offline.",
      "Chuchotage is narrower than Google Translate and focused on live listen-along translation.",
      "Live translation can be delayed or inaccurate.",
    ],
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paragraphs(items) {
  return items.map((item) => `<p>${escapeHtml(item)}</p>`).join("\n              ");
}

function proofItems(items) {
  return items.map(([label, body]) => `
          <p><span>${escapeHtml(label)}</span>${escapeHtml(body)}</p>`).join("");
}

function matrixRows(items) {
  return items.map((item) => `
              <div class="matrix-row">
                <h3>${escapeHtml(item.name)}</h3>
                <p>${escapeHtml(item.body)}</p>
              </div>`).join("");
}

function sourceCards(items) {
  return items.map((item) => `
              <section class="source-card">
                <h3>${escapeHtml(item.name)}</h3>
                <p>${escapeHtml(item.body)}</p>
              </section>`).join("");
}

function screenshotFigures(page) {
  return page.screenshots.map((key) => {
    const shot = screenshots[key];
    return `
              <figure>
                <img src="${shot.src}" alt="${escapeHtml(shot.alt)}" loading="lazy" width="1080" height="1920">
                <figcaption>${escapeHtml(shot.caption)}</figcaption>
              </figure>`;
  }).join("");
}

function clusterLinks(currentSlug) {
  return cluster
    .filter(([slug]) => slug !== currentSlug)
    .map(([slug, label]) => `<a href="../${slug}/">${escapeHtml(label)}</a>`)
    .join("\n            ");
}

function storeIcon(store) {
  if (store === "play") {
    return `<svg class="store-icon play-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="#00D2FF" d="M3.2 2.1c-.3.3-.5.7-.5 1.2v17.4c0 .5.2.9.5 1.2l.1.1 9.8-9.8v-.2L3.3 2l-.1.1z"></path>
        <path fill="#FFCE00" d="M16.3 15.5l-3.2-3.2v-.2l3.2-3.2.1.1 3.8 2.2c1.1.6 1.1 1.6 0 2.2l-3.8 2.2-.1-.1z"></path>
        <path fill="#FF3A44" d="M16.4 15.4l-3.3-3.3-9.9 9.9c.5.5 1.2.5 2.1 0l11.1-6.6z"></path>
        <path fill="#00F076" d="M16.4 8.8 5.3 2.2c-.9-.5-1.6-.5-2.1 0l9.9 9.9 3.3-3.3z"></path>
      </svg>`;
  }

  return `<svg class="store-icon app-store-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M17.7 13.1c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.4-.8 1.6 0 2.1.8 3.4.8 1.4 0 2.3-1.2 3.2-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.9-4.2zM15.3 5.9c.7-.9 1.2-2.1 1.1-3.3-1 .1-2.2.7-2.9 1.6-.6.8-1.2 2-1.1 3.2 1.1.1 2.2-.6 2.9-1.5z"></path>
      </svg>`;
}

function pageHtml(page) {
  const canonical = `${site}/${page.slug}/`;
  const sourceNote = page.sourceNote
    ? `<p class="source-note">Source: <a href="${page.sourceNote.url}">${escapeHtml(page.sourceNote.text)}</a></p>`
    : "";
  const comparison = page.comparisonTitle
    ? `
      <section class="landing-section landing-section-deep">
        <div class="section-inner comparison-copy">
          <div>
            <p class="eyebrow">Comparison</p>
            <h2>${escapeHtml(page.comparisonTitle)}</h2>
          </div>
          <div>
            ${paragraphs(page.comparisonBody)}
            ${sourceNote}
          </div>
        </div>
      </section>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <meta name="theme-color" content="#02070c">
    <link rel="icon" href="../favicon.svg" type="image/svg+xml">
    <link rel="canonical" href="${canonical}">
    <meta property="og:site_name" content="Chuchotage">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary">
    <link rel="stylesheet" href="../styles.css?v=${version}">
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": ${JSON.stringify(page.title)},
        "description": ${JSON.stringify(page.description)},
        "url": ${JSON.stringify(canonical)},
        "isPartOf": {
          "@type": "WebSite",
          "name": "Chuchotage",
          "url": "https://www.chuchotage.ai/"
        },
        "about": {
          "@type": "SoftwareApplication",
          "name": "Chuchotage",
          "applicationCategory": "UtilitiesApplication",
          "operatingSystem": "iOS, iPadOS, macOS, Android, Windows"
        }
      }
    </script>
  </head>
  <body>
    <header class="site-header">
      <a class="brand-link" href="../" aria-label="Chuchotage home">Chuchotage</a>
      <nav aria-label="Site navigation">
        <a href="../download/">Download</a>
        <a href="../live-speech-translation/">Use cases</a>
        <a href="../privacy/">Privacy</a>
        <a href="mailto:support@chuchotage.ai">Contact</a>
      </nav>
    </header>

    <main>
      <section class="use-case-hero">
        <div class="use-case-hero-copy">
          <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
          <h1>${escapeHtml(page.h1)}</h1>
          <p class="lede">${escapeHtml(page.lede)}</p>
          <div class="hero-actions">
            <a class="primary-link" href="../download/">Download Chuchotage</a>
            <a class="secondary-link" href="#platforms">Supported platforms</a>
          </div>
        </div>
        <div class="hero-proof" aria-label="Page summary">
          ${proofItems(page.proof)}
        </div>
      </section>

      <section class="landing-section landing-section-dark">
        <div class="section-inner landing-intro">
          <div>
            <p class="eyebrow">What it does</p>
            <h2>${escapeHtml(page.whatTitle)}</h2>
          </div>
          <div>
            ${paragraphs(page.whatBody)}
          </div>
        </div>
      </section>

      <section class="landing-section landing-section-surface" aria-label="Product screenshots">
        <div class="section-inner screenshot-wall">
          <div class="screenshot-copy">
            <p class="eyebrow">Screenshots</p>
            <h2>Current app screens, not mockups.</h2>
            <p>${escapeHtml(page.screenshotIntro)}</p>
          </div>
          <div class="screenshot-strip">
            ${screenshotFigures(page)}
          </div>
        </div>
      </section>

      <section class="landing-section landing-section-deep" id="platforms">
        <div class="section-inner platform-matrix">
          <div>
            <p class="eyebrow">Platforms</p>
            <h2>Supported platforms today.</h2>
          </div>
          <div class="matrix-list">
            ${matrixRows(page.platforms)}
          </div>
        </div>
      </section>

      <section class="landing-section landing-section-dark">
        <div class="section-inner source-matrix">
          <div>
            <p class="eyebrow">Audio sources</p>
            <h2>Headphones, mics, and app audio.</h2>
          </div>
          <div class="source-grid">
            ${sourceCards(page.sources)}
          </div>
        </div>
      </section>
      ${comparison}

      <section class="landing-section landing-section-deep">
        <div class="section-inner limits-copy">
          <div>
            <p class="eyebrow">Limits</p>
            <h2>What does not work yet.</h2>
          </div>
          <div class="limits-list">
            ${page.limits.map((item) => `<p>${escapeHtml(item)}</p>`).join("\n            ")}
          </div>
        </div>
      </section>

      <section class="landing-section landing-section-dark">
        <div class="section-inner privacy-copy">
          <div>
            <p class="eyebrow">Privacy shape</p>
            <h2>Personal translation without an ad or analytics layer.</h2>
          </div>
          <div class="privacy-points">
            ${privacyPoints.map((item) => `<p>${escapeHtml(item)}</p>`).join("\n            ")}
          </div>
        </div>
      </section>

      <section class="landing-section landing-section-surface">
        <div class="section-inner">
          <p class="eyebrow">Related pages</p>
          <h2>Pick the route that matches what you need to translate.</h2>
          <div class="cluster-links">
            ${clusterLinks(page.slug)}
          </div>
        </div>
      </section>

      <section class="landing-section landing-cta">
        <div class="section-inner landing-cta-layout">
          <div>
            <p class="eyebrow">Download</p>
            <h2>Get Chuchotage for the platforms available today.</h2>
          </div>
          <a class="primary-link" href="../download/">Download</a>
        </div>
      </section>
    </main>

    <footer>
      <span>Chuchotage</span>
      <a href="../download/">Download</a>
      <a href="../live-speech-translation/">Use cases</a>
      <a href="../privacy/">Privacy policy</a>
      <a class="store-footer-link" href="${appStoreUrl}">${storeIcon("app")}<span>App Store</span></a>
      <a class="store-footer-link" href="${playStoreUrl}">${storeIcon("play")}<span>Google Play</span></a>
    </footer>
  </body>
</html>
`;
}

function sitemapXml() {
  const staticPages = [
    ["", "1.0"],
    ["blog/", "0.7"],
    ["download/", "0.9"],
    ["blog/why-chuchotage/", "0.9"],
    ["privacy/", "0.5"],
  ];
  const landingPages = cluster.map(([slug]) => [`${slug}/`, "0.8"]);
  const urls = [...staticPages, ...landingPages]
    .map(([path, priority]) => `  <url>
    <loc>${site}/${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

for (const page of pages) {
  const file = join(docsRoot, page.slug, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, pageHtml(page));
}

writeFileSync(join(docsRoot, "sitemap.xml"), sitemapXml());
