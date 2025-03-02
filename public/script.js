const wrapper = document.querySelector(".at-wrap");
const main = wrapper.querySelector(".at-main");

function getFileFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('file');
}

const settings = {
  file: getFileFromUrl() || "https://www.alphatab.net/files/canon.gp",
  player: {
    enablePlayer: true,
    soundFont: "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2",
    scrollElement: wrapper.querySelector('.at-viewport'),
    enableCursor: true,
    enableUserInteraction: true,
    scrollMode: 'continuous',
    scrollSpeed: 'auto',
    scrollOffsetX: 0,
    scrollOffsetY: -30,
    scrollAnimationDuration: 300
  },
  display: {
    layoutMode: 'page',
    staveProfile: 'default',
    stretchForce: 0.8
  }
};document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('keydown', function(event) {
      if (event.keyCode === 32 || event.key === ' ') {
          const activeElement = document.activeElement;
          const isInput = activeElement.tagName === 'INPUT' || 
                         activeElement.tagName === 'TEXTAREA' || 
                         activeElement.isContentEditable;
          
          if (!isInput) {
              event.preventDefault();
              
              const playPauseButton = document.querySelector('.at-controls .at-player-play-pause');
              if (playPauseButton && !playPauseButton.classList.contains('disabled')) {
                  playPauseButton.click();
                  
                  addKeyPressEffect(playPauseButton);
              }
          }
      }
  });
  
  function addKeyPressEffect(element) {
      element.classList.add('keyboard-activated');
      
      setTimeout(() => {
          element.classList.remove('keyboard-activated');
      }, 200);
  }
  
  const style = document.createElement('style');
  style.textContent = `
      .keyboard-activated {
          animation: buttonPulse 0.2s ease;
      }
      
      @keyframes buttonPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); background-color: var(--primary-color); }
          100% { transform: scale(1); }
      }
      
      /* Add keyboard shortcut hint to play/pause button */
      .at-controls .at-player-play-pause::after {
          content: '[Space]';
          position: absolute;
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          background-color: rgba(0, 0, 0, 0.5);
          padding: 2px 4px;
          border-radius: 3px;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
      }
      
      .at-controls:hover .at-player-play-pause::after {
          opacity: 0.7;
      }
  `;
  document.head.appendChild(style);
  
  function showSpacebarHint() {
      const playPauseButton = document.querySelector('.at-controls .at-player-play-pause');
      if (playPauseButton && !playPauseButton.classList.contains('disabled')) {
          const hint = document.createElement('div');
          hint.className = 'spacebar-hint';
          hint.innerHTML = 'Tip: Press <kbd>Space</kbd> to play/pause';
          document.body.appendChild(hint);
          
          setTimeout(() => {
              hint.classList.add('hiding');
              setTimeout(() => {
                  hint.remove();
              }, 500);
          }, 5000);
          
          const hintStyle = document.createElement('style');
          hintStyle.textContent = `
              .spacebar-hint {
                  position: fixed;
                  bottom: 60px;
                  left: 50%;
                  transform: translateX(-50%);
                  background-color: var(--dark-bg);
                  color: white;
                  padding: 8px 12px;
                  border-radius: var(--border-radius);
                  font-size: 13px;
                  z-index: 1000;
                  box-shadow: var(--shadow);
                  animation: fadeIn 0.3s ease;
                  pointer-events: none;
              }
              
              .spacebar-hint kbd {
                  background-color: rgba(255, 255, 255, 0.2);
                  border-radius: 3px;
                  padding: 1px 5px;
                  font-family: monospace;
              }
              
              .spacebar-hint.hiding {
                  animation: fadeOut 0.5s ease;
              }
              
              @keyframes fadeIn {
                  from { opacity: 0; transform: translate(-50%, 10px); }
                  to { opacity: 1; transform: translate(-50%, 0); }
              }
              
              @keyframes fadeOut {
                  from { opacity: 1; transform: translate(-50%, 0); }
                  to { opacity: 0; transform: translate(-50%, 10px); }
              }
          `;
          document.head.appendChild(hintStyle);
      }
  }
  
  const playerReadyCheck = setInterval(() => {
      const playPauseButton = document.querySelector('.at-controls .at-player-play-pause');
      if (playPauseButton && !playPauseButton.classList.contains('disabled')) {
          clearInterval(playerReadyCheck);
          showSpacebarHint();
      }
  }, 500);
});

const api = new alphaTab.AlphaTabApi(main, settings);
const trackVolumes = new Map();

const overlay = wrapper.querySelector(".at-overlay");
api.renderStarted.on(() => {
  overlay.style.display = "flex";
});
api.renderFinished.on(() => {
  overlay.style.display = "none";
});

const viewportElement = wrapper.querySelector('.at-viewport');
let userScrolling = false;
let scrollingTimeout;

