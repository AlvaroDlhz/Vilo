import './UploadPage.css';
import { getAuthState } from '../../data/authStore';
import { uploadWithProgress } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { notifySubscribersNewVideo } from '../../lib/notifications';
import { navigate } from '../../router/router';
import { captureRandomFrameAsFile } from '../../utils/videoThumbnail';

const CATEGORIES = [
  '', 'Entretenimiento', 'Educacion', 'Ciencia y tecnologia', 'Deportes',
  'Musica', 'Gaming', 'Noticias', 'Peliculas', 'Comedia', 'Cocina',
  'Viajes', 'Moda', 'Fitness', 'Arte', 'Negocios', 'Otro',
];

const LANGUAGES = [
  '', 'Espanol', 'English', 'Frances', 'Deutsch', 'Portugues',
  'Italiano', 'Japones', 'Coreano', 'Chino', 'Arabe', 'Hindi', 'Otro',
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Publico' },
  { value: 'unlisted', label: 'No listado' },
  { value: 'private', label: 'Privado' },
  { value: 'sponsors', label: 'Solo para patrocinadores' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'kids', label: 'Ninos' },
];

const LICENSE_OPTIONS = [
  { value: 'standard', label: 'Licencia estandar' },
  { value: 'cc', label: 'Creative Commons - Atribucion' },
];

interface DescriptionTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

const TEMPLATE_STORAGE_KEY = 'upload-description-templates-v1';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fillSelect(
  select: HTMLSelectElement,
  options: { value: string; label: string }[],
  defaultValue: string
): void {
  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === defaultValue) option.selected = true;
    select.appendChild(option);
  });
}

function fromStringList(values: string[], placeholder: string): { value: string; label: string }[] {
  return values.map((value) => ({
    value,
    label: value || placeholder,
  }));
}

function loadDescriptionTemplates(): DescriptionTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DescriptionTemplate[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => (
      typeof item.id === 'string'
      && typeof item.name === 'string'
      && typeof item.content === 'string'
      && typeof item.createdAt === 'string'
    ));
  } catch {
    return [];
  }
}

