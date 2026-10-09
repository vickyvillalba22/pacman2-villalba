import { Application, Assets, Container, Graphics, Sprite, Text } from 'pixi.js';


export default class LifeCounterOverlay {

    #mainCanvas = null;
    #gameFrame = null;
    #gameHud = null;
    #app = null;
    #heartContainer = null;
    #pauseIndicator = null;
    #pauseHint = null;
    #pauseIcon = null;
    #menuButton = null;
    #scoreLabel = null;
    #scoreText = null;
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
        this.#gameFrame = mainCanvas.closest('#gameFrame') || mainCanvas;
        this.#gameHud = this.#gameFrame.querySelector('#gameHud');
        this.#menuButton = document.querySelector('.buttonMobileMenu');
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
        this.#pauseHint.anchor.set(1, 0.5);
        this.#app.stage.addChild(this.#pauseHint);

        this.#pauseIcon = new Sprite(await Assets.load('./assets/imgs/pause-symbol.png'));
        this.#app.stage.addChild(this.#pauseIcon);

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

        const scoreFontSize = Math.max(12, Math.floor(tileHeight * 0.7)) + 15;
        this.#scoreLabel.style.fontSize = `${scoreFontSize}px`;
        this.#scoreLabel.style.lineHeight = `${scoreFontSize}px`;
        const scoreY = Math.max(0, (tileHeight - this.#scoreLabel.offsetHeight) / 2);

        this.#layoutPauseHint(tileHeight);

        const score = new Text({
            text: `${this.#score}`,
            style: {
                fill: 0xffffff,
                fontFamily: "'Jersey 10', monospace",
                fontSize: scoreFontSize,
                fontWeight: 'normal'
            }
        });
        this.#scoreText = score;
        score.roundPixels = true;
        this.#positionScoreLabel(tileHeight);
        score.position.set(
            score.position.x,
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


    #layoutPauseHint(tileHeight = this.#tileHeight * this.#getScaleY()) {
        if (!this.#pauseHint || !this.#pauseIcon) {
            return;
        }

        const canvasWidth = this.#mainCanvas.clientWidth;
        const canvasHeight = this.#mainCanvas.clientHeight;
        const hudHeight = this.#gameHud?.clientHeight || 48;
        const iconSize = 42;
        const rightInset = Math.min(12, Math.max(4, canvasWidth * 0.03));
        const gap = 8;
        const availableTextWidth = Math.max(0, canvasWidth - iconSize - gap - (rightInset * 2));

        this.#pauseIcon.width = iconSize;
        this.#pauseIcon.height = iconSize;
        this.#pauseHint.style.fontSize = `${Math.max(8, Math.floor(tileHeight * 0.24)) + 18}px`;
        this.#pauseHint.scale.set(
            this.#pauseHint.width > 0 ? Math.min(1, availableTextWidth / this.#pauseHint.width) : 1,
            1
        );
        this.#pauseHint.position.set(
            canvasWidth - rightInset - iconSize - gap,
            canvasHeight + (hudHeight / 2)
        );
        this.#pauseIcon.position.set(
            Math.round(canvasWidth - rightInset - iconSize),
            Math.round(canvasHeight + ((hudHeight - iconSize) / 2))
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

        const frameRectangle = this.#gameFrame.getBoundingClientRect();
        this.#app.canvas.style.left = `${frameRectangle.left}px`;
        this.#app.canvas.style.top = `${frameRectangle.top}px`;
        this.#app.canvas.style.width = `${frameRectangle.width}px`;
        this.#app.canvas.style.height = `${frameRectangle.height}px`;
        this.#app.renderer.resize(frameRectangle.width, frameRectangle.height);
        this.#positionScoreLabel();
        this.#positionMenuButton(frameRectangle);
        this.#layoutPauseHint();

        if (this.#heartContainer.children.length > 0) {
            this.#renderHearts();
        }
    }


    #positionScoreLabel(tileHeight = this.#tileHeight * this.#getScaleY()) {
        if (!this.#scoreLabel) {
            return;
        }

        const canvasRectangle = this.#mainCanvas.getBoundingClientRect();
        const scoreWidth = this.#scoreText?.width || 0;
        const totalScoreWidth = this.#scoreLabel.offsetWidth + 5 + scoreWidth;
        const scoreLeft = canvasRectangle.left + ((canvasRectangle.width - totalScoreWidth) / 2);
        this.#scoreLabel.style.left = `${scoreLeft}px`;
        this.#scoreLabel.style.top = `${canvasRectangle.top + Math.max(0, (tileHeight - this.#scoreLabel.offsetHeight) / 2)}px`;

        if (this.#scoreText) {
            this.#scoreText.position.x = ((canvasRectangle.width - totalScoreWidth) / 2) + this.#scoreLabel.offsetWidth + 5;
        }
    }


    #positionMenuButton(canvasRectangle) {
        if (!this.#menuButton) {
            return;
        }

        const menuButtonSize = this.#menuButton.getBoundingClientRect().width;
        const tileHeight = this.#tileHeight > 0
            ? this.#tileHeight * this.#getScaleY()
            : menuButtonSize;
        this.#menuButton.style.setProperty('--menu-left', `${canvasRectangle.left}px`);
        this.#menuButton.style.setProperty('--menu-top', `${canvasRectangle.top + ((tileHeight - menuButtonSize) / 2)}px`);
    }


    #getScaleX() {
        return this.#mainCanvas.clientWidth / this.#mainCanvas.width;
    }


    #getScaleY() {
        return this.#mainCanvas.clientHeight / this.#mainCanvas.height;
    }

}