viewportElement.addEventListener('scroll', () => {
  userScrolling = true;
  clearTimeout(scrollingTimeout);
  
  scrollingTimeout = setTimeout(() => {
    userScrolling = false;
  }, 2000);
});

document.addEventListener('DOMContentLoaded', function() {
  const fileParam = getFileFromUrl();
  if (fileParam) {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('file');
    history.replaceState({}, document.title, newUrl.toString());
  }
});

function createVolumeControl(options) {
  const { initialValue = 100, onChange, containerClass, sliderClass, valueClass } = options;
  
  const container = document.createElement('div');
  container.className = containerClass;
  
  const icon = document.createElement('i');
  icon.className = initialValue === 0 ? 'fas fa-volume-mute' : 
                  initialValue < 50 ? 'fas fa-volume-down' : 'fas fa-volume-up';
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = 100;
  slider.value = initialValue;
  slider.className = sliderClass;
  
  let valueDisplay = null;
  if (valueClass) {
    valueDisplay = document.createElement('span');
    valueDisplay.className = valueClass;
    valueDisplay.textContent = `${initialValue}%`;
  }
  
  slider.oninput = (e) => {
    e.stopPropagation();
    const volume = parseInt(e.target.value) / 100;
    
    if (volume === 0) {
      icon.className = 'fas fa-volume-mute';
      icon.parentElement?.classList.add('muted');
    } else if (volume < 0.5) {
      icon.className = 'fas fa-volume-down';
      icon.parentElement?.classList.remove('muted');
    } else {
      icon.className = 'fas fa-volume-up';
      icon.parentElement?.classList.remove('muted');
    }
    
    if (valueDisplay) {
      valueDisplay.textContent = `${e.target.value}%`;
    }
    
    if (onChange) onChange(volume);
  };
  
  icon.onclick = (e) => {
    e.stopPropagation();
    const isMuted = icon.className.includes('fa-volume-mute');
    
    if (isMuted) {
      const prevVolume = parseFloat(slider.dataset.prevVolume) || 0.5;
      slider.value = prevVolume * 100;
      icon.className = prevVolume < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';
      icon.parentElement?.classList.remove('muted');
      
      if (valueDisplay) {
        valueDisplay.textContent = `${slider.value}%`;
      }
      
      if (onChange) onChange(prevVolume);
    } else {
      slider.dataset.prevVolume = parseFloat(slider.value) / 100;
      
      slider.value = 0;
      icon.className = 'fas fa-volume-mute';
      icon.parentElement?.classList.add('muted');
      
      if (valueDisplay) {
        valueDisplay.textContent = '0%';
      }
      
      if (onChange) onChange(0);
    }
  };
  
  container.appendChild(icon);
  container.appendChild(slider);
  if (valueDisplay) {
    container.appendChild(valueDisplay);
  }
  
  return { container, slider, icon };
}

function createTrackItem(track) {
  const trackItem = document
    .querySelector("#at-track-template")
    .content.cloneNode(true).firstElementChild;
  
  trackItem.querySelector(".at-track-name").innerText = track.name;
  trackItem.track = track;
  
  const volumeControl = document.createElement('div');
  volumeControl.classList.add('at-track-volume');
  
  if (!trackVolumes.has(track.index)) {
    trackVolumes.set(track.index, 1.0);
  }
  
  const { container, slider, icon } = createVolumeControl({
    initialValue: trackVolumes.get(track.index) * 100,
    onChange: (volume) => {
      trackVolumes.set(track.index, volume);
      api.changeTrackVolume([track], volume);
    },
    containerClass: 'at-track-volume',
    sliderClass: 'at-track-volume-slider'
  });
  
  trackItem.onclick = (e) => {
    if (e.target === trackItem || e.target.classList.contains('at-track-details') || 
        e.target.classList.contains('at-track-name') || e.target.classList.contains('at-track-icon')) {
      api.renderTracks([track]);
    }
  };
  
  trackItem.querySelector(".at-track-details").appendChild(container);
  
  return trackItem;
}

const trackList = wrapper.querySelector(".at-track-list");
api.scoreLoaded.on((score) => {
  trackList.innerHTML = "";
  score.tracks.forEach((track) => {
    trackList.appendChild(createTrackItem(track));
  });
});

api.renderStarted.on(() => {
  const tracks = new Map();
  api.tracks.forEach((t) => {
    tracks.set(t.index, t);
  });
  
  const trackItems = trackList.querySelectorAll(".at-track");
  trackItems.forEach((trackItem) => {
    if (tracks.has(trackItem.track.index)) {
      trackItem.classList.add("active");
    } else {
      trackItem.classList.remove("active");
    }
  });
});

api.scoreLoaded.on((score) => {
  wrapper.querySelector(".at-song-title").innerText = score.title;
  wrapper.querySelector(".at-song-artist").innerText = score.artist;
});

