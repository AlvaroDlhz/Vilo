import './UploadPage.css';
import { getAuthState } from '../../data/authStore';
import { uploadWithProgress } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { navigate } from '../../router/router';
import { RichTextEditor, type RichTextEditorInstance } from '../RichTextEditor/RichTextEditor';

const CATEGORIES = [
  '', 'Entretenimiento', 'Educación', 'Ciencia y tecnología', 'Deportes',
  'Música', 'Gaming', 'Noticias', 'Películas', 'Comedia', 'Cocina',
  'Viajes', 'Moda', 'Fitness', 'Arte', 'Negocios', 'Otro',
];

const LANGUAGES = [
  '', 'Español', 'English', 'Français', 'Deutsch', 'Português',
  'Italiano', '日本語', '한국어', '中文', 'العربية', 'हिन्दी', 'Otro',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function UploadPage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'upload-page';

  const title = document.createElement('h1');
  title.className = 'upload-page-title';
  title.textContent = 'Subir video';
  page.appendChild(title);

  // State
  let videoFile: File | null = null;
  let thumbnailFile: File | null = null;
  let tags: string[] = [];
  let collaborators: string[] = [];
  let isPublishing = false;

  // Elements we'll need references to
  let richEditor: RichTextEditorInstance | null = null;
  let publishBtn: HTMLButtonElement;
  let videoProgressFill: HTMLElement;
  let videoProgressLabel: HTMLElement;
  let thumbProgressFill: HTMLElement;
  let thumbProgressLabel: HTMLElement;
  let progressSection: HTMLElement;
  let titleInput: HTMLInputElement;

  // ========================
  // Dropzone
  // ========================
  const dropzone = document.createElement('div');
  dropzone.className = 'upload-dropzone';

  const dropzoneIcon = document.createElement('div');
  dropzoneIcon.className = 'upload-dropzone-icon';
  dropzoneIcon.innerHTML = `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

  const dropzoneText = document.createElement('div');
  dropzoneText.className = 'upload-dropzone-text';
  dropzoneText.innerHTML = '<strong>Arrastra tu video aquí</strong> o haz clic para seleccionar';

  const dropzoneHint = document.createElement('div');
  dropzoneHint.className = 'upload-dropzone-hint';
  dropzoneHint.textContent = 'MP4, WebM, MOV — máximo 10 GB';

  dropzone.append(dropzoneIcon, dropzoneText, dropzoneHint);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'video/*';
  fileInput.style.display = 'none';

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('video/')) {
      videoFile = file;
      showForm();
    }
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      videoFile = file;
      showForm();
    }
  });

  page.appendChild(dropzone);
  page.appendChild(fileInput);

  // ========================
  // Form (hidden until file selected)
  // ========================
  const form = document.createElement('div');
  form.className = 'upload-form';
  form.style.display = 'none';
  page.appendChild(form);

  function showForm() {
    dropzone.style.display = 'none';
    form.style.display = 'grid';
    buildForm();
  }

  function buildForm() {
    form.innerHTML = '';

    const left = document.createElement('div');
    left.className = 'upload-form-left';

    const right = document.createElement('div');
    right.className = 'upload-form-right';

    // --- LEFT COLUMN ---

    // === Section: Detalles ===
    const sectionDetalles = createSection('Detalles');

    // Title
    const titleField = createField('Título *');
    titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Añade un título a tu video';
    titleInput.maxLength = 100;
    titleInput.addEventListener('input', updatePublishState);
    titleField.appendChild(titleInput);
    sectionDetalles.appendChild(titleField);

    // Description (Rich Text Editor)
    const descField = createField('Descripción');
    richEditor = RichTextEditor('Describe tu video...');
    descField.appendChild(richEditor.getElement());
    sectionDetalles.appendChild(descField);

    // Tags
    const tagsField = createField('Etiquetas');
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
        const val = tagsInput.value.trim().replace(/,/g, '');
        if (val && !tags.includes(val)) {
          tags.push(val);
          renderTags(tagsContainer, tagsInput, tags);
        }
        tagsInput.value = '';
      }
      if (e.key === 'Backspace' && !tagsInput.value && tags.length > 0) {
        tags.pop();
        renderTags(tagsContainer, tagsInput, tags);
      }
    });

    tagsField.appendChild(tagsContainer);
    sectionDetalles.appendChild(tagsField);

    // Category
    const catField = createField('Categoría');
    const catSelect = document.createElement('select');
    CATEGORIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c || 'Selecciona una categoría';
      if (!c) opt.disabled = true;
      catSelect.appendChild(opt);
    });
    catField.appendChild(catSelect);
    sectionDetalles.appendChild(catField);

    left.appendChild(sectionDetalles);

    // === Section: Configuración ===
    const sectionConfig = createSection('Configuración');

    // Visibility
    const visField = createField('Visibilidad');
    const visGroup = createRadioGroup('visibility', [
      { value: 'public', label: 'Público' },
      { value: 'unlisted', label: 'No listado' },
      { value: 'private', label: 'Privado' },
    ], 'public');
    visField.appendChild(visGroup);
    sectionConfig.appendChild(visField);

    // Comments enabled
    const commField = document.createElement('div');
    commField.className = 'upload-toggle';
    const commCheck = document.createElement('input');
    commCheck.type = 'checkbox';
    commCheck.id = 'upload-comments';
    commCheck.checked = true;
    const commLabel = document.createElement('label');
    commLabel.htmlFor = 'upload-comments';
    commLabel.textContent = 'Comentarios habilitados';
    commField.append(commCheck, commLabel);
    sectionConfig.appendChild(commField);

    // Audience
    const audField = createField('Audiencia');
    const audGroup = createRadioGroup('audience', [
      { value: 'all', label: 'Todos' },
      { value: 'kids', label: 'Niños' },
    ], 'all');
    audField.appendChild(audGroup);
    sectionConfig.appendChild(audField);

    // License
    const licField = createField('Licencia');
    const licSelect = document.createElement('select');
    [
      { value: 'standard', label: 'Licencia estándar' },
      { value: 'cc', label: 'Creative Commons - Atribución' },
    ].forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.value;
      opt.textContent = l.label;
      licSelect.appendChild(opt);
    });
    licField.appendChild(licSelect);
    sectionConfig.appendChild(licField);

    // Language
    const langField = createField('Idioma');
    const langSelect = document.createElement('select');
    LANGUAGES.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l || 'Selecciona un idioma';
      if (!l) opt.disabled = true;
      langSelect.appendChild(opt);
    });
    langField.appendChild(langSelect);
    sectionConfig.appendChild(langField);

    left.appendChild(sectionConfig);

    // === Section: Adicional ===
    const sectionAdicional = createSection('Adicional');

    // Location
    const locField = createField('Ubicación');
    const locInput = document.createElement('input');
    locInput.type = 'text';
    locInput.placeholder = 'Ej. Madrid, España';
    locField.appendChild(locInput);
    sectionAdicional.appendChild(locField);

    // Collaborators
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
        const val = collabInput.value.trim().replace(/,/g, '');
        if (val && !collaborators.includes(val)) {
          collaborators.push(val);
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
    sectionAdicional.appendChild(collabField);

    // Subtitles (collapsible)
    const subtitleSection = createCollapsible('Subtítulos / CC');
    const subtitleBody = subtitleSection.querySelector('.upload-collapsible-body')!;

    const subtitleField = createField('Archivo de subtítulos');
    const subtitleInput = document.createElement('input');
    subtitleInput.type = 'file';
    subtitleInput.accept = '.srt,.vtt';
    subtitleInput.style.fontSize = '13px';
    subtitleField.appendChild(subtitleInput);

    const subtitleLangField = createField('Idioma del subtítulo');
    const subtitleLangSelect = document.createElement('select');
    LANGUAGES.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l || 'Selecciona un idioma';
      if (!l) opt.disabled = true;
      subtitleLangSelect.appendChild(opt);
    });
    subtitleLangField.appendChild(subtitleLangSelect);

    subtitleBody.append(subtitleField, subtitleLangField);
    sectionAdicional.appendChild(subtitleSection);

    // End screen (collapsible)
    const endScreenSection = createCollapsible('Pantalla final');
    const endScreenBody = endScreenSection.querySelector('.upload-collapsible-body')!;
    const endScreenArea = document.createElement('textarea');
    endScreenArea.placeholder = 'Notas para la pantalla final (funcionalidad próximamente)...';
    endScreenArea.rows = 3;
    endScreenArea.style.cssText = 'width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:14px;font-family:inherit;outline:none;resize:vertical;';
    endScreenBody.appendChild(endScreenArea);
    sectionAdicional.appendChild(endScreenSection);

    left.appendChild(sectionAdicional);

    // --- RIGHT COLUMN ---

    // Video preview card
    const previewCard = document.createElement('div');
    previewCard.className = 'upload-preview-card';

    if (videoFile) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoFile);
      video.controls = true;
      video.preload = 'metadata';
      previewCard.appendChild(video);

      const fileInfo = document.createElement('div');
      fileInfo.className = 'upload-file-info';
      const fileName = document.createElement('div');
      fileName.className = 'upload-file-name';
      fileName.textContent = videoFile.name;
      const fileMeta = document.createElement('div');
      fileMeta.className = 'upload-file-meta';
      fileMeta.textContent = `${formatFileSize(videoFile.size)} — ${videoFile.type}`;
      fileInfo.append(fileName, fileMeta);
      previewCard.appendChild(fileInfo);

      // Change video button
      const changeBtn = document.createElement('button');
      changeBtn.textContent = 'Cambiar video';
      changeBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px;cursor:pointer;';
      changeBtn.addEventListener('click', () => fileInput.click());
      previewCard.appendChild(changeBtn);
    }

    right.appendChild(previewCard);

    // Thumbnail
    const thumbField = createField('Miniatura');
    const thumbZone = document.createElement('div');
    thumbZone.className = 'upload-thumbnail-zone';
    thumbZone.textContent = 'Arrastra una imagen o haz clic para seleccionar';

    const thumbInput = document.createElement('input');
    thumbInput.type = 'file';
    thumbInput.accept = 'image/*';
    thumbInput.style.display = 'none';

    thumbZone.addEventListener('click', () => thumbInput.click());
    thumbZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      thumbZone.classList.add('dragover');
    });
    thumbZone.addEventListener('dragleave', () => thumbZone.classList.remove('dragover'));
    thumbZone.addEventListener('drop', (e) => {
      e.preventDefault();
      thumbZone.classList.remove('dragover');
      const file = e.dataTransfer?.files[0];
      if (file && file.type.startsWith('image/')) {
        thumbnailFile = file;
        showThumbPreview(thumbZone, file);
      }
    });
    thumbInput.addEventListener('change', () => {
      const file = thumbInput.files?.[0];
      if (file) {
        thumbnailFile = file;
        showThumbPreview(thumbZone, file);
      }
    });

    thumbField.append(thumbZone, thumbInput);
    right.appendChild(thumbField);

    // Progress section
    progressSection = document.createElement('div');
    progressSection.className = 'upload-progress-section';
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
    right.appendChild(progressSection);

    // Publish button
    publishBtn = document.createElement('button');
    publishBtn.className = 'upload-publish-btn';
    publishBtn.textContent = 'Publicar';
    publishBtn.disabled = true;
    publishBtn.addEventListener('click', handlePublish);
    right.appendChild(publishBtn);

    form.append(left, right);
    updatePublishState();

    // Collect form values helper attached to form
    (form as unknown as { getValues: () => Record<string, unknown> }).getValues = () => ({
      title: titleInput.value.trim(),
      description: richEditor ? richEditor.getHTML() : '',
      tags,
      category: catSelect.value,
      visibility: getRadioValue(form, 'visibility'),
      comments_enabled: commCheck.checked,
      audience: getRadioValue(form, 'audience'),
      license: licSelect.value,
      language: langSelect.value,
      location: locInput.value.trim(),
      collaborators,
      subtitle_file: subtitleInput.files?.[0] || null,
      subtitle_language: subtitleLangSelect.value,
    });
  }

  // ========================
  // Helpers
  // ========================
  function createSection(titleText: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'upload-section';
    const h2 = document.createElement('h2');
    h2.textContent = titleText;
    section.appendChild(h2);
    return section;
  }

  function createField(labelText: string): HTMLElement {
    const field = document.createElement('div');
    field.className = 'upload-field';
    const label = document.createElement('label');
    label.textContent = labelText;
    field.appendChild(label);
    return field;
  }

  function createRadioGroup(name: string, options: { value: string; label: string }[], defaultValue: string): HTMLElement {
    const group = document.createElement('div');
    group.className = 'upload-radio-group';
    options.forEach(opt => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = name;
      radio.value = opt.value;
      if (opt.value === defaultValue) radio.checked = true;
      label.append(radio, ` ${opt.label}`);
      group.appendChild(label);
    });
    return group;
  }

  function getRadioValue(container: HTMLElement, name: string): string {
    const checked = container.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
    return checked?.value || '';
  }

  function renderTags(container: HTMLElement, input: HTMLInputElement, arr: string[]) {
    container.querySelectorAll('.upload-tag').forEach(el => el.remove());
    arr.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'upload-tag';
      chip.innerHTML = `${tag}<button type="button">&times;</button>`;
      chip.querySelector('button')!.addEventListener('click', (e) => {
        e.stopPropagation();
        arr.splice(i, 1);
        renderTags(container, input, arr);
      });
      container.insertBefore(chip, input);
    });
  }

  function showThumbPreview(zone: HTMLElement, file: File) {
    zone.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'upload-thumbnail-preview';
    img.src = URL.createObjectURL(file);
    zone.appendChild(img);
  }

  function updatePublishState() {
    if (publishBtn) {
      publishBtn.disabled = !videoFile || !titleInput?.value.trim() || isPublishing;
    }
  }

  function createCollapsible(titleText: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'upload-collapsible';

    const header = document.createElement('button');
    header.className = 'upload-collapsible-header';
    header.innerHTML = `<span>${titleText}</span><span class="upload-collapsible-chevron">&#9662;</span>`;
    header.addEventListener('click', () => section.classList.toggle('open'));

    const body = document.createElement('div');
    body.className = 'upload-collapsible-body';

    section.append(header, body);
    return section;
  }

  // ========================
  // Publish flow
  // ========================
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

    // Disable all inputs
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach(el => el.disabled = true);
    richEditor?.setDisabled(true);

    try {
      // Upload video
      const videoExt = videoFile.name.split('.').pop() || 'mp4';
      const videoId = crypto.randomUUID();
      const videoPath = `${userId}/${videoId}.${videoExt}`;

      const { url: videoUrl } = await uploadWithProgress('user-videos', videoPath, videoFile, (pct) => {
        videoProgressFill.style.width = `${pct}%`;
        videoProgressLabel.innerHTML = `<span>Video</span><span>${pct}%</span>`;
        if (pct === 100) videoProgressFill.classList.add('complete');
      });

      // Upload thumbnail
      let thumbnailUrl = '';
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split('.').pop() || 'jpg';
        const thumbPath = `${userId}/${videoId}.${thumbExt}`;

        const result = await uploadWithProgress('thumbnails', thumbPath, thumbnailFile, (pct) => {
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

      // Upload subtitles if provided
      let subtitleUrl = '';
      const subtitleFile = values.subtitle_file as File | null;
      if (subtitleFile) {
        const subExt = subtitleFile.name.split('.').pop() || 'vtt';
        const subPath = `${userId}/${videoId}.${subExt}`;
        const subResult = await uploadWithProgress('subtitles', subPath, subtitleFile);
        subtitleUrl = subResult.url;
      }

      // Insert into database
      const { error } = await supabase.from('user_videos').insert({
        id: videoId,
        user_id: userId,
        title: values.title as string,
        description: values.description as string,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || null,
        tags: values.tags as string[],
        category: (values.category as string) || null,
        visibility: values.visibility as string,
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

      // Show success
      showSuccess();
    } catch (err) {
      console.error('[UploadPage] Publish failed:', err);
      isPublishing = false;
      publishBtn.disabled = false;
      publishBtn.textContent = 'Reintentar publicación';
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach(el => el.disabled = false);
      richEditor?.setDisabled(false);
    }
  }

  function showSuccess() {
    page.innerHTML = '';
    const success = document.createElement('div');
    success.className = 'upload-success';
    success.innerHTML = `
      <svg class="upload-success-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <h2>¡Video publicado!</h2>
      <p>Tu video se ha subido correctamente y ya está disponible.</p>
    `;
    const homeBtn = document.createElement('button');
    homeBtn.className = 'upload-success-btn';
    homeBtn.textContent = 'Volver al inicio';
    homeBtn.addEventListener('click', () => navigate('/'));
    success.appendChild(homeBtn);
    page.appendChild(success);
  }

  return page;
}