function saveDescriptionTemplates(templates: DescriptionTemplate[]) {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

type MediaType = 'video' | 'thumbnail';

export function UploadPage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'upload-page';

  let videoFile: File | null = null;
  let thumbnailFile: File | null = null;
  let videoPreviewUrl: string | null = null;
  let thumbnailPreviewUrl: string | null = null;
  let activeMedia: MediaType = 'video';
  let tags: string[] = [];
  let collaborators: string[] = [];
  let isPublishing = false;

  let publishBtn: HTMLButtonElement;
  let videoProgressFill: HTMLElement;
  let videoProgressLabel: HTMLElement;
  let thumbProgressFill: HTMLElement;
  let thumbProgressLabel: HTMLElement;
  let progressSection: HTMLElement;
  let titleInput: HTMLInputElement;
  let descriptionInput: HTMLTextAreaElement;
  let mediaStage: HTMLDivElement;
  let mediaMetaName: HTMLDivElement;
  let mediaMetaStats: HTMLDivElement;
  let videoTabBtn: HTMLButtonElement;
  let thumbTabBtn: HTMLButtonElement;

  const videoInput = document.createElement('input');
  videoInput.type = 'file';
  videoInput.accept = 'video/*';
  videoInput.style.display = 'none';

  const thumbnailInput = document.createElement('input');
  thumbnailInput.type = 'file';
  thumbnailInput.accept = 'image/*';
  thumbnailInput.style.display = 'none';

  videoInput.addEventListener('change', () => {
    const file = videoInput.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
    }
  });

  thumbnailInput.addEventListener('change', () => {
    const file = thumbnailInput.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnailFile(file);
    }
  });

  page.append(videoInput, thumbnailInput);

  const form = document.createElement('div');
  form.className = 'upload-form';
  page.appendChild(form);

  function cleanupPreviewUrls() {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      videoPreviewUrl = null;
    }
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
      thumbnailPreviewUrl = null;
    }
  }

  function setVideoFile(file: File) {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    videoFile = file;
    videoPreviewUrl = URL.createObjectURL(file);
    activeMedia = 'video';
    renderMediaStage();
  }

  function setThumbnailFile(file: File) {
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    thumbnailFile = file;
    thumbnailPreviewUrl = URL.createObjectURL(file);
    activeMedia = 'thumbnail';
    renderMediaStage();
  }

  function openPicker(type: MediaType) {
    if (type === 'video') {
      videoInput.click();
      return;
    }
    thumbnailInput.click();
  }

  function buildMediaDropzone(type: MediaType): HTMLDivElement {
    const dropzone = document.createElement('div');
    dropzone.className = 'upload-media-dropzone';
    dropzone.innerHTML = `
      <div class="upload-media-dropzone-icon">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p class="upload-media-dropzone-text"><strong>Arrastra ${type === 'video' ? 'un video' : 'una miniatura'}</strong> o haz clic para seleccionar</p>
      <span class="upload-media-dropzone-hint">${type === 'video' ? 'MP4, WebM, MOV - maximo 10 GB' : 'JPG, PNG, WebP'}</span>
    `;

    dropzone.addEventListener('click', () => openPicker(type));
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      if (type === 'video' && file.type.startsWith('video/')) {
        setVideoFile(file);
      }
      if (type === 'thumbnail' && file.type.startsWith('image/')) {
        setThumbnailFile(file);
      }
    });

    return dropzone;
  }

  function renderMediaStage() {
    if (!mediaStage || !mediaMetaName || !mediaMetaStats || !videoTabBtn || !thumbTabBtn) return;

    mediaStage.innerHTML = '';
    videoTabBtn.classList.toggle('active', activeMedia === 'video');
    thumbTabBtn.classList.toggle('active', activeMedia === 'thumbnail');

    if (activeMedia === 'video') {
      if (!videoFile || !videoPreviewUrl) {
        mediaStage.appendChild(buildMediaDropzone('video'));
        mediaMetaName.textContent = 'Sin video seleccionado';
        mediaMetaStats.textContent = 'Selecciona un archivo para continuar';
      } else {
        const video = document.createElement('video');
        video.className = 'upload-editor-video';
        video.src = videoPreviewUrl;
        video.controls = true;
        video.preload = 'metadata';
        mediaStage.appendChild(video);
        mediaMetaName.textContent = videoFile.name;
        mediaMetaStats.textContent = `${formatFileSize(videoFile.size)} - ${videoFile.type}`;
      }
    } else {
      if (!thumbnailFile || !thumbnailPreviewUrl) {
        mediaStage.appendChild(buildMediaDropzone('thumbnail'));
        mediaMetaName.textContent = 'Sin miniatura seleccionada';
        mediaMetaStats.textContent = 'Opcional: puedes generar una automaticamente';
      } else {
        const image = document.createElement('img');
        image.className = 'upload-editor-thumbnail';
        image.src = thumbnailPreviewUrl;
        image.alt = 'Miniatura seleccionada';
        mediaStage.appendChild(image);
        mediaMetaName.textContent = thumbnailFile.name;
        mediaMetaStats.textContent = `${formatFileSize(thumbnailFile.size)} - ${thumbnailFile.type}`;
      }
    }

    updatePublishState();
  }

  function buildForm() {
    form.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'upload-editor-header';

    const headerSpacer = document.createElement('div');
    headerSpacer.className = 'upload-editor-header-spacer';

    const headerActions = document.createElement('div');
    headerActions.className = 'upload-editor-header-actions';

    publishBtn = document.createElement('button');
    publishBtn.className = 'upload-publish-btn upload-publish-btn--header';
    publishBtn.textContent = 'Publicar';
    publishBtn.disabled = true;
    publishBtn.addEventListener('click', handlePublish);

    progressSection = document.createElement('div');
    progressSection.className = 'upload-progress-section upload-progress-section--header';
    progressSection.style.display = 'none';

    const videoProgress = document.createElement('div');
    videoProgress.className = 'upload-progress-item';
    videoProgressLabel = document.createElement('div');
    videoProgressLabel.className = 'upload-progress-label';
    videoProgressLabel.innerHTML = '<span>Video</span><span>0%</span>';
    const videoProgressBar = document.createElement('div');
    videoProgressBar.className = 'upload-progress-bar';
    videoProgressFill = document.createElement('div');
    videoProgressFill.className = 'upload-progress-fill';
    videoProgressBar.appendChild(videoProgressFill);
    videoProgress.append(videoProgressLabel, videoProgressBar);

    const thumbProgress = document.createElement('div');
    thumbProgress.className = 'upload-progress-item';
    thumbProgressLabel = document.createElement('div');
    thumbProgressLabel.className = 'upload-progress-label';
    thumbProgressLabel.innerHTML = '<span>Miniatura</span><span>0%</span>';
    const thumbProgressBar = document.createElement('div');
    thumbProgressBar.className = 'upload-progress-bar';
    thumbProgressFill = document.createElement('div');
    thumbProgressFill.className = 'upload-progress-fill';
    thumbProgressBar.appendChild(thumbProgressFill);
    thumbProgress.append(thumbProgressLabel, thumbProgressBar);

    progressSection.append(videoProgress, thumbProgress);
    headerActions.append(publishBtn, progressSection);
    header.append(headerSpacer, headerActions);

    const editor = document.createElement('div');
    editor.className = 'upload-editor-layout';

    const primary = document.createElement('div');
    primary.className = 'upload-editor-primary';

    const side = document.createElement('aside');
    side.className = 'upload-editor-side';

    const playerCard = document.createElement('div');
    playerCard.className = 'upload-editor-player';

    const mediaTabs = document.createElement('div');
    mediaTabs.className = 'upload-media-tabs';
    videoTabBtn = document.createElement('button');
    videoTabBtn.type = 'button';
    videoTabBtn.className = 'upload-media-tab';
    videoTabBtn.textContent = 'Video';
    videoTabBtn.addEventListener('click', () => {
      activeMedia = 'video';
      renderMediaStage();
    });

    thumbTabBtn = document.createElement('button');
    thumbTabBtn.type = 'button';
    thumbTabBtn.className = 'upload-media-tab';
    thumbTabBtn.textContent = 'Miniatura';
    thumbTabBtn.addEventListener('click', () => {
      activeMedia = 'thumbnail';
      renderMediaStage();
    });
    mediaTabs.append(videoTabBtn, thumbTabBtn);

    mediaStage = document.createElement('div');
    mediaStage.className = 'upload-media-stage';

    const fileBar = document.createElement('div');
    fileBar.className = 'upload-editor-filebar';
    const fileMeta = document.createElement('div');
    fileMeta.className = 'upload-editor-filemeta';
    mediaMetaName = document.createElement('div');
    mediaMetaName.className = 'upload-editor-filename';
    mediaMetaStats = document.createElement('div');
    mediaMetaStats.className = 'upload-editor-filestats';
    fileMeta.append(mediaMetaName, mediaMetaStats);
    fileBar.appendChild(fileMeta);

    playerCard.append(mediaTabs, mediaStage, fileBar);
    primary.appendChild(playerCard);

    const infoCard = document.createElement('div');
    infoCard.className = 'upload-editor-info';

    titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'upload-inline-title';
    titleInput.placeholder = 'Agrega un titulo descriptivo';
    titleInput.maxLength = 100;
    titleInput.addEventListener('input', updatePublishState);

    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'upload-inline-block';
    const tagsLabel = document.createElement('span');
    tagsLabel.className = 'upload-inline-label';
    tagsLabel.textContent = 'Etiquetas';
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'upload-tags-container';
    const tagsInput = document.createElement('input');
    tagsInput.className = 'upload-tags-input';
    tagsInput.placeholder = 'Escribe y presiona Enter';
    tagsContainer.appendChild(tagsInput);

    tagsContainer.addEventListener('click', () => tagsInput.focus());
    tagsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const value = tagsInput.value.trim().replace(/,/g, '');
        if (value && !tags.includes(value)) {
          tags.push(value);
          renderTags(tagsContainer, tagsInput, tags);
        }
        tagsInput.value = '';
      }
      if (e.key === 'Backspace' && !tagsInput.value && tags.length > 0) {
        tags.pop();
        renderTags(tagsContainer, tagsInput, tags);
      }
    });

    tagsWrap.append(tagsLabel, tagsContainer);

    const configTitle = document.createElement('h3');
    configTitle.className = 'upload-inline-config-title';
    configTitle.textContent = 'Configuracion';

    const configGrid = document.createElement('div');
    configGrid.className = 'upload-inline-config-grid';

    const visibilityField = createField('Visibilidad');
    const visSelect = document.createElement('select');
    fillSelect(visSelect, VISIBILITY_OPTIONS, 'public');
    visibilityField.appendChild(visSelect);
    configGrid.appendChild(visibilityField);

    const catField = createField('Categoria');
    const catSelect = document.createElement('select');
    fillSelect(catSelect, fromStringList(CATEGORIES, 'Selecciona una categoria'), '');
    catField.appendChild(catSelect);
    configGrid.appendChild(catField);

    const audienceField = createField('Audiencia');
    const audienceSelect = document.createElement('select');
    fillSelect(audienceSelect, AUDIENCE_OPTIONS, 'all');
    audienceField.appendChild(audienceSelect);
    configGrid.appendChild(audienceField);

    const licenseField = createField('Licencia');
    const licenseSelect = document.createElement('select');
    fillSelect(licenseSelect, LICENSE_OPTIONS, 'standard');
    licenseField.appendChild(licenseSelect);
    configGrid.appendChild(licenseField);

    const languageField = createField('Idioma');
    const languageSelect = document.createElement('select');
    fillSelect(languageSelect, fromStringList(LANGUAGES, 'Selecciona un idioma'), '');
    languageField.appendChild(languageSelect);
    configGrid.appendChild(languageField);

    const locationField = createField('Ubicacion');
    const locationInput = document.createElement('input');
    locationInput.type = 'text';
    locationInput.placeholder = 'Ej. Madrid, Espana';
    locationField.appendChild(locationInput);
    configGrid.appendChild(locationField);

    const commentsField = document.createElement('label');
    commentsField.className = 'upload-toggle';
    const commentsCheck = document.createElement('input');
    commentsCheck.type = 'checkbox';
    commentsCheck.checked = true;
    const commentsText = document.createElement('span');
    commentsText.textContent = 'Comentarios habilitados';
    commentsField.append(commentsCheck, commentsText);
    configGrid.appendChild(commentsField);

    const collabField = createField('Colaboradores');
    const collabContainer = document.createElement('div');
    collabContainer.className = 'upload-tags-container';
    const collabInput = document.createElement('input');
    collabInput.className = 'upload-tags-input';
    collabInput.placeholder = 'Escribe y presiona Enter';
    collabContainer.appendChild(collabInput);
    collabContainer.addEventListener('click', () => collabInput.focus());
    collabInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const value = collabInput.value.trim().replace(/,/g, '');
        if (value && !collaborators.includes(value)) {
          collaborators.push(value);
          renderTags(collabContainer, collabInput, collaborators);
        }
        collabInput.value = '';
      }
      if (e.key === 'Backspace' && !collabInput.value && collaborators.length > 0) {
        collaborators.pop();
        renderTags(collabContainer, collabInput, collaborators);
      }
    });
    collabField.appendChild(collabContainer);
    configGrid.appendChild(collabField);

    const subtitleField = createField('Subtitulos');
    const subtitleInput = document.createElement('input');
    subtitleInput.type = 'file';
    subtitleInput.accept = '.srt,.vtt';
    subtitleField.appendChild(subtitleInput);
    configGrid.appendChild(subtitleField);

    const subtitleLangField = createField('Idioma subtitulos');
    const subtitleLangSelect = document.createElement('select');
    fillSelect(subtitleLangSelect, fromStringList(LANGUAGES, 'Selecciona un idioma'), '');
    subtitleLangField.appendChild(subtitleLangSelect);
    configGrid.appendChild(subtitleLangField);

    infoCard.append(titleInput, tagsWrap, configTitle, configGrid);
    primary.appendChild(infoCard);

    const descriptionCard = document.createElement('div');
    descriptionCard.className = 'upload-description-card';

    const descriptionTitle = document.createElement('h2');
    descriptionTitle.className = 'upload-description-title';
    descriptionTitle.textContent = 'Editor de descripcion';

    const tabsRow = document.createElement('div');
    tabsRow.className = 'upload-description-tabs-row';

    const tabBar = document.createElement('div');
    tabBar.className = 'upload-description-tabs';

    const tabWrite = document.createElement('button');
    tabWrite.type = 'button';
    tabWrite.className = 'upload-description-tab active';
    tabWrite.textContent = 'Escribir';
    tabWrite.dataset.tab = 'write';

    const tabTemplates = document.createElement('button');
    tabTemplates.type = 'button';
    tabTemplates.className = 'upload-description-tab';
    tabTemplates.textContent = 'Plantillas';
    tabTemplates.dataset.tab = 'templates';

    const tabPreview = document.createElement('button');
    tabPreview.type = 'button';
    tabPreview.className = 'upload-description-tab';
    tabPreview.textContent = 'Preview';
    tabPreview.dataset.tab = 'preview';

    tabBar.append(tabWrite, tabTemplates, tabPreview);

    const tabActions = document.createElement('div');
    tabActions.className = 'upload-description-tab-actions';

    const saveTemplateBtn = document.createElement('button');
    saveTemplateBtn.type = 'button';
    saveTemplateBtn.className = 'upload-description-action-btn';
    saveTemplateBtn.textContent = 'Guardar plantilla';

    const publishDescriptionBtn = document.createElement('button');
    publishDescriptionBtn.type = 'button';
    publishDescriptionBtn.className = 'upload-description-action-btn upload-description-action-btn--primary';
    publishDescriptionBtn.textContent = 'Publicar descripcion';

    tabActions.append(saveTemplateBtn, publishDescriptionBtn);
    tabsRow.append(tabBar, tabActions);

    const panels = document.createElement('div');
    panels.className = 'upload-description-panels';

    const writePanel = document.createElement('div');
    writePanel.className = 'upload-description-panel active';
    writePanel.dataset.panel = 'write';

    descriptionInput = document.createElement('textarea');
    descriptionInput.className = 'upload-description-textarea';
    descriptionInput.placeholder = 'Escribe aqui la descripcion completa de tu video...';
    descriptionInput.rows = 14;
    writePanel.appendChild(descriptionInput);

    const templatePanel = document.createElement('div');
    templatePanel.className = 'upload-description-panel';
    templatePanel.dataset.panel = 'templates';

    const previewPanel = document.createElement('div');
    previewPanel.className = 'upload-description-panel';
    previewPanel.dataset.panel = 'preview';

    const previewText = document.createElement('pre');
    previewText.className = 'upload-description-preview';
    previewPanel.appendChild(previewText);

    const refreshPreview = () => {
      const value = descriptionInput.value.trim();
      previewText.textContent = value || 'La descripcion aparecera aqui.';
    };

    let savedTemplates = loadDescriptionTemplates();
    let editingTemplateId: string | null = null;
    let renamingTemplateId: string | null = null;

    const renderTemplatePanel = () => {
      templatePanel.innerHTML = '';

      if (savedTemplates.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'upload-template-empty';
        empty.textContent = 'No tienes plantillas aun.';
        templatePanel.appendChild(empty);
        return;
      }

      const list = document.createElement('div');
      list.className = 'upload-template-list';

      savedTemplates.forEach((tpl) => {
        const item = document.createElement('div');
        item.className = 'upload-template-item';

        const name = document.createElement('div');
        name.className = 'upload-template-name';
        const isRenaming = renamingTemplateId === tpl.id;
        let renameInput: HTMLInputElement | null = null;

        if (isRenaming) {
          renameInput = document.createElement('input');
          renameInput.type = 'text';
          renameInput.className = 'upload-template-rename-input';
          renameInput.value = tpl.name;
          renameInput.dataset.templateId = tpl.id;
          name.appendChild(renameInput);
        } else {
          name.textContent = tpl.name;
        }

        const meta = document.createElement('div');
        meta.className = 'upload-template-meta';
        meta.textContent = new Date(tpl.createdAt).toLocaleDateString();

        const useBtn = document.createElement('button');
        useBtn.type = 'button';
        useBtn.className = 'upload-template-use-btn';
        useBtn.textContent = 'Usar';
        useBtn.addEventListener('click', () => {
          descriptionInput.value = tpl.content;
          refreshPreview();
          switchTab('write');
          descriptionInput.focus();
          editingTemplateId = null;
          renamingTemplateId = null;
          saveTemplateBtn.textContent = 'Guardar plantilla';
        });

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'upload-template-use-btn';
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => {
          descriptionInput.value = tpl.content;
          refreshPreview();
          switchTab('write');
          descriptionInput.focus();
          editingTemplateId = tpl.id;
          renamingTemplateId = null;
          saveTemplateBtn.textContent = 'Guardar cambios';
        });

        const renameBtn = document.createElement('button');
        renameBtn.type = 'button';
        renameBtn.className = 'upload-template-use-btn';
        renameBtn.textContent = 'Renombrar';
        renameBtn.addEventListener('click', () => {
          renamingTemplateId = tpl.id;
          renderTemplatePanel();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'upload-template-use-btn';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.addEventListener('click', () => {
          savedTemplates = savedTemplates.filter((itemTpl) => itemTpl.id !== tpl.id);
          saveDescriptionTemplates(savedTemplates);
          if (editingTemplateId === tpl.id) {
            editingTemplateId = null;
            saveTemplateBtn.textContent = 'Guardar plantilla';
          }
          if (renamingTemplateId === tpl.id) {
            renamingTemplateId = null;
          }
          renderTemplatePanel();
        });

        const actions = document.createElement('div');
        actions.className = 'upload-template-actions';

        if (isRenaming && renameInput) {
          const saveRenameBtn = document.createElement('button');
          saveRenameBtn.type = 'button';
          saveRenameBtn.className = 'upload-template-use-btn';
          saveRenameBtn.textContent = 'Guardar';

          const cancelRenameBtn = document.createElement('button');
          cancelRenameBtn.type = 'button';
          cancelRenameBtn.className = 'upload-template-use-btn';
          cancelRenameBtn.textContent = 'Cancelar';

          const commitRename = () => {
            const nextName = renameInput!.value.trim();
            if (!nextName) return;
            savedTemplates = savedTemplates.map((itemTpl) => (
              itemTpl.id === tpl.id
                ? { ...itemTpl, name: nextName }
                : itemTpl
            ));
            saveDescriptionTemplates(savedTemplates);
            renamingTemplateId = null;
            renderTemplatePanel();
          };

          saveRenameBtn.addEventListener('click', commitRename);
          cancelRenameBtn.addEventListener('click', () => {
            renamingTemplateId = null;
            renderTemplatePanel();
          });

          renameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitRename();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              renamingTemplateId = null;
              renderTemplatePanel();
            }
          });

          actions.append(saveRenameBtn, cancelRenameBtn);
        } else {
          actions.append(useBtn, editBtn, renameBtn, deleteBtn);
        }

        item.append(name, meta, actions);
        list.appendChild(item);
      });

      templatePanel.appendChild(list);

      if (renamingTemplateId) {
        requestAnimationFrame(() => {
          const activeInput = templatePanel.querySelector<HTMLInputElement>(`.upload-template-rename-input[data-template-id="${renamingTemplateId}"]`);
          if (activeInput) {
            activeInput.focus();
            activeInput.select();
          }
        });
      }
    };

    const switchTab = (tab: 'write' | 'templates' | 'preview') => {
      [tabWrite, tabTemplates, tabPreview].forEach((el) => {
        el.classList.toggle('active', el.dataset.tab === tab);
      });
      [writePanel, templatePanel, previewPanel].forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.panel === tab);
      });
      tabActions.style.display = tab === 'write' ? 'flex' : 'none';
      if (tab === 'preview') {
        refreshPreview();
      }
    };

    descriptionInput.addEventListener('input', refreshPreview);
    refreshPreview();

    saveTemplateBtn.addEventListener('click', () => {
      const content = descriptionInput.value.trim();
      if (!content) return;

      if (editingTemplateId) {
        savedTemplates = savedTemplates.map((tpl) => (
          tpl.id === editingTemplateId
            ? { ...tpl, content }
            : tpl
        ));
        saveDescriptionTemplates(savedTemplates);
        renderTemplatePanel();
        editingTemplateId = null;
        renamingTemplateId = null;
        saveTemplateBtn.textContent = 'Guardar plantilla';
        return;
      }

      const suggestedName = `Plantilla ${savedTemplates.length + 1}`;
      const name = window.prompt('Nombre de la plantilla', suggestedName)?.trim();
      if (!name) return;

      const template: DescriptionTemplate = {
        id: crypto.randomUUID(),
        name,
        content,
        createdAt: new Date().toISOString(),
      };
      savedTemplates = [template, ...savedTemplates];
      saveDescriptionTemplates(savedTemplates);
      renderTemplatePanel();
      renamingTemplateId = null;
      saveTemplateBtn.textContent = 'Guardar plantilla';
    });

    publishDescriptionBtn.addEventListener('click', () => {
      const content = descriptionInput.value.trim();
      if (!content) return;
      switchTab('preview');
    });

    tabWrite.addEventListener('click', () => switchTab('write'));
    tabTemplates.addEventListener('click', () => switchTab('templates'));
    tabPreview.addEventListener('click', () => switchTab('preview'));

    renderTemplatePanel();
    switchTab('write');

    panels.append(writePanel, templatePanel, previewPanel);
    descriptionCard.append(descriptionTitle, tabsRow, panels);

    side.appendChild(descriptionCard);
    editor.append(primary, side);
    form.append(header, editor);

    (form as unknown as { getValues: () => Record<string, unknown> }).getValues = () => ({
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      tags,
      category: catSelect.value,
      visibility: visSelect.value,
      comments_enabled: commentsCheck.checked,
      audience: audienceSelect.value,
      license: licenseSelect.value,
      language: languageSelect.value,
      location: locationInput.value.trim(),
      collaborators,
      subtitle_file: subtitleInput.files?.[0] || null,
      subtitle_language: subtitleLangSelect.value,
    });

    renderMediaStage();
    updatePublishState();
  }

  function createField(labelText: string): HTMLDivElement {
    const field = document.createElement('div');
    field.className = 'upload-field';
    const label = document.createElement('label');
    label.textContent = labelText;
    field.appendChild(label);
    return field;
  }

  function renderTags(container: HTMLElement, input: HTMLInputElement, values: string[]) {
    container.querySelectorAll('.upload-tag').forEach((el) => el.remove());
    values.forEach((value, index) => {
      const chip = document.createElement('span');
      chip.className = 'upload-tag';
      chip.innerHTML = `${value}<button type="button">&times;</button>`;
      chip.querySelector('button')!.addEventListener('click', (e) => {
        e.stopPropagation();
        values.splice(index, 1);
        renderTags(container, input, values);
      });
      container.insertBefore(chip, input);
    });
  }

  function updatePublishState() {
    if (!publishBtn) return;
    publishBtn.disabled = !videoFile || !titleInput?.value.trim() || isPublishing;
  }

  async function handlePublish() {
    if (!videoFile || isPublishing) return;

    const authState = getAuthState();
    if (!authState.isLoggedIn || !authState.user) {
      navigate('/');
      return;
    }

    const userId = authState.user.id;
    const values = (form as unknown as { getValues: () => Record<string, unknown> }).getValues();

    isPublishing = true;
    publishBtn.disabled = true;
    publishBtn.textContent = 'Subiendo...';
    progressSection.style.display = 'flex';

    form
      .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')
      .forEach((el) => {
        el.disabled = true;
      });

    try {
      const videoExt = videoFile.name.split('.').pop() || 'mp4';
      const videoId = crypto.randomUUID();
      const videoPath = `${userId}/${videoId}.${videoExt}`;

      const { url: videoUrl } = await uploadWithProgress('user-videos', videoPath, videoFile, (pct) => {
        videoProgressFill.style.width = `${pct}%`;
        videoProgressLabel.innerHTML = `<span>Video</span><span>${pct}%</span>`;
        if (pct === 100) videoProgressFill.classList.add('complete');
      });

      let thumbnailUrl = '';
      let effectiveThumbnailFile: File | null = thumbnailFile;
      if (!effectiveThumbnailFile) {
        thumbProgressFill.style.width = '15%';
        thumbProgressLabel.innerHTML = '<span>Miniatura</span><span>Generando fotograma...</span>';
        effectiveThumbnailFile = await captureRandomFrameAsFile(videoFile);
      }

      if (effectiveThumbnailFile) {
        const thumbExt = effectiveThumbnailFile.name.split('.').pop() || 'jpg';
        const thumbPath = `${userId}/${videoId}.${thumbExt}`;
        const result = await uploadWithProgress('thumbnails', thumbPath, effectiveThumbnailFile, (pct) => {
          thumbProgressFill.style.width = `${pct}%`;
          thumbProgressLabel.innerHTML = `<span>Miniatura</span><span>${pct}%</span>`;
          if (pct === 100) thumbProgressFill.classList.add('complete');
        });
        thumbnailUrl = result.url;
      } else {
        thumbProgressFill.style.width = '100%';
        thumbProgressFill.classList.add('complete');
        thumbProgressLabel.innerHTML = '<span>Miniatura</span><span>Sin miniatura</span>';
      }

      let subtitleUrl = '';
      const subtitleFile = values.subtitle_file as File | null;
      if (subtitleFile) {
        const subExt = subtitleFile.name.split('.').pop() || 'vtt';
        const subPath = `${userId}/${videoId}.${subExt}`;
        const subResult = await uploadWithProgress('subtitles', subPath, subtitleFile);
        subtitleUrl = subResult.url;
      }

      const { error } = await supabase.from('user_videos').insert({
        id: videoId,
        user_id: userId,
        title: values.title as string,
        description: values.description as string,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || null,
        tags: values.tags as string[],
        category: (values.category as string) || null,
        visibility: values.visibility === 'sponsors' ? 'private' : values.visibility as string,
        language: (values.language as string) || null,
        license: values.license as string,
        comments_enabled: values.comments_enabled as boolean,
        audience: values.audience as string,
        location: (values.location as string) || null,
        collaborators: values.collaborators as string[],
        subtitle_url: subtitleUrl || null,
        subtitle_language: (values.subtitle_language as string) || null,
        status: 'published',
      });

      if (error) throw error;

      await notifySubscribersNewVideo(videoId, values.title as string);
      showSuccess();
    } catch (err) {
      console.error('[UploadPage] Publish failed:', err);
      isPublishing = false;
      publishBtn.disabled = false;
      publishBtn.textContent = 'Reintentar publicacion';
      form
        .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')
        .forEach((el) => {
          el.disabled = false;
        });
    }
  }

  function showSuccess() {
    cleanupPreviewUrls();
    page.innerHTML = '';
    const success = document.createElement('div');
    success.className = 'upload-success';
    success.innerHTML = `
      <svg class="upload-success-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <h2>Video publicado</h2>
      <p>Tu video se subio correctamente y ya esta disponible.</p>
    `;
    const homeBtn = document.createElement('button');
    homeBtn.className = 'upload-success-btn';
    homeBtn.textContent = 'Volver al inicio';
    homeBtn.addEventListener('click', () => navigate('/'));
    success.appendChild(homeBtn);
    page.appendChild(success);
  }

  buildForm();

  const observer = new MutationObserver(() => {
    if (!document.contains(page)) {
      cleanupPreviewUrls();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return page;
}
