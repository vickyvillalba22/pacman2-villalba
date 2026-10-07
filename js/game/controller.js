'use strict';

import Game from '../game/model/Game.mjs';
import Configuration from '../global/Configuration.mjs';
import LifeCounterOverlay from './views/pixi/LifeCounterOverlay.mjs';
import AudioManager from './audio/AudioManager.mjs';


/*  
    =================================================================================================================
    Initialization code that gets executed once upon loading the index.html
    =================================================================================================================
*/


const mainCanvas = document.getElementById('gameCanvas');
const backgroundCanvas = document.getElementById('backgroundCanvas');
const startMessage = document.getElementById('startMessage');
const gameOverModal = document.getElementById('gameOverModal');
const gameOverScore = document.getElementById('gameOverScore');
const restartButton = document.getElementById('restartButton');
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

window.addEventListener('load', async () => {
   await lifeCounterOverlay.initialize();
   game.initialize();
}); // ensure all resources are completely loaded

mainCanvas.addEventListener('click', startGame);
document.addEventListener('keydown', callBackKeyDown, true);
document.getElementsByClassName('buttonMobileMenu')[0].addEventListener('click', callBackMobileMenuButton);
restartButton.addEventListener('click', restartGame);
audioMuteButton.addEventListener('click', toggleAudioMute);
audioVolume.addEventListener('input', updateMasterVolume);


function callBackMobileMenuButton() {
   this.classList.toggle('mobileMenuVisible');
}


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
   await audioManager.unlock();
   audioManager.playSound('start');
   audioManager.playMusic('levelMusic');
   startMessage.classList.add('invisible');
   lifeCounterOverlay.setPaused(false);
   game.start();
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
   if (game.isGameOverPending) {
      return;
   }

   if (!gameOverModal.classList.contains('invisible')) {
      if (event.code === 'Enter') {
         restartGame();
         event.preventDefault();
      }
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
