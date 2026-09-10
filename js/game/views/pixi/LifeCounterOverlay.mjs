import { Application, Container, Graphics, Text } from 'pixi.js';


export default class LifeCounterOverlay {

    #mainCanvas = null;
    #app = null;
    #heartContainer = null;
    #pauseIndicator = null;
    #pauseHint = null;
    #scoreLabel = null;
    #lifeCount = 0;
    #score = 0;
    #slotCount = 0;
    #tileWidth = 0;
    #tileHeight = 0;
    #columnNumber = 0;
    #pulseTime = 0;
    #heartScaleX = 1;
    #heartScaleY = 1;
    #heartStartIndex = 2;


    constructor(mainCanvas) {
        this.#mainCanvas = mainCanvas;
        window.addEventListener('pacman-life-count', event => this.#updateFromRequest(event.detail));
        window.addEventListener('resize', () => this.#resizeToMainCanvas());
    }


    async initialize() {
        this.#app = new Application();

        await this.#app.init({
            backgroundAlpha: 0,
            antialias: false,
            autoDensity: true,
            resolution: window.devicePixelRatio
        });

        const overlayCanvas = this.#app.canvas;
        overlayCanvas.style.position = 'fixed';
        overlayCanvas.style.pointerEvents = 'none';
        overlayCanvas.style.zIndex = '10';
        document.body.appendChild(overlayCanvas);

        this.#scoreLabel = document.createElement('span');
        this.#scoreLabel.textContent = 'Score:';
        this.#scoreLabel.style.position = 'fixed';
        this.#scoreLabel.style.pointerEvents = 'none';
        this.#scoreLabel.style.zIndex = '11';
        this.#scoreLabel.style.color = 'white';
        this.#scoreLabel.style.fontFamily = "'Jersey 10', monospace";
        this.#scoreLabel.style.fontWeight = 'normal';
        document.body.appendChild(this.#scoreLabel);

        this.#heartContainer = new Container();
        this.#app.stage.addChild(this.#heartContainer);

        this.#pauseHint = new Text({
            text: 'pulsa enter para pausar',
            style: {
                fill: 0xfff6a8,
                fontFamily: "'Jersey 10', monospace",
                fontSize: 12,
                fontWeight: 'normal'
            }
        });
        this.#pauseHint.anchor.set(0.5);
        this.#app.stage.addChild(this.#pauseHint);

