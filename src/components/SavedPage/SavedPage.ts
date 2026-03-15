import './SavedPage.css';
import {
  DEFAULT_SAVED_LIST_ID,
  createSavedList,
  deleteSavedList,
  getSavedLists,
  renameSavedList,
} from '../../data/savedStore';
import { getVideoById } from '../../data/videoStore';
import { navigate } from '../../router/router';
import menuIcon from '../../assets/menu.svg';

function formatUpdatedAgo(dateIso: string): string {
  const then = new Date(dateIso).getTime();
  if (!Number.isFinite(then)) return 'Se actualizo recientemente';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'Se actualizo hace un momento';
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `Se actualizo hace ${m} minuto${m > 1 ? 's' : ''}`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `Se actualizo hace ${h} hora${h > 1 ? 's' : ''}`;
  }
  const d = Math.floor(diffSec / 86400);
  return `Se actualizo hace ${d} dia${d > 1 ? 's' : ''}`;
}

function grayGradientById(value: string): string {
  const gradients = [
    'linear-gradient(135deg, #4e4e4e 0%, #2b2b2b 100%)',
    'linear-gradient(135deg, #5a5a5a 0%, #353535 100%)',
    'linear-gradient(135deg, #666666 0%, #3e3e3e 100%)',
    'linear-gradient(135deg, #787878 0%, #4a4a4a 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getOrderedVideoIdsForList(listId: string, videoIds: string[]): string[] {
  const key = `vilo_queue_order:${listId}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return [...videoIds];

  try {
    const orderedIds = JSON.parse(raw) as unknown;
    if (!Array.isArray(orderedIds)) return [...videoIds];

    const existing = new Set(videoIds);
    const ordered: string[] = [];

    orderedIds.forEach((id) => {
      if (typeof id !== 'string') return;
      if (!existing.has(id)) return;
      ordered.push(id);
      existing.delete(id);
    });

    videoIds.forEach((id) => {
      if (existing.has(id)) ordered.push(id);
    });

    return ordered.length ? ordered : [...videoIds];
  } catch {
    return [...videoIds];
  }
}

export function SavedPage(): HTMLDivElement {
  const page = document.createElement('div');
  page.className = 'saved-page';

  const header = document.createElement('div');
  header.className = 'saved-header';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'saved-search-wrap';

  const searchInput = document.createElement('input');
  searchInput.className = 'saved-search-input';
  searchInput.type = 'search';
  searchInput.placeholder = 'Buscar listas';
  searchInput.setAttribute('aria-label', 'Buscar listas');

  const createListBtn = document.createElement('button');
  createListBtn.className = 'saved-create-list-btn';
  createListBtn.textContent = 'Nueva lista';

  searchWrap.appendChild(searchInput);
  header.append(searchWrap, createListBtn);

  const playlistsGrid = document.createElement('div');
  playlistsGrid.className = 'saved-playlists-grid';
  page.append(header, playlistsGrid);

  let selectedListId = DEFAULT_SAVED_LIST_ID;
  let searchTerm = '';
  let openOptionsListId: string | null = null;

  function render() {
    const lists = getSavedLists();
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const visibleLists = normalizedSearch
      ? lists.filter((list) => list.name.toLowerCase().includes(normalizedSearch))
      : lists;

    if (!lists.some((list) => list.id === selectedListId)) {
      selectedListId = lists[0]?.id || DEFAULT_SAVED_LIST_ID;
    }

    playlistsGrid.innerHTML = '';

    if (lists.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'saved-empty';
      empty.textContent = 'Aun no tienes listas de guardados.';
      playlistsGrid.appendChild(empty);
      return;
    }

    if (visibleLists.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'saved-empty';
      empty.textContent = 'No hay listas que coincidan con tu busqueda.';
      playlistsGrid.appendChild(empty);
      return;
    }

    visibleLists.forEach((list) => {
      const item = document.createElement('article');
      item.className = 'saved-playlist-card' + (list.id === selectedListId ? ' active' : '');

      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'saved-playlist-thumb';
      thumb.setAttribute('aria-label', `Abrir playlist ${list.name}`);
      thumb.addEventListener('click', () => {
        const orderedVideoIds = getOrderedVideoIdsForList(list.id, list.videoIds);
        const firstPlayableVideoId = orderedVideoIds.find((videoId) => !!getVideoById(videoId));
        if (!firstPlayableVideoId) {
          selectedListId = list.id;
          openOptionsListId = null;
          render();
          return;
        }
        navigate(`/watch/${firstPlayableVideoId}/playlist/${list.id}`);
      });

      const baseGrayGradient = grayGradientById(list.id);

      const stack = document.createElement('div');
      stack.className = 'saved-playlist-stack';

      const createLayer = (className: string): HTMLDivElement => {
        const layer = document.createElement('div');
        layer.className = className;
        layer.style.background = baseGrayGradient;
        return layer;
      };

      const backLayer2 = createLayer('saved-playlist-layer saved-playlist-layer--back-2');
      const backLayer1 = createLayer('saved-playlist-layer saved-playlist-layer--back-1');
      const frontLayer = createLayer('saved-playlist-layer saved-playlist-layer--front');
      stack.append(backLayer2, backLayer1, frontLayer);
      thumb.appendChild(stack);

      const overlay = document.createElement('div');
      overlay.className = 'saved-playlist-overlay';
      const overlayRow = document.createElement('div');
      overlayRow.className = 'saved-playlist-overlay-row';

      const overlayName = document.createElement('span');
      overlayName.className = 'saved-playlist-overlay-name';
      overlayName.textContent = list.name;

      const count = document.createElement('span');
      count.className = 'saved-playlist-count';
      count.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6h12v2H4V6zm0 5h12v2H4v-2zm0 5h8v2H4v-2zm12-1 4 3v-6l-4 3z"/>
        </svg>
        ${list.videoIds.length} videos
      `;
      overlayRow.append(overlayName, count);
      overlay.appendChild(overlayRow);
      thumb.appendChild(overlay);

      const hoverPlay = document.createElement('div');
      hoverPlay.className = 'saved-playlist-hover-play';
      hoverPlay.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
      thumb.appendChild(hoverPlay);

      const info = document.createElement('div');
      info.className = 'saved-playlist-info';

      const meta = document.createElement('p');
      meta.className = 'saved-playlist-meta';
      meta.textContent = 'Privado - Playlist';

      const updated = document.createElement('p');
      updated.className = 'saved-playlist-updated';
      updated.textContent = formatUpdatedAgo(list.updatedAt);

      info.append(meta, updated);
      item.append(thumb, info);

      const options = document.createElement('div');
      options.className = 'saved-playlist-options';

      const optionsBtn = document.createElement('button');
      optionsBtn.type = 'button';
      optionsBtn.className = 'saved-playlist-options-btn' + (openOptionsListId === list.id ? ' is-open' : '');
      optionsBtn.setAttribute('aria-label', `Opciones de la lista ${list.name}`);

      const optionsIcon = document.createElement('span');
      optionsIcon.className = 'saved-playlist-options-icon';
      optionsIcon.style.setProperty('--menu-icon', `url("${menuIcon}")`);
      optionsBtn.appendChild(optionsIcon);

      const optionsMenu = document.createElement('div');
      optionsMenu.className = 'saved-playlist-options-menu' + (openOptionsListId === list.id ? ' open' : '');

      const addThumbOption = document.createElement('button');
      addThumbOption.type = 'button';
      addThumbOption.className = 'saved-playlist-options-item';
      addThumbOption.textContent = 'Agregar miniatura';
      addThumbOption.addEventListener('click', (event) => {
        event.stopPropagation();
        openOptionsListId = null;
        window.alert('Agregar miniatura estara disponible pronto.');
        render();
      });

      const renameOption = document.createElement('button');
      renameOption.type = 'button';
      renameOption.className = 'saved-playlist-options-item';
      renameOption.textContent = 'Renombrar';
      renameOption.addEventListener('click', (event) => {
        event.stopPropagation();
        const nextName = window.prompt('Nuevo nombre de la lista', list.name)?.trim() || '';
        if (!nextName) {
          openOptionsListId = null;
          render();
          return;
        }

        const renamed = renameSavedList(list.id, nextName);
        openOptionsListId = null;
        if (!renamed) {
          window.alert('No se pudo renombrar la lista. Verifica que el nombre no este repetido.');
        }
        render();
      });

      const deleteOption = document.createElement('button');
      deleteOption.type = 'button';
      deleteOption.className = 'saved-playlist-options-item';
      deleteOption.textContent = 'Eliminar';
      deleteOption.disabled = list.id === DEFAULT_SAVED_LIST_ID;
      deleteOption.addEventListener('click', (event) => {
        event.stopPropagation();
        if (list.id === DEFAULT_SAVED_LIST_ID) return;
        const ok = window.confirm(`Eliminar la lista "${list.name}"?`);
        openOptionsListId = null;
        if (!ok) {
          render();
          return;
        }
        deleteSavedList(list.id);
        if (selectedListId === list.id) {
          selectedListId = DEFAULT_SAVED_LIST_ID;
        }
        render();
      });

      optionsMenu.append(addThumbOption, renameOption, deleteOption);

      optionsBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        openOptionsListId = openOptionsListId === list.id ? null : list.id;
        render();
      });

      options.append(optionsBtn, optionsMenu);
      item.appendChild(options);

      playlistsGrid.appendChild(item);
    });
  }

  createListBtn.addEventListener('click', () => {
    const suggested = 'Nueva lista';
    const name = window.prompt('Nombre de la lista', suggested)?.trim() || '';
    if (!name) return;
    const created = createSavedList(name);
    if (!created) return;
    selectedListId = created.id;
    openOptionsListId = null;
    render();
  });

  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value;
    openOptionsListId = null;
    render();
  });

  const closeOptionsOnOutsideClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('.saved-playlist-options')) return;
    if (!openOptionsListId) return;
    openOptionsListId = null;
    render();
  };
  document.addEventListener('click', closeOptionsOnOutsideClick);

  const observer = new MutationObserver(() => {
    if (!document.contains(page)) {
      document.removeEventListener('click', closeOptionsOnOutsideClick);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  render();
  return page;
}
