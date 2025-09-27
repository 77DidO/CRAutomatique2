import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const defaultState = { id: null, dropup: false };

export default function useHistoryRowMenu() {
  const [openMenu, setOpenMenu] = useState(defaultState);
  const menuRefs = useRef(new Map());

  const registerMenuRef = (id) => (node) => {
    if (node) {
      menuRefs.current.set(id, node);
    } else {
      menuRefs.current.delete(id);
    }
  };

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        event.target.closest('.history-row-menu') ||
        event.target.closest('.history-row-menu-trigger')
      ) {
        return;
      }
      setOpenMenu(defaultState);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useLayoutEffect(() => {
    const menuId = openMenu.id;
    if (!menuId) {
      return;
    }

    const menuElement = menuRefs.current.get(menuId);
    if (!menuElement) {
      return;
    }

    const contentElement = menuElement.querySelector('.history-row-menu__content');
    if (!contentElement) {
      return;
    }

    const rect = contentElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const containerElement =
      menuElement.closest('.surface-card') || menuElement.closest('[data-dropup-container]');
    const containerRect = containerElement?.getBoundingClientRect();
    const bottomLimit = Math.min(viewportHeight, containerRect?.bottom ?? viewportHeight);
    const shouldDropup = rect.bottom > bottomLimit;

    setOpenMenu((current) => {
      if (current.id !== menuId || current.dropup === shouldDropup) {
        return current;
      }
      return { ...current, dropup: shouldDropup };
    });
  }, [openMenu.id]);

  const toggleMenu = (id) => {
    setOpenMenu((current) => (current.id === id ? defaultState : { id, dropup: false }));
  };

  const closeMenu = () => setOpenMenu(defaultState);

  return {
    openMenu,
    registerMenuRef,
    toggleMenu,
    closeMenu,
    isMenuOpen: (id) => openMenu.id === id,
    isDropup: (id) => openMenu.id === id && openMenu.dropup,
  };
}
