const i18n = window.chuchotageI18n;
i18n.apply();

const state = {
  running: false,
  status: 'Ready',
  volume: 0,
  routeMode: readRouteMode(),
};

const signalThreshold = 0.08;

const elements = {
  status: document.querySelector('#status'),
  startStop: document.querySelector('#startStop'),
  startText: document.querySelector('#startText'),
  buttonRing: document.querySelector('#buttonRing'),
  volumeFill: document.querySelector('#volumeFill'),
  signalStatus: document.querySelector('#signalStatus'),
  signalWaveform: document.querySelector('#signalWaveform'),
  language: document.querySelector('#language'),
  captureDevice: document.querySelector('#captureDevice'),
  playbackDevice: document.querySelector('#playbackDevice'),
  originalSession: document.querySelector('#originalSession'),
  mix: document.querySelector('#mix'),
  mixLabel: document.querySelector('#mixLabel'),
  apiKey: document.querySelector('#apiKey'),
  rememberKey: document.querySelector('#rememberKey'),
  credentialHint: document.querySelector('#credentialHint'),
  routeModes: document.querySelectorAll('input[name="routeMode"]'),
  routeCopy: document.querySelector('#routeCopy'),
  routeSteps: document.querySelector('#routeSteps'),
  routeNote: document.querySelector('#routeNote'),
  routeStatus: document.querySelector('#routeStatus'),
  refresh: document.querySelector('#refresh'),
  message: document.querySelector('#message'),
};

window.chuchotage.onEvent((event, data) => {
  if (event === 'status') {
    state.status = data.status;
    renderState();
  }
  if (event === 'volume') {
    state.volume = Math.max(0, Math.min(1, data.level || 0));
    renderState();
  }
  if (event === 'running') {
    state.running = Boolean(data.running);
    renderState();
  }
  if (event === 'fatalError') {
    showMessage(i18n.backendErrorMessage(data.message || 'Translation stopped unexpectedly.'));
  }
});

elements.startStop.addEventListener('click', async () => {
  if (state.running) {
    await runCommand('stop');
    return;
  }

  const routeError = routeStartError();
  if (routeError) {
    showMessage(routeError);
    elements.playbackDevice.focus();
    updateRouteGuidance();
    return;
  }

  await runCommand('start', {
    targetLanguageCode: elements.language.value,
    captureDeviceId: elements.captureDevice.value,
    playbackDeviceId: elements.playbackDevice.value,
    originalSessionId: elements.originalSession.value,
    apiKey: elements.apiKey.value,
    rememberKey: elements.rememberKey.checked,
    mixPercent: Number(elements.mix.value),
  });
});

document.querySelectorAll('[data-external-link]').forEach((link) => {
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      await window.chuchotage.openExternal(link.href);
    } catch (error) {
      showMessage(error.message || 'Could not open link.');
    }
  });
});

elements.refresh.addEventListener('click', () => loadState());
elements.captureDevice.addEventListener('change', () => {
  syncDeviceSelectionForRouteMode('capture');
  updateRouteGuidance();
  loadSessions(elements.captureDevice.value);
});
elements.playbackDevice.addEventListener('change', () => {
  syncDeviceSelectionForRouteMode('playback');
  updateRouteGuidance();
  loadSessions(elements.captureDevice.value);
});
for (const input of elements.routeModes) {
  input.addEventListener('change', () => {
    if (!input.checked) {
      return;
    }
    state.routeMode = input.value;
    writeRouteMode(input.value);
    syncDeviceSelectionForRouteMode('mode');
    renderRouteMode();
    updateRouteGuidance();
    loadSessions(elements.captureDevice.value);
  });
}
elements.mix.addEventListener('input', () => {
  updateMixLabel();
  window.chuchotage.request('setMix', { mixPercent: Number(elements.mix.value) }).catch(showError);
});

async function loadState() {
  const data = await runCommand('state', { captureDeviceId: elements.captureDevice.value }, { quiet: true });
  if (!data) {
    return;
  }

  fillLanguageSelect(data.languages, data.defaultLanguageCode);
  fillSelect(elements.captureDevice, data.devices, 'id', 'name', data.defaultDeviceId);
  fillSelect(elements.playbackDevice, data.devices, 'id', 'name', data.defaultDeviceId);
  syncDeviceSelectionForRouteMode('load');
  fillSelect(elements.originalSession, data.sessions, 'sessionInstanceId', 'displayName');
  state.running = Boolean(data.running);
  elements.credentialHint.textContent = credentialCopy(data);
  renderRouteMode();
  updateRouteGuidance();
  renderState();
}

