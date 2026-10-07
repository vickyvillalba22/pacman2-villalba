import { Application, Assets, Container, FillGradient, Graphics, Sprite, Text } from 'pixi.js';

export default class DesignLabApp {
   #container = null;
   #app = null;
   #stageContent = null;
   #animationContainer = null;
   #animationApp = null;
   #animationContent = null;
   #animationTrail = null;
   #animationCharacter = null;
   #animationBody = null;
   #animationLabel = null;
   #animationGhosts = [];
   #animationTime = 0;
   #animationPlaying = false;
   #movementContainer = null;
   #movementApp = null;
   #movementContent = null;
   #movementTextures = null;
   #movementPacman = null;
   #movementTileSize = 0;
   #movementOriginX = 0;
   #movementOriginY = 0;
   #movementPosition = { row: 3, column: 4 };
   #movementDirection = 'right';
   #movementMap = [
      '#################',
      '#O...o#####o....#',
      '#o###o#ooo#o###o#',
      '#oooo#o###o#oooo#',
      '####o#ooooo#o####',
      '#oooo#####oooooo#',
      '#o###ooooo###o..#',
      '#o...o###o...o..#',
      '#################'
   ];
   #movementKeyHandler = null;
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
       await this.#initializeMovementPreview();
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
       this.#createAnimationGhosts();

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

       if (this.#movementApp && this.#movementContainer) {
          this.#movementApp.renderer.resize(this.#movementContainer.clientWidth, this.#movementContainer.clientHeight);
          this.#drawMovementMap();
       }
   }

   async #initializeMovementPreview() {
      this.#movementContainer = document.getElementById('movementCanvas');
      if (!this.#movementContainer) {
         return;
      }

      this.#movementApp = new Application();
      await this.#movementApp.init({
         background: 0x090b17,
         antialias: false,
         resolution: window.devicePixelRatio || 1,
         width: this.#movementContainer.clientWidth,
         height: this.#movementContainer.clientHeight
      });

      this.#movementContainer.appendChild(this.#movementApp.canvas);
      this.#movementContent = new Container();
      this.#movementApp.stage.addChild(this.#movementContent);
      this.#movementTextures = await Assets.load([
         { alias: 'empty', src: '../sprites/background/emptySpace.svg' },
         { alias: 'wall', src: '../sprites/background/wall.svg' },
         { alias: 'point', src: '../sprites/background/consumables/point.svg' },
         { alias: 'power', src: '../sprites/background/consumables/powerUp.svg' }
      ]);
      this.#movementKeyHandler = event => this.#handleMovementKey(event);
      window.addEventListener('keydown', this.#movementKeyHandler);
      this.#drawMovementMap();
   }

   #drawMovementMap() {
      if (!this.#movementContent || !this.#movementTextures) {
         return;
      }

      this.#movementContent.removeChildren().forEach(child => child.destroy());

      const columnCount = this.#movementMap[0].length;
      const rowCount = this.#movementMap.length;
      const tileSize = Math.min(
         this.#movementApp.screen.width / columnCount,
         this.#movementApp.screen.height / rowCount
      );
      const originX = (this.#movementApp.screen.width - columnCount * tileSize) / 2;
      const originY = (this.#movementApp.screen.height - rowCount * tileSize) / 2;
      this.#movementTileSize = tileSize;
      this.#movementOriginX = originX;
      this.#movementOriginY = originY;

      this.#movementMap.forEach((row, rowIndex) => {
         [...row].forEach((tile, columnIndex) => {
            const x = originX + columnIndex * tileSize;
            const y = originY + rowIndex * tileSize;
            const background = new Sprite(this.#movementTextures.empty);
            background.position.set(x, y);
            background.width = tileSize;
            background.height = tileSize;
            this.#movementContent.addChild(background);

            const texture = tile === '#'
               ? this.#movementTextures.wall
               : tile === 'O'
                  ? this.#movementTextures.power
                  : tile === 'o'
                     ? this.#movementTextures.point
                     : null;
            if (texture) {
               const element = new Sprite(texture);
               element.position.set(x, y);
               element.width = tileSize;
               element.height = tileSize;
               this.#movementContent.addChild(element);
            }
         });
      });

      const pacmanSize = tileSize * 0.85;
      const pacman = new Container();
      const pacmanTrail = this.#createAnimationTrail(0xffe84d, tileSize * 4, pacmanSize, false);
      const pacmanBody = new Graphics();
      this.#drawPacmanBody(pacmanBody, pacmanSize / 2, 0.35);
      pacman.addChild(pacmanTrail, pacmanBody);
      pacman.position.set(
         originX + ((this.#movementPosition.column + 0.5) * tileSize),
         originY + ((this.#movementPosition.row + 0.5) * tileSize)
      );
      pacman.rotation = this.#getDirectionRotation(this.#movementDirection);
      this.#movementPacman = pacman;
      this.#movementContent.addChild(pacman);
   }

   #handleMovementKey(event) {
      const directionByKey = {
         ArrowUp: { name: 'up', row: -1, column: 0 },
         ArrowRight: { name: 'right', row: 0, column: 1 },
         ArrowDown: { name: 'down', row: 1, column: 0 },
         ArrowLeft: { name: 'left', row: 0, column: -1 }
      };
      const direction = directionByKey[event.code];

      if (!direction || !this.#movementPacman) {
         return;
      }

      event.preventDefault();
      this.#movementDirection = direction.name;
      this.#movementPacman.rotation = this.#getDirectionRotation(direction.name);

      const nextRow = this.#movementPosition.row + direction.row;
      const nextColumn = this.#movementPosition.column + direction.column;
      const isInsideMap = nextRow >= 0
         && nextRow < this.#movementMap.length
         && nextColumn >= 0
         && nextColumn < this.#movementMap[0].length;

      if (!isInsideMap || this.#movementMap[nextRow][nextColumn] === '#') {
         return;
      }

      this.#movementPosition = { row: nextRow, column: nextColumn };
      this.#movementPacman.position.set(
         this.#movementOriginX + ((nextColumn + 0.5) * this.#movementTileSize),
         this.#movementOriginY + ((nextRow + 0.5) * this.#movementTileSize)
      );
   }

   #createAnimationCharacter() {
      this.#animationTrail = this.#createAnimationTrail(0xffe84d, 220, 96, false);
      this.#animationContent.addChild(this.#animationTrail);

      const character = new Container();
      this.#animationCharacter = character;
      this.#animationBody = new Graphics();
      character.addChild(this.#animationBody);
      this.#animationContent.addChild(character);
       this.#animationLabel = new Text({
          text: 'PAC-MAN + GHOSTS / IDLE ANIMATION',
          style: {
            fill: 0x8b94b1,
            fontFamily: 'monospace',
            fontSize: 12,
             letterSpacing: 1
          }
       });
       this.#animationContent.addChild(this.#animationLabel);
       this.#animationLabel.anchor.set(0.5, 0);
       this.#positionAnimationCharacter();
       this.#renderAnimationMouth(0.35);
    }

   #createAnimationGhosts() {
      const ghosts = [
         { color: 0xff425d },
         { color: 0xff75c8 },
         { color: 0x6de7ff },
         { color: 0xffa347 }
      ];

      this.#animationGhosts = ghosts.map(ghost => {
         const container = new Container();
         const ghostSize = this.#tileSize * 0.68;
         const trail = this.#createAnimationTrail(ghost.color, 130, ghostSize, true);
         const character = this.#createGhost(ghost.color, 'normal', 'right');

         trail.position.set(0, 0);
         container.addChild(trail, character);
         this.#animationContent.addChild(container);

         return container;
      });
   }

   #createAnimationTrail(color, length, height, slantedEntry) {
      const radius = height / 2;
      const overlap = radius;
      const trailEnd = -radius + overlap;
      const trail = new Container();

       const body = new Graphics();

      const gradient = new FillGradient({
         type: 'linear',
         start: { x: 1, y: 0.5 },
         end: { x: 0, y: 0.5 },
         colorStops: [
            { offset: 0, color: `#${color.toString(16).padStart(6, '0')}80` },
            { offset: 1, color: `#${color.toString(16).padStart(6, '0')}00` }
         ]
      });

      // The slanted entry follows the ghost's lower edge into its body.
      if (slantedEntry) {
         const trailStart = trailEnd - length;
         body
            .moveTo(trailEnd, -radius)
            .lineTo(trailEnd - radius, radius)
            .lineTo(trailStart - radius, radius)
            .lineTo(trailStart, -radius)
            .closePath()
            .fill(gradient);
      } else {
         body.rect(trailEnd - length, -radius, length, height).fill(gradient);
      }

      trail.addChild(body);
      return trail;
   }

   #positionAnimationCharacter() {
      if (!this.#animationCharacter || !this.#animationTrail) {
         return;
      }

      const characterX = this.#animationApp.screen.width / 2;
      const characterY = this.#animationApp.screen.height / 2 - 12;
      this.#animationCharacter.position.set(characterX, characterY);
      this.#animationTrail.position.set(characterX, characterY);
      this.#animationLabel.position.set(
         this.#animationApp.screen.width / 2,
         14
      );

      const ghostY = this.#animationApp.screen.height / 2 + 62;
      const ghostSpacing = this.#animationApp.screen.width / (this.#animationGhosts.length + 1);
      this.#animationGhosts.forEach((ghost, index) => {
         ghost.position.set(ghostSpacing * (index + 1), ghostY);
      });
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
      if (!this.#animationBody) {
         return;
      }

      this.#drawPacmanBody(this.#animationBody, 48, opening);
   }

   #drawPacmanBody(body, radius, opening) {
      const angle = opening * Math.PI;
      const lowerMouthEdge = angle / 2;
      const upperMouthEdge = Math.PI * 2 - lowerMouthEdge;

      // Draw the Pac-Man silhouette directly, leaving the mouth out of the body.
      body.clear();
      body
         .moveTo(0, 0)
         .lineTo(radius * Math.cos(lowerMouthEdge), radius * Math.sin(lowerMouthEdge))
         .arc(0, 0, radius, lowerMouthEdge, upperMouthEdge)
         .lineTo(0, 0)
         .closePath()
         .fill(0xffe84d);
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
      const size = this.#tileSize * 0.68;
      const width = size;
      const height = size;
      const isDead = state === 'dead';
      const isScared = state === 'scared' || state === 'scaredEnd';
      const bodyColor = isDead ? 0x0d1021 : (isScared ? 0x4b7cff : color);
      const left = -width / 2;
      const top = -height / 2;
      const domeRadius = width / 2;
      const domeTop = top + domeRadius;
      const bottom = top + height;
      if (!isDead) {
         visual
            .moveTo(left, domeTop)
            .arc(0, domeTop, domeRadius, Math.PI, Math.PI * 2)
            .lineTo(width / 2, bottom)
            .lineTo(left + width * 0.83, bottom - height * 0.1)
            .lineTo(left + width * 0.66, bottom)
            .lineTo(left + width * 0.5, bottom - height * 0.1)
            .lineTo(left + width * 0.34, bottom)
            .lineTo(left + width * 0.17, bottom - height * 0.1)
            .lineTo(left, bottom)
            .closePath()
            .fill(bodyColor);
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
