'use strict';

import Game from '../game/model/Game.mjs';
import Configuration from '../global/Configuration.mjs';
import LifeCounterOverlay from './views/pixi/LifeCounterOverlay.mjs';
import AudioManager from './audio/AudioManager.mjs';
import '../welcomePixi.js';


/*  
    =================================================================================================================
    Initialization code that gets executed once upon loading the index.html
    =================================================================================================================
*/


const mainCanvas = document.getElementById('gameCanvas');
const backgroundCanvas = document.getElementById('backgroundCanvas');
const startMessage = document.getElementById('startMessage');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const gameOverModal = document.getElementById('gameOverModal');
const homeConfirmModal = document.getElementById('homeConfirmModal');
const gameOverScore = document.getElementById('gameOverScore');
const restartButton = document.getElementById('restartButton');
const cancelHomeButton = document.getElementById('cancelHomeButton');
const confirmHomeButton = document.getElementById('confirmHomeButton');
const audioMuteButton = document.getElementById('audioMuteButton');
const audioVolume = document.getElementById('audioVolume');

const audioMutedStorageKey = 'pacmanAudioMuted';
const audioVolumeStorageKey = 'pacmanAudioVolume';

const lifeCounterOverlay = new LifeCounterOverlay(mainCanvas);
const audioManager = new AudioManager();
let isAudioMuted = localStorage.getItem(audioMutedStorageKey) === 'true';
let masterVolume = Number.parseFloat(localStorage.getItem(audioVolumeStorageKey));

if (!Number.isFinite(masterVolume)) {
   masterVolume = 1;
}

audioManager.setMuted(isAudioMuted);
audioManager.setMasterVolume(masterVolume);
audioVolume.value = masterVolume;
updateAudioControls();

const game = new Game(mainCanvas, backgroundCanvas, showStartMessage, showGameOver,
                      audioName => audioManager.playSound(audioName));
let isGameInitialized = false;
let isInitialCountdownActive = false;

async function initializeGame() {
   await lifeCounterOverlay.initialize();
   game.initialize();
   isGameInitialized = true;
   if (new URLSearchParams(window.location.search).get('start') === '1') {
      runInitialCountdown();
   }
}

if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', initializeGame, { once: true });
} else {
   initializeGame();
}

mainCanvas.addEventListener('click', startGame);
document.addEventListener('keydown', callBackKeyDown, true);
restartButton.addEventListener('click', restartGame);
audioMuteButton.addEventListener('click', toggleAudioMute);
audioVolume.addEventListener('input', updateMasterVolume);
cancelHomeButton.addEventListener('click', closeHomeConfirmation);
confirmHomeButton.addEventListener('click', returnToHome);

document.addEventListener('extras-menu-state-change', event => {
   if (event.detail.isOpen && game.isAnimationNecessary) {
      togglePause();
   }
});

document.addEventListener('click', event => {
   const actionLink = event.target.closest('[data-menu-action]');
   if (!actionLink) {
      return;
   }

   event.preventDefault();
   if (actionLink.dataset.menuAction === 'resume') {
      document.querySelector('.buttonMobileMenu')?.click();
      startGame();
   } else if (actionLink.dataset.menuAction === 'home') {
      openHomeConfirmation();
   }
});


function toggleAudioMute() {
   isAudioMuted = audioManager.toggleMute();
   localStorage.setItem(audioMutedStorageKey, String(isAudioMuted));
   updateAudioControls();
}


function updateMasterVolume(event) {
   masterVolume = Number(event.target.value);
   audioManager.setMasterVolume(masterVolume);
   localStorage.setItem(audioVolumeStorageKey, String(masterVolume));
}


function updateAudioControls() {
   audioMuteButton.textContent = isAudioMuted ? 'Audio: OFF' : 'Audio: ON';
   audioMuteButton.setAttribute('aria-pressed', String(isAudioMuted));
}


async function startGame() {
   if (!isGameInitialized || isInitialCountdownActive) {
      return;
   }

   await audioManager.unlock();
   audioManager.playSound('start');
   audioManager.playMusic('levelMusic');
   startMessage.classList.add('invisible');
   lifeCounterOverlay.setPaused(false);
   game.start();
}


async function runInitialCountdown() {
   isInitialCountdownActive = true;
   countdownOverlay.classList.remove('invisible');

   for (const number of ['3', '2', '1']) {
      countdownNumber.textContent = number;
      await wait(1000);
   }

   countdownOverlay.classList.add('invisible');
   isInitialCountdownActive = false;
   startGame();
}


function wait(milliseconds) {
   return new Promise(resolve => setTimeout(resolve, milliseconds));
}


function showStartMessage() {
   audioManager.stopMusic();
   startMessage.classList.remove('invisible');
}


function showGameOver(score) {
   audioManager.stopMusic();
   gameOverScore.textContent = `Score: ${score}`;
   gameOverModal.classList.remove('invisible');
}


function openHomeConfirmation() {
   homeConfirmModal.classList.remove('invisible');
   confirmHomeButton.focus();
}


function closeHomeConfirmation() {
   homeConfirmModal.classList.add('invisible');
   document.querySelector('[data-menu-action="home"]')?.focus();
}


function returnToHome() {
   audioManager.stopMusic();
   window.location.href = './index.html';
}


async function restartGame() {
   await audioManager.unlock();
   gameOverModal.classList.add('invisible');
   lifeCounterOverlay.setPaused(false);
   game.restart();
}


function togglePause() {
   game.togglePause();
   lifeCounterOverlay.setPaused(!game.isAnimationNecessary);
}


function callBackKeyDown(event) {
   if (!homeConfirmModal.classList.contains('invisible') && event.code === 'Escape') {
      closeHomeConfirmation();
      event.preventDefault();
      return;
   }

   if (document.querySelector('.buttonMobileMenu')?.getAttribute('aria-expanded') === 'true') {
      return;
   }

   if (game.isGameOverPending) {
      return;
   }

   const extrasMenuButton = document.querySelector('.buttonMobileMenu');
   if (event.code === 'Escape' && extrasMenuButton.getAttribute('aria-expanded') === 'true') {
      extrasMenuButton.classList.remove('extrasMenuVisible');
      extrasMenuButton.setAttribute('aria-expanded', 'false');
      extrasMenuButton.focus();
      return;
   }

   if (!gameOverModal.classList.contains('invisible')) {
      if (event.code === 'Enter') {
         restartGame();
         event.preventDefault();
      }
      return;
   }

   if (event.target.closest('.menuBar')) {
      return;
   }

   switch(event.code) {
   
      case 'ArrowUp':
      case 'KeyW':
         game.setNextPacmanDirection(Configuration.directionNameUp);
         event.preventDefault();
         break;
      
      case 'ArrowRight':
      case 'KeyD':
         game.setNextPacmanDirection(Configuration.directionNameRight);
         event.preventDefault();
         break;
      
      case 'ArrowDown':
      case 'KeyS':
         game.setNextPacmanDirection(Configuration.directionNameDown);
         event.preventDefault();
         break;

      case 'ArrowLeft':
      case 'KeyA':
         game.setNextPacmanDirection(Configuration.directionNameLeft);
         event.preventDefault();
         break;

      case 'Enter':
         if (game.isAnimationNecessary) {
            togglePause();
         } else {
            startGame();
         }
         event.preventDefault();
         break;

      case 'Space':
         startGame();
         event.preventDefault();
         break;

      case 'KeyP':
         togglePause();
         break;
   }         
}
