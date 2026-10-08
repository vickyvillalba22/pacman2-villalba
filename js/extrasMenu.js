const menuButton = document.querySelector('.buttonMobileMenu');
const backButton = document.querySelector('.extrasBackButton');
const menuBar = menuButton?.closest('.menuBar');
const menu = document.getElementById('extrasMenu');
const menuItems = menu ? [...menu.querySelectorAll('li')].filter(item => item.querySelector('a')) : [];
let selectedIndex = 1;

if (menuButton && menu && menuItems.length) {
   menuItems.forEach(item => {
      const link = item.querySelector('a');
      const cursor = document.createElement('span');
      cursor.className = 'menuCursor';
      cursor.setAttribute('aria-hidden', 'true');
      link.prepend(cursor);
   });

   function selectItem(index, shouldFocus = false) {
      selectedIndex = Math.max(0, Math.min(index, menuItems.length));
      const isBackSelected = selectedIndex === 0;
      backButton?.classList.toggle('is-selected', isBackSelected);

      menuItems.forEach((item, itemIndex) => {
         const isSelected = itemIndex === selectedIndex - 1;
         item.classList.toggle('is-selected', isSelected);
         if (isSelected) {
            item.querySelector('a').setAttribute('aria-current', 'true');
         } else {
            item.querySelector('a').removeAttribute('aria-current');
         }
      });

      const selectedCursor = isBackSelected
         ? null
         : menuItems[selectedIndex - 1].querySelector('.menuCursor');
      window.extrasMenuCursorTarget = selectedCursor;
      document.dispatchEvent(new CustomEvent('extras-menu-selection-change', {
         detail: { cursor: selectedCursor }
      }));

      if (shouldFocus) {
         if (isBackSelected) {
            backButton?.focus();
         } else {
            menuItems[selectedIndex - 1].querySelector('a').focus();
         }
      }
   }

   function setMenuOpen(isOpen) {
      menuButton.classList.toggle('extrasMenuVisible', isOpen);
      menuBar?.classList.toggle('extrasMenuOpen', isOpen);
      menuButton.setAttribute('aria-expanded', String(isOpen));
      document.dispatchEvent(new CustomEvent('extras-menu-state-change', {
         detail: { isOpen }
      }));

      if (isOpen) {
         const resumeIndex = menuItems.findIndex(item => item.dataset.menuAction === 'resume');
         const currentIndex = menuItems.findIndex(item => item.classList.contains('currentSite'));
         selectItem(resumeIndex >= 0 ? resumeIndex + 1 : currentIndex >= 0 ? currentIndex + 1 : 1, true);
      } else {
         window.extrasMenuCursorTarget = null;
         document.dispatchEvent(new CustomEvent('extras-menu-selection-change', {
            detail: { cursor: null }
         }));
         menuButton.focus();
      }
   }

   menuButton.addEventListener('click', () => {
      setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
   });

   backButton?.addEventListener('click', () => {
      if (menuButton.getAttribute('aria-expanded') === 'true') {
         setMenuOpen(false);
      }
   });

   backButton?.addEventListener('pointerenter', () => selectItem(0));

   menu.addEventListener('pointerover', event => {
      const item = event.target.closest('li');
      const itemIndex = menuItems.indexOf(item);
      if (itemIndex >= 0 && itemIndex + 1 !== selectedIndex) {
         selectItem(itemIndex + 1);
      }
   });

   document.addEventListener('keydown', event => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      if (!isOpen) {
         return;
      }

      if (event.code === 'ArrowDown') {
         event.preventDefault();
         selectItem(selectedIndex + 1, true);
      } else if (event.code === 'ArrowUp') {
         event.preventDefault();
         selectItem(selectedIndex - 1, true);
      } else if (event.code === 'Enter') {
         event.preventDefault();
         if (selectedIndex === 0) {
            backButton?.click();
         } else {
            menuItems[selectedIndex - 1].querySelector('a').click();
         }
      } else if (event.code === 'Escape') {
         event.preventDefault();
         setMenuOpen(false);
      }
   });
}
