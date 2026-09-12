import { Application, BlurFilter, Container, Graphics, Text } from 'pixi.js';

export default class DesignLabApp {
   #container = null;
   #app = null;
   #stageContent = null;
   #animationContainer = null;
   #animationApp = null;
   #animationContent = null;
   #animationTrail = null;
   #animationCharacter = null;
   #animationMouth = null;
   #animationTime = 0;
   #animationPlaying = false;
   #tileSize = 48;
   #mode = 'characters';
   #showGrid = true;
   #character = 'p';
   #state = 'normal';
   #direction = 'right';
   #resizeHandler = null;

   async initialize() {
      this.#container = document.getElementById('previewCanvas');
      if (!this.#container) {
         return;
      }

      this.#app = new Application();
      await this.#app.init({
         background: 0x090b17,
         antialias: false,
         resolution: window.devicePixelRatio || 1,
         width: this.#container.clientWidth,
         height: this.#container.clientHeight
      });

      this.#container.appendChild(this.#app.canvas);
      this.#stageContent = new Container();
      this.#app.stage.addChild(this.#stageContent);

      this.#bindControls();
      await this.#initializeAnimationPreview();
      this.#resizeHandler = () => this.#resize();
      window.addEventListener('resize', this.#resizeHandler);
      this.#resize();

      document.getElementById('previewStatus').textContent = 'LIVE / PIXIJS';
   }

   async #initializeAnimationPreview() {
      this.#animationContainer = document.getElementById('animationCanvas');
      if (!this.#animationContainer) {
         return;
      }

      this.#animationApp = new Application();
      await this.#animationApp.init({
         background: 0x090b17,
         antialias: false,
         resolution: window.devicePixelRatio || 1,
         width: this.#animationContainer.clientWidth,
         height: this.#animationContainer.clientHeight
      });

      this.#animationContainer.appendChild(this.#animationApp.canvas);
      this.#animationContent = new Container();
      this.#animationApp.stage.addChild(this.#animationContent);
      this.#createAnimationCharacter();

      document.getElementById('toggleAnimation').addEventListener('click', () => {
         this.#animationPlaying = !this.#animationPlaying;
         document.getElementById('toggleAnimation').textContent = this.#animationPlaying
            ? 'Pausar animación'
            : 'Activar animación';
         document.getElementById('animationStatus').textContent = this.#animationPlaying
            ? 'PLAYING / STATIC POSITION'
            : 'PAUSED / STATIC';
      });

      this.#animationApp.ticker.add(({ deltaTime }) => this.#animatePacman(deltaTime));
   }

   #bindControls() {
      const modeInput = document.getElementById('previewMode');
      const characterInput = document.getElementById('previewCharacter');
      const stateInput = document.getElementById('previewState');
      const directionInput = document.getElementById('previewDirection');
      const tileInput = document.getElementById('tileSize');
      const gridInput = document.getElementById('showGrid');
      const tileOutput = document.getElementById('tileSizeValue');

      modeInput.addEventListener('change', event => {
         this.#mode = event.target.value;
         this.#draw();
      });

      characterInput.addEventListener('change', event => {
         this.#character = event.target.value;
         this.#draw();
      });

      stateInput.addEventListener('change', event => {
         this.#state = event.target.value;
         this.#draw();
      });

      directionInput.addEventListener('change', event => {
         this.#direction = event.target.value;
         this.#draw();
      });

      tileInput.addEventListener('input', event => {
         this.#tileSize = Number(event.target.value);
         tileOutput.textContent = `${this.#tileSize} px`;
         this.#draw();
      });

      gridInput.addEventListener('change', event => {
         this.#showGrid = event.target.checked;
         this.#draw();
      });
   }

   #resize() {
      const width = this.#container.clientWidth;
      const height = this.#container.clientHeight;
      this.#app.renderer.resize(width, height);
      document.getElementById('canvasDimensions').textContent = `Canvas ${width} x ${height}`;
      this.#draw();

      if (this.#animationApp && this.#animationContainer) {
         this.#animationApp.renderer.resize(this.#animationContainer.clientWidth, this.#animationContainer.clientHeight);
         this.#positionAnimationCharacter();
      }
   }

   #createAnimationCharacter() {
      this.#animationTrail = new Container();
      this.#animationContent.addChild(this.#animationTrail);
      this.#createAnimationTrail();

      const character = new Container();
      this.#animationCharacter = character;
      const radius = 48;
      const body = new Graphics();
      body.circle(0, 0, radius).fill(0xffe84d);
      character.addChild(body);

      this.#animationMouth = new Graphics();
      character.addChild(this.#animationMouth);
      this.#animationContent.addChild(character);
      this.#animationContent.addChild(new Text({
         text: 'PAC-MAN / IDLE ANIMATION',
         style: {
            fill: 0x8b94b1,
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: 1
         }
      }));
      this.#animationContent.children[2].anchor.set(0.5, 0);
      this.#animationContent.children[2].position.set(0, 82);
      this.#positionAnimationCharacter();
      this.#renderAnimationMouth(0.35);
   }

   #createAnimationTrail() {
      const radius = 48;
      const length = 220;
      const segmentCount = 28;
      const segmentWidth = length / segmentCount;

      // The glow is kept in the trail container, below the sharp character layer.
      const glow = new Graphics();
      glow.roundRect(-radius - length, -radius, length, radius * 2, radius * 0.35);
      glow.fill(0xffc400, 0.52);
      glow.filters = [new BlurFilter({ strength: 18, quality: 4 })];
      this.#animationTrail.addChild(glow);

      const body = new Graphics();
      const scanlines = new Graphics();
      const borders = new Graphics();

      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
         const distanceFromCharacter = segmentIndex / (segmentCount - 1);
         const x = -radius - segmentWidth * (segmentIndex + 1);
         const color = this.#interpolateColor(0xffb700, 0xffd700, 1 - distanceFromCharacter);
         const alpha = 0.12 + (1 - distanceFromCharacter) * 0.82;

         // Solid beam: full character diameter and a spatial alpha fade toward the tail.
         body.rect(x, -radius, segmentWidth + 0.6, radius * 2);
         body.fill(color, alpha);

         // Horizontal CRT-like scanlines layered over the beam.
         for (let row = 0; row < 12; row++) {
            const y = -radius + 5 + row * 8;
            scanlines.rect(x, y, segmentWidth + 0.6, 2);
            scanlines.fill(0xfff6a8, alpha * (row % 2 === 0 ? 0.42 : 0.2));
         }
      }

      body.alpha = 0.96;
      scanlines.blendMode = 'add';
      this.#animationTrail.addChild(body, scanlines);

      // Thin, bright rails define both lateral borders of the beam.
      borders.moveTo(-radius - length, -radius + 0.75);
      borders.lineTo(-radius, -radius + 0.75);
      borders.moveTo(-radius - length, radius - 0.75);
      borders.lineTo(-radius, radius - 0.75);
      borders.stroke({ width: 1.5, color: 0xffffcf, alpha: 0.92 });
      borders.filters = [new BlurFilter({ strength: 2.5, quality: 2 })];
      this.#animationTrail.addChild(borders);

      // A crisp center highlight keeps the beam readable over the glow.
      const highlight = new Graphics();
      highlight.rect(-radius - length + 5, -1, length - 5, 2);
      highlight.fill(0xffff9e, 0.34);
      highlight.blendMode = 'add';
      this.#animationTrail.addChild(highlight);
   }

   #interpolateColor(startColor, endColor, amount) {
      const startRed = (startColor >> 16) & 0xff;
      const startGreen = (startColor >> 8) & 0xff;
      const startBlue = startColor & 0xff;
      const endRed = (endColor >> 16) & 0xff;
      const endGreen = (endColor >> 8) & 0xff;
      const endBlue = endColor & 0xff;
      const red = Math.round(startRed + (endRed - startRed) * amount);
      const green = Math.round(startGreen + (endGreen - startGreen) * amount);
      const blue = Math.round(startBlue + (endBlue - startBlue) * amount);
      return (red << 16) | (green << 8) | blue;
   }

   #positionAnimationCharacter() {
      if (!this.#animationCharacter || !this.#animationTrail) {
         return;
      }

      const characterX = this.#animationApp.screen.width / 2;
      const characterY = this.#animationApp.screen.height / 2 - 12;
      this.#animationCharacter.position.set(characterX, characterY);
      this.#animationTrail.position.set(characterX, characterY);
      this.#animationContent.children[2].position.set(
         this.#animationApp.screen.width / 2,
         this.#animationApp.screen.height / 2 + 70
      );
   }

   #animatePacman(deltaTime) {
      if (!this.#animationPlaying) {
         return;
      }

      this.#animationTime += deltaTime * 0.08;
      const mouthOpening = 0.08 + ((Math.sin(this.#animationTime) + 1) / 2) * 0.52;
      this.#renderAnimationMouth(mouthOpening);
   }

   #renderAnimationMouth(opening) {
      if (!this.#animationMouth) {
         return;
      }

      const radius = 48;
      const angle = opening * Math.PI;
      this.#animationMouth.clear();
      this.#animationMouth.poly([
         0,
         0,
         radius * Math.cos(-angle / 2),
         radius * Math.sin(-angle / 2),
         radius * Math.cos(angle / 2),
         radius * Math.sin(angle / 2)
      ]).fill(0x090b17);
   }

   #draw() {
      if (!this.#stageContent) {
         return;
      }

      this.#stageContent.removeChildren().forEach(child => child.destroy({ children: true }));

      const boardWidth = this.#mode === 'elements' ? 7 : 9;
      const boardHeight = this.#mode === 'characters' ? 7 : 8;
      const boardPixelWidth = boardWidth * this.#tileSize;
      const boardPixelHeight = boardHeight * this.#tileSize;
      const originX = Math.max(0, (this.#app.screen.width - boardPixelWidth) / 2);
      const originY = Math.max(0, (this.#app.screen.height - boardPixelHeight) / 2);

      this.#drawBoard(originX, originY, boardWidth, boardHeight);

      if (this.#mode === 'characters' || this.#mode === 'composition') {
         this.#drawCharacters(originX, originY);
      }

      if (this.#mode === 'elements' || this.#mode === 'composition') {
         this.#drawElements(originX, originY);
      }

      this.#drawLabel(originX, originY, boardWidth);
   }

   #drawBoard(originX, originY, boardWidth, boardHeight) {
      const board = new Graphics();
      board.roundRect(originX - 12, originY - 12, boardWidth * this.#tileSize + 24, boardHeight * this.#tileSize + 24, 12);
      board.fill(0x0d1021);
      board.stroke({ width: 1, color: 0x303b61 });
      this.#stageContent.addChild(board);

      if (!this.#showGrid) {
         return;
      }

      const grid = new Graphics();
      for (let column = 0; column <= boardWidth; column++) {
         const x = originX + column * this.#tileSize;
         grid.moveTo(x, originY).lineTo(x, originY + boardHeight * this.#tileSize);
      }
      for (let row = 0; row <= boardHeight; row++) {
         const y = originY + row * this.#tileSize;
         grid.moveTo(originX, y).lineTo(originX + boardWidth * this.#tileSize, y);
      }
      grid.stroke({ width: 1, color: 0x1d2745, alpha: 0.9 });
      this.#stageContent.addChild(grid);
   }

   #drawCharacters(originX, originY) {
      const centerY = originY + this.#tileSize * 3.5;
      const positions = [
         { id: 'p', label: 'PAC-MAN', x: originX + this.#tileSize * 0.9, color: 0xffe84d, type: 'pacman' },
         { id: 'b', label: 'BLINKY', x: originX + this.#tileSize * 2.7, color: 0xff425d, type: 'ghost' },
         { id: 'y', label: 'PINKY', x: originX + this.#tileSize * 4.5, color: 0xff75c8, type: 'ghost' },
         { id: 'i', label: 'INKY', x: originX + this.#tileSize * 6.3, color: 0x6de7ff, type: 'ghost' },
         { id: 'c', label: 'CLYDE', x: originX + this.#tileSize * 8.1, color: 0xffa347, type: 'ghost' }
      ];

      positions.forEach(character => {
         const isSelected = this.#character === character.id;
         const visual = character.type === 'pacman'
            ? this.#createPacman(character.color, isSelected ? this.#direction : 'right')
            : this.#createGhost(character.color, isSelected ? this.#state : 'normal', isSelected ? this.#direction : 'right');
         visual.position.set(character.x, centerY);
         visual.alpha = isSelected ? 1 : 0.58;
         this.#stageContent.addChild(visual);
         this.#addCaption(character.label, character.x, centerY + this.#tileSize * 0.8, isSelected);
      });

      this.#addSelectionLabel(originX, centerY - this.#tileSize * 0.8);
   }

   #drawElements(originX, originY) {
      const tile = this.#tileSize;
      const elements = [
         { label: 'WALL', x: originX + tile * 1.5, y: originY + tile * 2.5, type: 'wall' },
         { label: 'POINT', x: originX + tile * 3.5, y: originY + tile * 2.5, type: 'point' },
         { label: 'POWER', x: originX + tile * 5.5, y: originY + tile * 2.5, type: 'power' },
         { label: 'PORTAL', x: originX + tile * 1.5, y: originY + tile * 5.5, type: 'portal' },
         { label: 'DOOR', x: originX + tile * 3.5, y: originY + tile * 5.5, type: 'door' },
         { label: 'BONUS', x: originX + tile * 5.5, y: originY + tile * 5.5, type: 'bonus' }
      ];

      elements.forEach(element => {
         const visual = this.#createElement(element.type);
         visual.position.set(element.x, element.y);
         this.#stageContent.addChild(visual);
         this.#addCaption(element.label, element.x, element.y + tile * 0.65);
      });
   }

   #createPacman(color, direction) {
      const visual = new Graphics();
      const radius = this.#tileSize * 0.34;
      visual.circle(0, 0, radius).fill(color);
      const mouth = new Graphics();
      mouth.poly([0, 0, radius, -radius * 0.65, radius, radius * 0.65]).fill(0x0d1021);
      mouth.rotation = this.#getDirectionRotation(direction);
      visual.addChild(mouth);
      return visual;
   }

   #createGhost(color, state, direction) {
      const visual = new Graphics();
      const width = this.#tileSize * 0.68;
      const height = this.#tileSize * 0.68;
      const isDead = state === 'dead';
      const isScared = state === 'scared' || state === 'scaredEnd';
      const bodyColor = isDead ? 0x0d1021 : (isScared ? 0x4b7cff : color);
      const left = -width / 2;
      const top = -height / 2;
      if (!isDead) {
         visual.roundRect(left, top, width, height * 0.78, width * 0.25).fill(bodyColor);
         visual.rect(left, top + height * 0.35, width, height * 0.25).fill(bodyColor);
      }

      const eyeDirection = this.#getEyeDirection(direction);
      const eyeOffset = width * 0.045;
      visual.circle(-width * 0.2, -height * 0.08, width * 0.1).fill(0xffffff);
      visual.circle(width * 0.2, -height * 0.08, width * 0.1).fill(0xffffff);
      visual.circle(-width * 0.18 + eyeDirection.x * eyeOffset, -height * 0.06 + eyeDirection.y * eyeOffset, width * 0.045).fill(0x101426);
      visual.circle(width * 0.22 + eyeDirection.x * eyeOffset, -height * 0.06 + eyeDirection.y * eyeOffset, width * 0.045).fill(0x101426);
      return visual;
   }

   #createElement(type) {
      const visual = new Graphics();
      const halfTile = this.#tileSize / 2;

      if (type === 'wall') {
         visual.roundRect(-halfTile * 0.72, -halfTile * 0.72, this.#tileSize * 0.72, this.#tileSize * 0.72, 8);
         visual.fill(0x263dff);
         visual.stroke({ width: 3, color: 0x6de7ff });
      }
      if (type === 'point') {
         visual.circle(0, 0, this.#tileSize * 0.08).fill(0xfff6d3);
      }
      if (type === 'power') {
         visual.circle(0, 0, this.#tileSize * 0.2).fill(0xfff6d3);
         visual.circle(0, 0, this.#tileSize * 0.09).fill(0xff4da6);
      }
      if (type === 'portal') {
         visual.ellipse(0, 0, this.#tileSize * 0.3, this.#tileSize * 0.18).fill(0x6de7ff);
         visual.ellipse(0, 0, this.#tileSize * 0.16, this.#tileSize * 0.08).fill(0x0d1021);
      }
      if (type === 'door') {
         visual.rect(-halfTile * 0.65, -4, this.#tileSize * 0.65, 8).fill(0xff75c8);
      }
      if (type === 'bonus') {
         visual.circle(0, 3, this.#tileSize * 0.2).fill(0xff425d);
         visual.rect(-2, -this.#tileSize * 0.25, 4, this.#tileSize * 0.15).fill(0x6de7ff);
      }

      return visual;
   }

   #addCaption(text, x, y, isSelected = false) {
      const caption = new Text({
         text,
         style: {
            fill: isSelected ? 0xffe84d : 0x8b94b1,
            fontFamily: 'monospace',
            fontSize: Math.max(8, this.#tileSize * 0.16),
            letterSpacing: 1
         }
      });
      caption.anchor.set(0.5, 0);
      caption.position.set(x, y);
      this.#stageContent.addChild(caption);
   }

   #addSelectionLabel(originX, y) {
      const characterNames = { p: 'PAC-MAN', b: 'BLINKY', y: 'PINKY', i: 'INKY', c: 'CLYDE' };
      const label = new Text({
         text: `${characterNames[this.#character]} / ${this.#state.toUpperCase()} / ${this.#direction.toUpperCase()}`,
         style: {
            fill: 0xffffff,
            fontFamily: 'monospace',
            fontSize: Math.max(9, this.#tileSize * 0.17),
            letterSpacing: 1
         }
      });
      label.anchor.set(0.5, 1);
      label.position.set(originX + this.#tileSize * 4.5, y);
      label.alpha = 0.85;
      this.#stageContent.addChild(label);
   }

   #getDirectionRotation(direction) {
      const rotations = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
      return rotations[direction] || 0;
   }

   #getEyeDirection(direction) {
      const directions = {
         right: { x: 1, y: 0 },
         left: { x: -1, y: 0 },
         up: { x: 0, y: -1 },
         down: { x: 0, y: 1 }
      };
      return directions[direction] || directions.right;
   }

   #drawLabel(originX, originY, boardWidth) {
      const label = new Text({
         text: this.#mode.toUpperCase(),
         style: {
            fill: 0xffe84d,
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: 2
         }
      });
      label.position.set(originX, originY - 32);
      label.alpha = 0.8;
      this.#stageContent.addChild(label);
   }
}