        this.#pauseIndicator = new Container();
        this.#pauseIndicator.visible = false;
        this.#app.stage.addChild(this.#pauseIndicator);
        this.#app.ticker.add(({ deltaTime }) => this.#animateHearts(deltaTime));
        this.#resizeToMainCanvas();
    }


    setPaused(isPaused) {
        if (!this.#pauseIndicator) {
            return;
        }

        this.#pauseIndicator.visible = isPaused;
    }


    #updateFromRequest(detail) {
        if (!this.#app) {
            return;
        }

        this.#lifeCount = detail.lifeCount;
        this.#score = detail.score;
        this.#slotCount = Math.max(this.#slotCount, this.#lifeCount);
        this.#tileWidth = detail.tileWidth;
        this.#tileHeight = detail.tileHeight;
        this.#columnNumber = detail.columnNumber;
        this.#pulseTime = 0;
        this.#resizeToMainCanvas();
        this.#renderHearts();
    }


    #renderHearts() {
        this.#heartContainer.removeChildren().forEach(child => child.destroy());

        const scaleX = this.#getScaleX();
        const scaleY = this.#getScaleY();
        const tileWidth = this.#tileWidth * scaleX;
        const tileHeight = this.#tileHeight * scaleY;
        const pixelSize = Math.max(1, Math.floor(Math.min(tileWidth, tileHeight) / 16));
        const baseHeartWidth = 7 * pixelSize;
        const baseHeartHeight = 6 * pixelSize;
        const heartWidth = baseHeartWidth + 15;
        const heartHeight = baseHeartHeight + 15;
        this.#heartScaleX = heartWidth / baseHeartWidth;
        this.#heartScaleY = heartHeight / baseHeartHeight;
        const startX = (this.#columnNumber - this.#slotCount) * tileWidth;

        const cover = new Graphics();
        cover.rect(startX, 0, this.#slotCount * tileWidth, tileHeight);
        cover.fill(0x000000);
        this.#heartContainer.addChild(cover);

        const scoreCover = new Graphics();
        scoreCover.rect(0, 0, 5 * tileWidth, tileHeight);
        scoreCover.fill(0x000000);
        this.#heartContainer.addChild(scoreCover);

        const scoreFontSize = Math.max(12, Math.floor(tileHeight * 0.5));
        this.#scoreLabel.style.fontSize = `${scoreFontSize}px`;
        this.#scoreLabel.style.lineHeight = `${scoreFontSize}px`;
        this.#positionScoreLabel(tileHeight);
        const scoreY = Math.max(0, (tileHeight - this.#scoreLabel.offsetHeight) / 2);

        this.#pauseHint.style.fontSize = `${Math.max(8, Math.floor(tileHeight * 0.24)) + 8}px`;
        this.#pauseHint.position.set(
            this.#mainCanvas.clientWidth / 2,
            tileHeight / 2
        );

        const score = new Text({
            text: `${this.#score}`,
            style: {
                fill: 0xffffff,
                fontFamily: "'Jersey 10', monospace",
                fontSize: scoreFontSize,
                fontWeight: 'normal'
            }
        });
        score.roundPixels = true;
        score.position.set(
            this.#scoreLabel.offsetWidth + 5,
            scoreY
        );
        this.#heartContainer.addChild(score);

        this.#heartStartIndex = this.#heartContainer.children.length;

        for (let lifeIndex = 0; lifeIndex < this.#lifeCount; lifeIndex++) {
            const heart = this.#createHeart(pixelSize);
            heart.scale.set(this.#heartScaleX, this.#heartScaleY);
            const slotX = (this.#columnNumber - lifeIndex - 1) * tileWidth;
            heart.position.set(slotX + ((tileWidth - heartWidth) / 2), (tileHeight - heartHeight) / 2);
            this.#heartContainer.addChild(heart);
        }

        this.#renderPauseIndicator(tileHeight);
    }


    #renderPauseIndicator(tileHeight) {
        if (!this.#pauseIndicator) {
            return;
        }

        this.#pauseIndicator.removeChildren().forEach(child => child.destroy());

        const canvasWidth = this.#mainCanvas.clientWidth;
        const canvasHeight = this.#mainCanvas.clientHeight;
        const indicatorSize = Math.max(56, Math.min(canvasWidth, canvasHeight) * 0.18);
        const barWidth = Math.max(8, indicatorSize * 0.16);
        const barHeight = indicatorSize * 0.48;

        const panel = new Graphics();
        panel.rect(0, 0, indicatorSize, indicatorSize);
        panel.fill(0x250044, 0.92);
        panel.stroke({ width: 3, color: 0xd8b4ff });

        const pauseSymbol = new Graphics();
        pauseSymbol.rect(indicatorSize * 0.29, (indicatorSize - barHeight) / 2, barWidth, barHeight);
        pauseSymbol.rect(indicatorSize * 0.55, (indicatorSize - barHeight) / 2, barWidth, barHeight);
        pauseSymbol.fill(0xfff6a8);

        this.#pauseIndicator.addChild(panel, pauseSymbol);
        this.#pauseIndicator.position.set(
            (canvasWidth - indicatorSize) / 2,
            tileHeight + ((canvasHeight - tileHeight - indicatorSize) / 2)
        );
    }


    #createHeart(pixelSize) {
        const heart = new Graphics();
        const pattern = [
            '0110110',
            '1111111',
            '1111111',
            '0111110',
            '0011100',
            '0001000'
        ];

        pattern.forEach((row, y) => {
            [...row].forEach((pixel, x) => {
                if (pixel === '1') {
                    heart.rect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            });
        });

        heart.fill(0xe52521);

        const reflection = new Graphics();
        reflection.rect(5 * pixelSize, pixelSize, pixelSize, 2 * pixelSize);
        reflection.fill(0xffffff);
        heart.addChild(reflection);

        return heart;
    }


    #animateHearts(deltaTime) {
        if (!this.#heartContainer || this.#heartContainer.children.length < 2) {
            return;
        }

        this.#pulseTime += deltaTime;
        const pulse = 1 + Math.sin(this.#pulseTime / 5) * 0.04;

        for (let i = this.#heartStartIndex; i < this.#heartContainer.children.length; i++) {
            this.#heartContainer.children[i].scale.set(
                this.#heartScaleX * pulse,
                this.#heartScaleY * pulse
            );
        }
    }


    #resizeToMainCanvas() {
        if (!this.#app) {
            return;
        }

        const canvasRectangle = this.#mainCanvas.getBoundingClientRect();
        this.#app.canvas.style.left = `${canvasRectangle.left}px`;
        this.#app.canvas.style.top = `${canvasRectangle.top}px`;
        this.#app.canvas.style.width = `${canvasRectangle.width}px`;
        this.#app.canvas.style.height = `${canvasRectangle.height}px`;
        this.#app.renderer.resize(canvasRectangle.width, canvasRectangle.height);
        this.#positionScoreLabel();

        if (this.#heartContainer.children.length > 0) {
            this.#renderHearts();
        }
    }


    #positionScoreLabel(tileHeight = this.#tileHeight * this.#getScaleY()) {
        if (!this.#scoreLabel) {
            return;
        }

        const canvasRectangle = this.#mainCanvas.getBoundingClientRect();
        this.#scoreLabel.style.left = `${canvasRectangle.left}px`;
        this.#scoreLabel.style.top = `${canvasRectangle.top + Math.max(0, (tileHeight - this.#scoreLabel.offsetHeight) / 2)}px`;
    }


    #getScaleX() {
        return this.#mainCanvas.clientWidth / this.#mainCanvas.width;
    }


    #getScaleY() {
        return this.#mainCanvas.clientHeight / this.#mainCanvas.height;
    }

}
