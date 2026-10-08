const extrasButton = document.querySelector('.buttonMobileMenu');
const extrasMenu = document.getElementById('extrasMenu');
const gameUrl = './game.html?start=1';

document.addEventListener('keydown', event => {
   const isExtrasOpen = extrasButton.getAttribute('aria-expanded') === 'true';
   if (event.code === 'Enter' && !event.repeat && !isExtrasOpen && document.activeElement !== extrasButton && !extrasMenu.contains(document.activeElement)) {
      event.preventDefault();
      window.location.href = gameUrl;
   }
});
