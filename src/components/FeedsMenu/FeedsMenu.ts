import './FeedsMenu.css';
import {
  Feed,
  getPredefinedFeeds,
  getCustomFeeds,
  saveCustomFeed,
  deleteCustomFeed,
} from '../../data/feedStore';
import { getAllVideos } from '../../data/videoStore';

export interface FeedsMenuOptions {
  onFeedChange?: (feed: Feed) => void;
}

export function FeedsMenu(options: FeedsMenuOptions = {}): HTMLDivElement {
  const { onFeedChange } = options;

  let activeFeedId = 'all';
  const container = document.createElement('div');
  container.className = 'feeds-container';

  // --- Trigger button ---
  const btn = document.createElement('button');
  btn.className = 'feeds-btn';
  btn.innerHTML = `
    <span>Feeds</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;

  // --- Dropdown ---
  const dropdown = document.createElement('div');
  dropdown.className = 'feeds-dropdown';

  // --- List view ---
  const listView = document.createElement('div');
  listView.className = 'feeds-list';

  // --- Create form view ---
  const formView = document.createElement('div');
  formView.className = 'feeds-create-form';

  dropdown.append(listView, formView);
  container.append(btn, dropdown);

  // --- Helpers ---
  function getAllChannelNames(): string[] {
    const videos = getAllVideos();
    const names = new Set<string>();
    videos.forEach(v => names.add(v.channelName));
    return Array.from(names).sort();
  }

  function renderList() {
    listView.innerHTML = '';
    formView.classList.remove('visible');

    const predefined = getPredefinedFeeds();
    const custom = getCustomFeeds();

    // Predefined section
    const predLabel = document.createElement('div');
    predLabel.className = 'feeds-section-label';
    predLabel.textContent = 'Predefinidos';
    listView.appendChild(predLabel);

    predefined.forEach(feed => {
      listView.appendChild(createFeedItem(feed, false));
    });

    // Divider
    const div1 = document.createElement('div');
    div1.className = 'feeds-divider';
    listView.appendChild(div1);

    // Custom section
    const customLabel = document.createElement('div');
    customLabel.className = 'feeds-section-label';
    customLabel.textContent = 'Mis Feeds';
    listView.appendChild(customLabel);

    if (custom.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'feed-item';
      empty.style.color = 'var(--text-muted)';
      empty.style.fontSize = '0.82rem';
      empty.style.cursor = 'default';
      empty.textContent = 'Sin feeds personalizados';
      listView.appendChild(empty);
    } else {
      custom.forEach(feed => {
        listView.appendChild(createFeedItem(feed, true));
      });
    }

    // Divider
    const div2 = document.createElement('div');
    div2.className = 'feeds-divider';
    listView.appendChild(div2);

    // Create button
    const createBtn = document.createElement('button');
    createBtn.className = 'feeds-create-btn';
    createBtn.textContent = '+ Crear feed';
    createBtn.addEventListener('click', () => {
      showCreateForm();
    });
    listView.appendChild(createBtn);
  }

  function createFeedItem(feed: Feed, isCustom: boolean): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'feed-item';
    if (feed.id === activeFeedId) {
      item.classList.add('active');
    }

    const name = document.createElement('span');
    name.className = 'feed-item-name';
    name.textContent = feed.name;

    const actions = document.createElement('div');
    actions.className = 'feed-item-actions';

    if (feed.id === activeFeedId) {
      const check = document.createElement('span');
      check.className = 'feed-item-check';
      check.textContent = '\u2713';
      actions.appendChild(check);
    }

    if (isCustom) {
      const delBtn = document.createElement('button');
      delBtn.className = 'feed-item-delete';
      delBtn.textContent = '\u2715';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCustomFeed(feed.id);
        if (activeFeedId === feed.id) {
          activeFeedId = 'all';
          const allFeed = getPredefinedFeeds()[0];
          onFeedChange?.(allFeed);
        }
        renderList();
      });
      actions.appendChild(delBtn);
    }

    item.append(name, actions);

    item.addEventListener('click', () => {
      activeFeedId = feed.id;
      onFeedChange?.(feed);
      closeDropdown();
    });

    return item;
  }

  function showCreateForm() {
    listView.innerHTML = '';

    formView.innerHTML = '';
    formView.classList.add('visible');
    dropdown.classList.add('form-open');

    const title = document.createElement('h4');
    title.textContent = 'Nuevo Feed';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Nombre del feed';

    const kwInput = document.createElement('input');
    kwInput.type = 'text';
    kwInput.placeholder = 'Keywords separados por coma';

    const channelList = document.createElement('div');
    channelList.className = 'feeds-channel-list';

    const allChannels = getAllChannelNames();
    const checkboxes: { name: string; input: HTMLInputElement }[] = [];

    allChannels.forEach(ch => {
      const label = document.createElement('label');
      label.className = 'feeds-channel-option';

      const cb = document.createElement('input');
      cb.type = 'checkbox';

      const span = document.createElement('span');
      span.textContent = ch;

      label.append(cb, span);
      channelList.appendChild(label);
      checkboxes.push({ name: ch, input: cb });
    });

    const formActions = document.createElement('div');
    formActions.className = 'feeds-form-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'feeds-form-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      formView.classList.remove('visible');
      dropdown.classList.remove('form-open');
      renderList();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'feeds-form-save';
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', () => {
      const feedName = nameInput.value.trim();
      if (!feedName) {
        nameInput.style.borderColor = '#d32f2f';
        nameInput.focus();
        return;
      }

      const keywords = kwInput.value
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const selectedChannels = checkboxes
        .filter(c => c.input.checked)
        .map(c => c.name);

      const newFeed: Feed = {
        id: 'custom-' + Date.now(),
        name: feedName,
        keywords,
        channelNames: selectedChannels,
        isPredefined: false,
      };

      saveCustomFeed(newFeed);
      activeFeedId = newFeed.id;
      onFeedChange?.(newFeed);
      formView.classList.remove('visible');
      dropdown.classList.remove('form-open');
      renderList();
      closeDropdown();
    });

    formActions.append(cancelBtn, saveBtn);
    formView.append(title, nameInput, kwInput, channelList, formActions);

    nameInput.focus();
  }

  function openDropdown() {
    renderList();
    dropdown.classList.add('visible');
    btn.classList.add('open');
  }

  function closeDropdown() {
    dropdown.classList.remove('visible');
    dropdown.classList.remove('form-open');
    btn.classList.remove('open');
    formView.classList.remove('visible');
  }

  function toggleDropdown() {
    if (dropdown.classList.contains('visible')) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  // --- Event listeners ---
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    closeDropdown();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  return container;
}
