'use strict';

import Game from '../game/model/Game.mjs';
import Configuration from '../global/Configuration.mjs';
import LifeCounterOverlay from './views/pixi/LifeCounterOverlay.mjs';


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

const lifeCounterOverlay = new LifeCounterOverlay(mainCanvas);
const game = new Game(mainCanvas, backgroundCanvas, showStartMessage, showGameOver);

window.addEventListener('load', async () => {
   await lifeCounterOverlay.initialize();
   game.initialize();
}); // ensure all resources are completely loaded

mainCanvas.addEventListener('click', startGame);
document.addEventListener('keydown', callBackKeyDown, true);
document.getElementsByClassName('buttonMobileMenu')[0].addEventListener('click', callBackMobileMenuButton);
restartButton.addEventListener('click', restartGame);


function callBackMobileMenuButton() {
   this.classList.toggle('mobileMenuVisible');
}


function startGame() {
   startMessage.classList.add('invisible');
   lifeCounterOverlay.setPaused(false);
   game.start();
}


function showStartMessage() {
   startMessage.classList.remove('invisible');
}


function showGameOver(score) {
   gameOverScore.textContent = `Score: ${score}`;
   gameOverModal.classList.remove('invisible');
}


function restartGame() {
   gameOverModal.classList.add('invisible');
   lifeCounterOverlay.setPaused(false);
   game.restart();
}


function togglePause() {
   game.togglePause();
   lifeCounterOverlay.setPaused(!game.isAnimationNecessary);
}


function callBackKeyDown(event) {
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
