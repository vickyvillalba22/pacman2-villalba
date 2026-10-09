import { Application, Assets, Container, FillGradient, Graphics, Sprite, Text, Texture } from 'pixi.js';
import WallTopology from './WallTopology.mjs';

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
   #movementPacmanBody = null;
   #movementPacmanRadius = 0;
   #movementAnimationTime = 0;
   #movementPowerPellets = [];
   #movementPacmanTrail = null;
   #movementTrailPositions = [];
    #movementGhosts = [];
    #movementGhostsPaused = true;
    #movementGhostStepTimer = 0;
   #movementTileSize = 0;
   #movementOriginX = 0;
   #movementOriginY = 0;
   #movementPosition = { row: 3, column: 4 };
   #movementDirection = 'right';
   #movementMap = [
      '#################',
       '#O..Oo#####o....#',
      '#o###o#ooo#o###o#',
      '#oooo#o###o#oooo#',
      '####o#ooooo#o####',
      '#oooo#####oooooo#',
      '#o###ooooo###o..#',
       '#o..Oo###o...P..#',
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
          { alias: 'power', src: '../sprites/background/consumables/powerUp.svg' }
       ]);
      this.#movementKeyHandler = event => this.#handleMovementKey(event);
      window.addEventListener('keydown', this.#movementKeyHandler);
      this.#drawMovementMap();
       this.#movementApp.ticker.add(({ deltaTime }) => this.#animateMovementPacman(deltaTime));
       this.#movementApp.ticker.add(() => this.#animateMovementPowerPellets());
       this.#movementApp.ticker.add(({ deltaTime }) => this.#animateMovementGhosts(deltaTime));
   }

   #drawMovementMap() {
      if (!this.#movementContent || !this.#movementTextures) {
         return;
      }

       this.#movementContent.removeChildren().forEach(child => child.destroy());
       this.#movementPowerPellets = [];
       this.#movementPacmanTrail?.texture.destroy(true);
      this.#movementGhosts.forEach(ghost => {
         ghost.trailLayer?.texture.destroy(true);
         ghost.container = null;
         ghost.body = null;
         ghost.trailLayer = null;
      });
      this.#movementPacmanTrail = null;

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

       if (this.#movementTrailPositions.length === 0) {
          this.#movementTrailPositions.push({ ...this.#movementPosition });
       }

       const wallLayer = new Graphics();
       WallTopology.getWallInfoList(this.#movementMap).forEach(wall => {
           this.#drawMovementWall(wallLayer, wall, tileSize, originX, originY);
       });

      this.#movementMap.forEach((row, rowIndex) => {
         [...row].forEach((tile, columnIndex) => {
            const x = originX + columnIndex * tileSize;
            const y = originY + rowIndex * tileSize;
            const background = new Sprite(this.#movementTextures.empty);
            background.position.set(x, y);
            background.width = tileSize;
            background.height = tileSize;
            this.#movementContent.addChild(background);

            if (tile === 'o') {
               const element = new Graphics();
               element.circle(0, 0, tileSize * 0.08).fill(0xffffff);
               element.position.set(x + tileSize / 2, y + tileSize / 2);
               this.#movementContent.addChild(element);
            } else if (tile === 'O') {
               const pellet = this.#createMovementPowerPellet(tileSize);
               pellet.container.position.set(x + tileSize / 2, y + tileSize / 2);
               this.#movementPowerPellets.push(pellet);
               this.#movementContent.addChild(pellet.container);
            } else if (tile === 'P') {
               const portal = this.#createMovementPortal(tileSize);
               portal.position.set(x + tileSize / 2, y + tileSize / 2);
               this.#movementContent.addChild(portal);
             }
          });
       });

       this.#movementContent.addChild(wallLayer);

      const pacmanSize = tileSize * 0.85;
      this.#movementPacmanTrail = this.#createMovementTrailSprite();
      this.#renderMovementTrail(this.#movementPacmanTrail, this.#movementTrailPositions, 0xffe84d);
      this.#initializeMovementGhosts();
       this.#movementGhosts.forEach(ghost => {
         ghost.trailLayer = this.#createMovementTrailSprite();
         this.#renderMovementTrail(ghost.trailLayer, ghost.trailPositions, ghost.color);
      });

      const pacman = new Container();
      const pacmanBody = new Graphics();
      this.#movementPacmanBody = pacmanBody;
      this.#movementPacmanRadius = pacmanSize / 2;
      this.#drawPacmanBody(pacmanBody, this.#movementPacmanRadius, 0.35);
      pacman.addChild(pacmanBody);
      pacman.position.set(
         originX + ((this.#movementPosition.column + 0.5) * tileSize),
         originY + ((this.#movementPosition.row + 0.5) * tileSize)
      );
      pacman.rotation = this.#getDirectionRotation(this.#movementDirection);
      this.#movementPacman = pacman;
      this.#movementContent.addChild(pacman);

      this.#movementGhosts.forEach(ghost => {
         ghost.container = new Container();
         ghost.body = this.#createGhost(
            ghost.color,
            'normal',
            ghost.direction,
            this.#movementTileSize * 0.68
         );
         ghost.container.addChild(ghost.body);
         this.#positionMovementGhost(ghost);
         this.#movementContent.addChild(ghost.container);
      });
   }

   #initializeMovementGhosts() {
      if (this.#movementGhosts.length > 0) {
         return;
      }

      const patrols = [
         {
            color: 0xff425d,
            route: [[3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [1, 4], [1, 3], [1, 2], [1, 1], [2, 1]]
         },
         {
            color: 0xff75c8,
            route: [[3, 15], [2, 15], [1, 15], [1, 14], [1, 13], [1, 12], [1, 11], [1, 12], [1, 13], [1, 14], [1, 15], [2, 15]]
         },
         {
            color: 0x6de7ff,
            route: [[7, 5], [6, 5], [6, 6], [6, 7], [6, 8], [6, 9], [7, 9], [6, 9], [6, 8], [6, 7], [6, 6], [6, 5]]
         },
         {
            color: 0xffa347,
            route: [[5, 13], [5, 14], [5, 15], [6, 15], [7, 15], [7, 14], [7, 13], [6, 13]]
         }
      ];

      this.#movementGhosts = patrols.map(({ color, route }) => {
         const path = route.map(([row, column]) => ({ row, column }));
         const direction = this.#getMovementDirection(path[0], path[1]);
         return {
            color,
            route: path,
            routeIndex: 0,
            trailPositions: [{ ...path[0] }],
            direction,
            container: null,
            body: null,
            trailLayer: null
         };
      });
   }

   #getMovementDirection(from, to) {
      if (to.row < from.row) return 'up';
      if (to.row > from.row) return 'down';
      if (to.column < from.column) return 'left';
      return 'right';
   }

   #positionMovementGhost(ghost) {
      const position = ghost.route[ghost.routeIndex];
      ghost.container.position.set(
         this.#movementOriginX + ((position.column + 0.5) * this.#movementTileSize),
         this.#movementOriginY + ((position.row + 0.5) * this.#movementTileSize)
      );
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

      const nextRow = this.#movementPosition.row + direction.row;
      const nextColumn = this.#movementPosition.column + direction.column;
      const isInsideMap = nextRow >= 0
         && nextRow < this.#movementMap.length
         && nextColumn >= 0
         && nextColumn < this.#movementMap[0].length;

      if (!isInsideMap || this.#movementMap[nextRow][nextColumn] === '#') {
         return;
      }

      this.#movementDirection = direction.name;
      this.#movementPacman.rotation = this.#getDirectionRotation(direction.name);
      this.#movementPosition = { row: nextRow, column: nextColumn };
      this.#movementTrailPositions.push({ ...this.#movementPosition });
      this.#trimMovementTrailPositions();
      this.#movementPacman.position.set(
         this.#movementOriginX + ((nextColumn + 0.5) * this.#movementTileSize),
         this.#movementOriginY + ((nextRow + 0.5) * this.#movementTileSize)
      );
       this.#renderMovementTrail(this.#movementPacmanTrail, this.#movementTrailPositions, 0xffe84d);
    }

   #trimMovementTrailPositions(positions = this.#movementTrailPositions) {
      let remainingLength = 4;

      for (let index = positions.length - 1; index > 0; index--) {
         const newerPosition = positions[index];
         const olderPosition = positions[index - 1];
         const segmentLength = Math.hypot(
            newerPosition.row - olderPosition.row,
            newerPosition.column - olderPosition.column
         );

         if (segmentLength >= remainingLength) {
            positions.splice(0, index - 1);
            return;
         }

         remainingLength -= segmentLength;
      }
   }

   #createMovementTrailSprite() {
      const resolution = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(this.#movementApp.screen.width * resolution);
      canvas.height = Math.ceil(this.#movementApp.screen.height * resolution);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      const texture = Texture.from(canvas, true);
      const sprite = new Sprite(texture);
      sprite.width = this.#movementApp.screen.width;
      sprite.height = this.#movementApp.screen.height;
      this.#movementContent.addChild(sprite);

      return { canvas, context, texture, sprite, resolution };
   }

   #renderMovementTrail(trailLayer, routePositions, color) {
      if (!trailLayer?.context || !trailLayer.canvas || !trailLayer.texture) {
         return;
      }

      const { context, canvas, texture, resolution } = trailLayer;
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (routePositions.length < 2) {
         texture.source.update();
         return;
      }

      const points = routePositions.map(position => ({
         x: this.#movementOriginX + ((position.column + 0.5) * this.#movementTileSize),
         y: this.#movementOriginY + ((position.row + 0.5) * this.#movementTileSize)
      }));
      const visiblePoints = [points[points.length - 1]];
      let remainingLength = this.#movementTileSize * 4;
      let totalLength = 0;

      for (let index = points.length - 1; index > 0 && remainingLength > 0; index--) {
         const newerPoint = points[index];
         const olderPoint = points[index - 1];
         const deltaX = olderPoint.x - newerPoint.x;
         const deltaY = olderPoint.y - newerPoint.y;
         const segmentLength = Math.hypot(deltaX, deltaY);
         const visibleLength = Math.min(segmentLength, remainingLength);
         const ratio = visibleLength / segmentLength;

         visiblePoints.push({
            x: newerPoint.x + deltaX * ratio,
            y: newerPoint.y + deltaY * ratio
         });
         totalLength += visibleLength;
         remainingLength -= visibleLength;
      }

      const segments = [];
      let distanceAtSegmentStart = 0;
      for (let index = 0; index < visiblePoints.length - 1; index++) {
         const start = visiblePoints[index];
         const end = visiblePoints[index + 1];
         const deltaX = end.x - start.x;
         const deltaY = end.y - start.y;
         const length = Math.hypot(deltaX, deltaY);

         segments.push({
            start,
            deltaX,
            deltaY,
            length,
            lengthSquared: length * length,
            distanceAtStart: distanceAtSegmentStart
         });
         distanceAtSegmentStart += length;
      }

      const radius = this.#movementTileSize * 0.34;
      const padding = radius + (1 / resolution);
      const left = Math.max(0, Math.floor((Math.min(...visiblePoints.map(point => point.x)) - padding) * resolution));
      const top = Math.max(0, Math.floor((Math.min(...visiblePoints.map(point => point.y)) - padding) * resolution));
      const right = Math.min(canvas.width, Math.ceil((Math.max(...visiblePoints.map(point => point.x)) + padding) * resolution));
      const bottom = Math.min(canvas.height, Math.ceil((Math.max(...visiblePoints.map(point => point.y)) + padding) * resolution));
      const width = right - left;
      const height = bottom - top;

      if (width <= 0 || height <= 0) {
         texture.source.update();
         return;
      }

      const image = context.createImageData(width, height);
      const pixels = image.data;
      const edgeRadius = radius + (0.5 / resolution);
      const red = (color >> 16) & 0xff;
      const green = (color >> 8) & 0xff;
      const blue = color & 0xff;

      for (let y = 0; y < height; y++) {
         const pointY = (top + y + 0.5) / resolution;
         for (let x = 0; x < width; x++) {
            const pointX = (left + x + 0.5) / resolution;
            let nearestDistance = Infinity;
            let weightedPathDistance = 0;
            let totalWeight = 0;

            for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
               const segment = segments[segmentIndex];
               const relativeX = pointX - segment.start.x;
               const relativeY = pointY - segment.start.y;
               const rawProjection = ((relativeX * segment.deltaX) + (relativeY * segment.deltaY)) / segment.lengthSquared;

                // Give the actor end a flat cap at its center instead of drawing a round cap over the sprite.
               if (segmentIndex === 0 && rawProjection < 0) {
                  continue;
               }

               const projection = Math.max(0, Math.min(1, rawProjection));
               const closestX = segment.start.x + (segment.deltaX * projection);
               const closestY = segment.start.y + (segment.deltaY * projection);
               const distance = Math.hypot(pointX - closestX, pointY - closestY);
               nearestDistance = Math.min(nearestDistance, distance);

               const weight = Math.max(0, edgeRadius - distance);
               if (weight > 0) {
                  const pathDistance = segment.distanceAtStart + (projection * segment.length);
                  weightedPathDistance += pathDistance * weight;
                  totalWeight += weight;
               }
            }

            if (nearestDistance >= edgeRadius || totalWeight === 0) {
               continue;
            }

            const pathDistance = weightedPathDistance / totalWeight;
            const fade = Math.max(0, 1 - (pathDistance / totalLength));
            const coverage = Math.min(1, edgeRadius - nearestDistance);
            const alpha = Math.round(255 * 0.38 * fade * coverage);
            const pixelIndex = ((y * width) + x) * 4;
            pixels[pixelIndex] = red;
            pixels[pixelIndex + 1] = green;
            pixels[pixelIndex + 2] = blue;
            pixels[pixelIndex + 3] = alpha;
         }
      }

      context.putImageData(image, left, top);
      texture.source.update();
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

   #animateMovementPacman(deltaTime) {
      if (!this.#movementPacmanBody) {
         return;
      }

      this.#movementAnimationTime += deltaTime * 0.08;
      const mouthOpening = 0.08 + ((Math.sin(this.#movementAnimationTime) + 1) / 2) * 0.52;
      this.#drawPacmanBody(this.#movementPacmanBody, this.#movementPacmanRadius, mouthOpening);
   }

     #drawMovementWall(layer, wall, tileSize, originX, originY) {
        const x = originX + wall.column * tileSize;
        const y = originY + wall.row * tileSize;
        const inset = 1;
       const left = x + inset;
       const top = y + inset;
       const right = x + tileSize - inset;
       const bottom = y + tileSize - inset;
       const cornerRadius = Math.min(16, tileSize * 0.33);
       const innerCornerRadius = 8;
       const innerCornerLineTrim = innerCornerRadius - (2 * inset);
       const innerCurveControl = innerCornerRadius * 0.552;
       const innerCorner = (row, column) => WallTopology.getInnerCorner(this.#movementMap, row, column);
       const topLeftCorner = innerCorner(wall.row, wall.column);
       const topRightCorner = innerCorner(wall.row, wall.column + 1);
       const bottomLeftCorner = innerCorner(wall.row + 1, wall.column);
       const bottomRightCorner = innerCorner(wall.row + 1, wall.column + 1);
       const topLeftInner = topLeftCorner === 'topLeft';
       const topRightInner = topRightCorner === 'topRight';
       const bottomLeftInner = bottomLeftCorner === 'bottomLeft';
       const bottomRightInner = bottomRightCorner === 'bottomRight';

        if (wall.exposedTop) {
           layer
              .moveTo(left + (wall.exposedLeft ? cornerRadius : (topLeftCorner ? innerCornerLineTrim : 0)), top)
              .lineTo(right - (wall.exposedRight ? cornerRadius : (topRightCorner ? innerCornerLineTrim : 0)), top);
        }
        if (wall.exposedRight) {
           layer
              .moveTo(right, top + (wall.exposedTop ? cornerRadius : (topRightCorner ? innerCornerLineTrim : 0)))
              .lineTo(right, bottom - (wall.exposedBottom ? cornerRadius : (bottomRightCorner ? innerCornerLineTrim : 0)));
        }
        if (wall.exposedBottom) {
           layer
              .moveTo(right - (wall.exposedRight ? cornerRadius : (bottomRightCorner ? innerCornerLineTrim : 0)), bottom)
              .lineTo(left + (wall.exposedLeft ? cornerRadius : (bottomLeftCorner ? innerCornerLineTrim : 0)), bottom);
        }
        if (wall.exposedLeft) {
           layer
              .moveTo(left, bottom - (wall.exposedBottom ? cornerRadius : (bottomLeftCorner ? innerCornerLineTrim : 0)))
              .lineTo(left, top + (wall.exposedTop ? cornerRadius : (topLeftCorner ? innerCornerLineTrim : 0)));
        }

       if (wall.exposedTop && wall.exposedLeft) {
          layer
             .moveTo(left + cornerRadius, top)
             .arcTo(left, top, left, top + cornerRadius, cornerRadius);
       }
       if (wall.exposedTop && wall.exposedRight) {
          layer
             .moveTo(right - cornerRadius, top)
             .arcTo(right, top, right, top + cornerRadius, cornerRadius);
       }
       if (wall.exposedRight && wall.exposedBottom) {
          layer
             .moveTo(right, bottom - cornerRadius)
             .arcTo(right, bottom, right - cornerRadius, bottom, cornerRadius);
       }
        if (wall.exposedBottom && wall.exposedLeft) {
          layer
             .moveTo(left + cornerRadius, bottom)
             .arcTo(left, bottom, left, bottom - cornerRadius, cornerRadius);
       }

       if (bottomRightInner) {
          layer
             .moveTo(right + innerCornerRadius, bottom)
             .bezierCurveTo(
                right + innerCornerRadius - innerCurveControl,
                bottom,
                right,
                bottom + innerCornerRadius - innerCurveControl,
                right,
                bottom + innerCornerRadius
             );
       }
       if (bottomLeftInner) {
          layer
             .moveTo(left - innerCornerRadius, bottom)
             .bezierCurveTo(
                left - innerCornerRadius + innerCurveControl,
                bottom,
                left,
                bottom + innerCornerRadius - innerCurveControl,
                left,
                bottom + innerCornerRadius
             );
       }
       if (topRightInner) {
          layer
             .moveTo(right, top - innerCornerRadius)
             .bezierCurveTo(
                right,
                top - innerCornerRadius + innerCurveControl,
                right + innerCornerRadius - innerCurveControl,
                top,
                right + innerCornerRadius,
                top
             );
       }
       if (topLeftInner) {
          layer
             .moveTo(left, top - innerCornerRadius)
             .bezierCurveTo(
                left,
                top - innerCornerRadius + innerCurveControl,
                left - innerCornerRadius + innerCurveControl,
                top,
                left - innerCornerRadius,
                top
             );
       }
       layer.stroke({ width: 3, color: 0xb026ff, alpha: 1, cap: 'round', join: 'round' });
    }

    #createMovementPowerPellet(tileSize) {
      const container = new Container();
      const trail = new Graphics();
      const core = new Graphics();
      trail.circle(0, 0, tileSize * 0.34).fill({ color: 0xffffff, alpha: 0.28 });
      core.circle(0, 0, tileSize * 0.2).fill(0xffffff);
      container.addChild(trail, core);
      return { container, trail };
   }

   #createMovementPortal(tileSize) {
      const visual = new Graphics();
      visual.ellipse(0, 0, tileSize * 0.72, tileSize * 0.46).fill({ color: 0x6de7ff, alpha: 0.04 });
      visual.ellipse(0, 0, tileSize * 0.58, tileSize * 0.37).fill({ color: 0x6de7ff, alpha: 0.08 });
      visual.ellipse(0, 0, tileSize * 0.46, tileSize * 0.29).fill({ color: 0x6de7ff, alpha: 0.15 });
      visual.ellipse(0, 0, tileSize * 0.3, tileSize * 0.18).fill(0x6de7ff);
      visual.ellipse(0, 0, tileSize * 0.16, tileSize * 0.08).fill(0x0d1021);
      return visual;
   }

   #animateMovementPowerPellets() {
      if (this.#movementPowerPellets.length === 0) {
         return;
      }

      const pulse = (Math.sin(this.#movementAnimationTime) + 1) / 2;
      this.#movementPowerPellets.forEach(({ trail }) => {
         trail.alpha = 0.2 + pulse * 0.62;
         trail.scale.set(0.74 + pulse * 0.34);
      });
   }

    #animateMovementGhosts(deltaTime) {
       if (this.#movementGhostsPaused || this.#movementGhosts.length === 0) {
          return;
       }

      this.#movementGhostStepTimer += deltaTime;
      if (this.#movementGhostStepTimer < 14) {
         return;
      }
      this.#movementGhostStepTimer %= 14;

      this.#movementGhosts.forEach(ghost => {
         const previousPosition = ghost.route[ghost.routeIndex];
         ghost.routeIndex = (ghost.routeIndex + 1) % ghost.route.length;
         const nextPosition = ghost.route[ghost.routeIndex];
         ghost.direction = this.#getMovementDirection(previousPosition, nextPosition);
         ghost.trailPositions.push({ ...nextPosition });
         this.#trimMovementTrailPositions(ghost.trailPositions);
         this.#positionMovementGhost(ghost);
         this.#drawGhost(
            ghost.body,
            ghost.color,
            'normal',
            ghost.direction,
            this.#movementTileSize * 0.68
         );
         this.#renderMovementTrail(ghost.trailLayer, ghost.trailPositions, ghost.color);
      });
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

   #createGhost(color, state, direction, size = this.#tileSize * 0.68) {
      const visual = new Graphics();
      this.#drawGhost(visual, color, state, direction, size);
      return visual;
   }

   #drawGhost(visual, color, state, direction, size = this.#tileSize * 0.68) {
      visual.clear();
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