function setupToggleControl(selector, property, initialValue = 0) {
  const element = wrapper.querySelector(selector);
  
  if (initialValue > 0) {
    element.classList.add('active');
    api[property] = initialValue;
  }
  
  element.onclick = () => {
    element.classList.toggle("active");
    api[property] = element.classList.contains("active") ? 1 : 0;
  };
  
  return element;
}

const countIn = setupToggleControl('.at-controls .at-count-in', 'countInVolume');
const metronome = setupToggleControl('.at-controls .at-metronome', 'metronomeVolume');
const loop = setupToggleControl('.at-controls .at-loop', 'isLooping');

wrapper.querySelector(".at-controls .at-print").onclick = () => {
  api.print();
};

const zoom = wrapper.querySelector(".at-controls .at-zoom select");
zoom.onchange = () => {
  const zoomLevel = parseInt(zoom.value) / 100;
  api.settings.display.scale = zoomLevel;
  api.updateSettings();
  api.render();
};

const layout = wrapper.querySelector(".at-controls .at-layout select");
layout.onchange = () => {
  api.settings.display.layoutMode = layout.value === "horizontal" ? 
    alphaTab.LayoutMode.Horizontal : alphaTab.LayoutMode.Page;
  api.updateSettings();
  api.render();
};

const playerIndicator = wrapper.querySelector(".at-controls .at-player-progress");
api.soundFontLoad.on((e) => {
  const percentage = Math.floor((e.loaded / e.total) * 100);
  playerIndicator.innerText = percentage + "%";
});
api.playerReady.on(() => {
  playerIndicator.style.display = "none";
});

const playPause = wrapper.querySelector(".at-controls .at-player-play-pause");
const stop = wrapper.querySelector(".at-controls .at-player-stop");

playPause.onclick = (e) => {
  if (!e.currentTarget.classList.contains("disabled")) {
    api.playPause();
  }
};

stop.onclick = (e) => {
  if (!e.currentTarget.classList.contains("disabled")) {
    api.stop();
  }
};

api.playerReady.on(() => {
  playPause.classList.remove("disabled");
  stop.classList.remove("disabled");
});

api.playerStateChanged.on((e) => {
  const icon = playPause.querySelector("i.fas");
  if (e.state === alphaTab.synth.PlayerState.Playing) {
    icon.classList.remove("fa-play");
    icon.classList.add("fa-pause");
  } else {
    icon.classList.remove("fa-pause");
    icon.classList.add("fa-play");
  }
});

function formatDuration(milliseconds) {
  let seconds = milliseconds / 1000;
  const minutes = (seconds / 60) | 0;
  seconds = (seconds - minutes * 60) | 0;
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

const songPosition = wrapper.querySelector(".at-song-position");
let previousTime = -1;
api.playerPositionChanged.on((e) => {
  const currentSeconds = (e.currentTime / 1000) | 0;
  if (currentSeconds == previousTime) {
    return;
  }
  previousTime = currentSeconds;

  songPosition.innerText = formatDuration(e.currentTime) + " / " + formatDuration(e.endTime);
});

function createMasterVolumeControl() {
  const { container } = createVolumeControl({
    initialValue: 100,
    onChange: (volume) => {
      api.masterVolume = volume;
    },
    containerClass: 'at-volume-control',
    sliderClass: 'at-volume-slider',
    valueClass: 'at-volume-value'
  });
  
  return container;
}

function createSpeedControl() {
  const speedControl = document.createElement('div');
  speedControl.classList.add('at-speed-control');
  
  const speedIcon = document.createElement('i');
  speedIcon.classList.add('fas', 'fa-tachometer-alt');
  
  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.min = 25;
  speedSlider.max = 200;
  speedSlider.value = 100;
  speedSlider.step = 5;
  speedSlider.classList.add('at-speed-slider');
  
  const speedValue = document.createElement('span');
  speedValue.classList.add('at-speed-value');
  speedValue.textContent = '100%';
  
  speedSlider.oninput = (e) => {
    const speed = parseInt(e.target.value) / 100;
    api.playbackSpeed = speed;
    speedValue.textContent = `${e.target.value}%`;
  };
  
  speedControl.appendChild(speedIcon);
  speedControl.appendChild(speedSlider);
  speedControl.appendChild(speedValue);
  
  return speedControl;
}



const controlsRight = wrapper.querySelector('.at-controls-right');
controlsRight.appendChild(createMasterVolumeControl());
controlsRight.appendChild(createSpeedControl());
controlsRight.appendChild(createAutoScrollToggle());

api.playerReady.on(() => {
  api.masterVolume = 1.0;
  api.playbackSpeed = 1.0;
});

const styleElement = document.createElement('style');
styleElement.textContent = `
  .at-auto-scroll {
    position: relative;
  }
  
  .at-auto-scroll.active {
    background-color: var(--primary-color);
  }
  
  .at-auto-scroll:not(.active) {
    opacity: 0.7;
  }
`;
document.head.appendChild(styleElement);