async function loadSessions(captureDeviceId) {
  const sessions = await runCommand('sessions', { captureDeviceId }, { quiet: true });
  if (sessions) {
    fillSelect(elements.originalSession, sessions, 'sessionInstanceId', 'displayName');
  }
}

async function runCommand(command, payload = {}, options = {}) {
  try {
    setBusy(true);
    const data = await window.chuchotage.request(command, payload);
    if (!options.quiet) {
      showMessage('');
    }
    return data;
  } catch (error) {
    showError(error);
    return null;
  } finally {
    setBusy(false);
  }
}

function fillLanguageSelect(items, preferredValue) {
  const previous = elements.language.value || preferredValue;
  elements.language.replaceChildren();
  for (const item of items || []) {
    const option = document.createElement('option');
    option.value = item.code || '';
    option.textContent = i18n.languageName(item.code);
    elements.language.appendChild(option);
  }

  if ([...elements.language.options].some((option) => option.value === previous)) {
    elements.language.value = previous;
  }
}

function fillSelect(select, items, valueKey, labelKey, preferredValue) {
  const previous = select.value || preferredValue;
  select.replaceChildren();
  for (const item of items || []) {
    const option = document.createElement('option');
    option.value = item[valueKey] || '';
    option.textContent = optionLabel(item, labelKey);
    select.appendChild(option);
  }

  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function optionLabel(item, labelKey) {
  if (item.isNone) {
    return i18n.t('session.none');
  }
  if (item.processName) {
    return `${item.displayName} (${item.processName})`;
  }
  return item[labelKey] || '';
}

function updateMixLabel() {
  const original = Number(elements.mix.value);
  const translated = 100 - original;
  elements.mixLabel.textContent = i18n.t('mix.label', { translated, original });
}

function renderRouteMode() {
  const content = i18n.routeContent(state.routeMode);
  for (const input of elements.routeModes) {
    input.checked = input.value === state.routeMode;
  }

  elements.routeCopy.textContent = content.copy;
  elements.routeSteps.replaceChildren(
    ...content.steps.map((step) => {
      const item = document.createElement('li');
      item.textContent = step;
      return item;
    }),
  );
  elements.routeNote.textContent = content.note;
}

function updateRouteGuidance() {
  const status = routingStatus();
  elements.routeStatus.textContent = status.text;
  elements.routeStatus.dataset.tone = status.tone;
}

function routingStatus() {
  const deviceCount = elements.captureDevice.options.length;
  const hasCapture = Boolean(elements.captureDevice.value);
  const hasPlayback = Boolean(elements.playbackDevice.value);
  const sameDevice = hasCapture && hasPlayback && elements.captureDevice.value === elements.playbackDevice.value;

  if (!hasCapture || !hasPlayback) {
    return { tone: 'blocked', text: i18n.t('route.status.chooseDevices') };
  }

  if (state.routeMode === 'singleHeadset') {
    return sameDevice
      ? { tone: 'ready', text: i18n.t('route.status.singleReady') }
      : { tone: 'blocked', text: i18n.t('route.status.useOneDevice') };
  }

  if (deviceCount < 2) {
    return { tone: 'blocked', text: i18n.t('route.status.secondDeviceNeeded') };
  }

  if (sameDevice) {
    return { tone: 'blocked', text: i18n.t('route.status.chooseSeparate') };
  }

  if (state.routeMode === 'virtualDevice') {
    return { tone: 'ready', text: i18n.t('route.status.virtualReady') };
  }

  return { tone: 'ready', text: i18n.t('route.status.twoDeviceReady') };
}

function routeStartError() {
  if (!elements.captureDevice.value || !elements.playbackDevice.value) {
    return i18n.t('routeError.chooseDevices');
  }

  if (state.routeMode === 'singleHeadset') {
    return elements.captureDevice.value === elements.playbackDevice.value
      ? ''
      : i18n.t('routeError.singleSame');
  }

  if (elements.captureDevice.value !== elements.playbackDevice.value) {
    return '';
  }

  if (state.routeMode === 'virtualDevice') {
    return i18n.t('routeError.virtualSeparate');
  }

  return i18n.t('routeError.separateNeedsTwo');
}

function syncDeviceSelectionForRouteMode(source) {
  if (!elements.captureDevice.value || !elements.playbackDevice.value) {
    return;
  }

  if (state.routeMode === 'singleHeadset') {
    if (source === 'playback') {
      elements.captureDevice.value = elements.playbackDevice.value;
      return;
    }

    elements.playbackDevice.value = elements.captureDevice.value;
    return;
  }

  if (elements.captureDevice.value !== elements.playbackDevice.value) {
    return;
  }

  const fallback = [...elements.playbackDevice.options].find((option) => option.value !== elements.captureDevice.value);
  if (fallback) {
    elements.playbackDevice.value = fallback.value;
  }
}

function renderState() {
  elements.status.textContent = i18n.statusText(state.status);
  elements.startText.textContent = state.running ? i18n.t('start.stop') : i18n.t('start.start');
  elements.startStop.classList.toggle('running', state.running);
  const visibleVolume = state.running ? state.volume : 0;
  const fillWidth = Math.round(visibleVolume * 100);
  const signalText = signalStatusText(visibleVolume, state.running);
  elements.startStop.style.setProperty('--volume', visibleVolume.toFixed(3));
  elements.buttonRing.style.transform = `scale(${1 + visibleVolume * 0.16})`;
  elements.volumeFill.style.width = `${fillWidth}%`;
  elements.signalStatus.textContent = signalText;
  elements.signalStatus.dataset.tone = visibleVolume >= signalThreshold && state.running ? 'live' : 'muted';
  elements.signalWaveform.setAttribute('aria-label', i18n.t('signal.aria', { status: signalText }));
  renderWaveform(visibleVolume, state.running);
  document.body.dataset.running = state.running ? 'true' : 'false';
}

function signalStatusText(visibleVolume, running) {
  if (!running) {
    return i18n.t('signal.idle');
  }
  return visibleVolume >= signalThreshold ? i18n.t('signal.live') : i18n.t('signal.none');
}

function buildWaveform() {
  elements.signalWaveform.replaceChildren(
    ...Array.from({ length: 33 }, (_, index) => {
      const bar = document.createElement('span');
      bar.style.setProperty('--bar-index', String(index));
      return bar;
    }),
  );
}

function renderWaveform(volume, running) {
  const bars = [...elements.signalWaveform.children];
  const midpoint = (bars.length - 1) / 2;
  const hasSignal = running && volume >= signalThreshold;
  bars.forEach((bar, index) => {
    const distanceFromCenter = Math.abs(index - midpoint) / midpoint;
    const quietShape = 0.08 + (1 - distanceFromCenter) * 0.1;
    const accent = hasSignal && (index % 7 === 0 || index % 11 === 0) ? 0.16 : 0;
    const activeLift = hasSignal ? volume * (0.28 + (1 - distanceFromCenter) * 0.28) : 0;
    const activeShape = 0.18 + (1 - distanceFromCenter) * 0.5 + accent + activeLift;
    const height = Math.max(0.08, Math.min(0.96, hasSignal ? activeShape : quietShape));
    const alpha = hasSignal
      ? Math.max(0.38, Math.min(1, 0.44 + (1 - distanceFromCenter) * 0.38 + volume * 0.24))
      : 0.18;
    bar.style.setProperty('--bar-height', height.toFixed(3));
    bar.style.setProperty('--bar-alpha', alpha.toFixed(3));
  });
}

function setBusy(busy) {
  elements.refresh.disabled = busy;
  elements.startStop.disabled = busy && !state.running;
}

function credentialCopy(data) {
  if (data.hasStoredApiKey) {
    return i18n.t('credential.saved');
  }
  if (data.hasCodexAuth) {
    return i18n.t('credential.codex');
  }
  return i18n.t('credential.enter');
}

function showError(error) {
  showMessage(i18n.backendErrorMessage(error.message || String(error)));
}

function showMessage(message) {
  elements.message.textContent = message || '';
}

function readRouteMode() {
  try {
    const value = localStorage.getItem('chuchotage.routeMode');
    if (value === 'admin') {
      return 'virtualDevice';
    }
    if (value === 'noAdmin') {
      return 'separateDevices';
    }
    if (value === 'singleHeadset' || value === 'separateDevices' || value === 'virtualDevice') {
      return value;
    }
    return 'singleHeadset';
  } catch {
    return 'singleHeadset';
  }
}

function writeRouteMode(value) {
  try {
    localStorage.setItem('chuchotage.routeMode', value);
  } catch {
    // The setting is only a UI preference.
  }
}

updateMixLabel();
renderRouteMode();
buildWaveform();
loadState();
