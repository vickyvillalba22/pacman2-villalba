import { Application, Graphics } from 'pixi.js';

const host = document.getElementById('playIcon');
let cursorAppPromise = null;
let cursorApp = null;
let cursorCanvas = null;
let selectedCursor = null;

if (host) {
   const app = new Application();
   await app.init({
      width: 120,
      height: 120,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: false,
      resolution: 1
   });

   const icon = new Graphics();
   const cellSize = 7;
   const silhouette = [
      [6, 9], [4, 11], [3, 12], [2, 13],
      [1, 14], [1, 14], [0, 15], [0, 15],
      [0, 15], [0, 15], [1, 14], [1, 14],
      [2, 13], [3, 12], [4, 11], [6, 9]
   ];

   function drawSilhouette(offset, color) {
      silhouette.forEach(([start, end], y) => {
         for (let x = start; x <= end; x++) {
            icon.rect(offset + x * cellSize, offset + y * cellSize, cellSize, cellSize)
               .fill({ color });
         }
      });
   }

   drawSilhouette(4, 0x3a0719);
   drawSilhouette(1, 0xa90e3a);
   drawSilhouette(0, 0xf01450);

   const highlight = new Graphics();
   [
      [6, 2], [7, 2], [8, 2], [9, 2],
      [5, 3], [6, 3], [7, 3],
      [4, 4], [5, 4]
   ].forEach(([x, y]) => {
      highlight.rect(x * cellSize, y * cellSize, cellSize, cellSize)
         .fill({ color: 0xff6b94 });
   });

   const playTriangle = new Graphics();
   [
      [8, 5, 1], [8, 6, 2], [8, 7, 3], [8, 8, 4],
      [8, 9, 3], [8, 10, 2], [8, 11, 1]
   ].forEach(([startX, y, width]) => {
      playTriangle.rect(startX * cellSize, y * cellSize, width * cellSize, cellSize)
         .fill({ color: 0x080008 });
   });

   app.stage.addChild(icon, highlight, playTriangle);
   host.appendChild(app.canvas);
}

function drawSelectorArrow(app) {
   const rows = [
      [5, 6], [5, 6], [4, 7], [3, 8], [2, 9], [0, 11],
      [0, 11], [2, 9], [3, 8], [4, 7], [5, 6], [5, 6]
   ];
   const cellSize = 5;
   const shadow = new Graphics();
   const arrow = new Graphics();
   const highlight = new Graphics();

   rows.forEach(([start, end], y) => {
      for (let x = start; x <= end; x++) {
         shadow.rect(5 + x * cellSize, 5 + y * cellSize, cellSize, cellSize)
            .fill({ color: 0x351907 });
         arrow.rect(3 + x * cellSize, 3 + y * cellSize, cellSize, cellSize)
            .fill({ color: 0xffa900 });
      }
   });

   [[5, 4], [6, 4], [5, 5], [6, 5]].forEach(([x, y]) => {
      highlight.rect(3 + x * cellSize, 3 + y * cellSize, cellSize, cellSize)
         .fill({ color: 0xffdf55 });
   });

   app.stage.addChild(shadow, arrow, highlight);
}

async function ensureCursorApp() {
   if (!cursorAppPromise) {
      cursorAppPromise = (async () => {
         const app = new Application();
         await app.init({
            width: 72,
            height: 72,
            backgroundAlpha: 0,
            antialias: false,
            autoDensity: false,
            resolution: 1
         });

         drawSelectorArrow(app);
         cursorApp = app;
         cursorCanvas = app.canvas;
         return app;
      })();
   }

   return cursorAppPromise;
}

document.addEventListener('extras-menu-selection-change', async event => {
   selectedCursor = event.detail.cursor;
   if (!selectedCursor) {
      cursorApp?.ticker.stop();
      cursorCanvas?.remove();
      return;
   }

   const app = await ensureCursorApp();
   if (selectedCursor) {
      selectedCursor.appendChild(cursorCanvas);
      app.ticker.start();
   } else {
      app.ticker.stop();
   }
});

if (window.extrasMenuCursorTarget) {
   document.dispatchEvent(new CustomEvent('extras-menu-selection-change', {
      detail: { cursor: window.extrasMenuCursorTarget }
   }));
}
