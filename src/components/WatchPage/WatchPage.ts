import './WatchPage.css';
import { VideoPlayer } from '../VideoPlayer/VideoPlayer';
import { VideoInfo } from '../VideoInfo/VideoInfo';
import { VideoCard } from '../VideoCard/VideoCard';
import { VideoData, getRecommendedVideos } from '../../data/videoStore';
import { navigate } from '../../router/router';
import { hashColor } from '../../utils/avatarColor';

export interface WatchPageOptions {
  video: VideoData;
}

const sampleComments = [
  { author: 'María López', text: 'Excelente video, muy bien explicado!', time: 'hace 2 horas', likes: 42, dislikes: 1, timestamp: 2 },
  { author: 'Carlos García', text: 'Justo lo que estaba buscando, gracias por compartir.', time: 'hace 5 horas', likes: 18, dislikes: 0, timestamp: 5 },
  { author: 'Ana Martínez', text: 'Podrías hacer un video sobre este tema pero más avanzado?', time: 'hace 1 día', likes: 7, dislikes: 2, timestamp: 24 },
  { author: 'Pedro Sánchez', text: 'Increíble contenido como siempre. Sigue así!', time: 'hace 1 día', likes: 31, dislikes: 3, timestamp: 24 },
  { author: 'Laura Fernández', text: 'Me encantó la parte del minuto 3:20, muy útil.', time: 'hace 2 días', likes: 12, dislikes: 0, timestamp: 48 },
  { author: 'Diego Torres', text: 'Alguien más vino aquí por la recomendación?', time: 'hace 3 días', likes: 56, dislikes: 4, timestamp: 72 },
  { author: 'Sofía Ruiz', text: 'Muy buen contenido, me suscribo!', time: 'hace 4 días', likes: 9, dislikes: 1, timestamp: 96 },
  { author: 'Javier Moreno', text: 'Esto me ayudó mucho con mi proyecto, gracias.', time: 'hace 5 días', likes: 23, dislikes: 2, timestamp: 120 },
];

export function WatchPage(options: WatchPageOptions): HTMLDivElement {
  const { video } = options;

  const page = document.createElement('div');
  page.className = 'watch-page';

  // Primary column: player + info + recommended
  const primary = document.createElement('div');
  primary.className = 'watch-page-primary';

  const player = VideoPlayer({
    gradientIndex: video.gradientIndex,
    duration: video.duration,
  });

  const info = VideoInfo({
    title: video.title,
    channelName: video.channelName,
    subscribers: video.subscribers,
    views: video.views,
    publishedDate: video.publishedDate,
    likes: video.likes,
    dislikes: video.dislikes,
    description: video.description,
  });

  // Recommended videos (below description)
  const recSection = document.createElement('div');
  recSection.className = 'watch-page-recommendations-section';

  const recHeading = document.createElement('h3');
  recHeading.className = 'watch-page-section-title';
  recHeading.textContent = 'Siguientes';

  const recommendations = document.createElement('div');
  recommendations.className = 'watch-page-recommendations';

  const recommended = getRecommendedVideos(video.id, 15);
  recommended.forEach(rec => {
    const card = VideoCard({
      title: rec.title,
      channelName: rec.channelName,
      views: rec.views,
      uploadedAt: rec.uploadedAt,
      duration: rec.duration,
      gradientIndex: rec.gradientIndex,
      variant: 'default',
      onClick: () => navigate(`/watch/${rec.id}`),
    });
    recommendations.appendChild(card);
  });

  recSection.append(recHeading, recommendations);
  primary.append(player, info, recSection);

  // Secondary column: comments
  const secondary = document.createElement('div');
  secondary.className = 'watch-page-secondary';

  const commentsHeader = document.createElement('div');
  commentsHeader.className = 'comments-header';

  const commentsTitle = document.createElement('h3');
  commentsTitle.className = 'watch-page-section-title';
  commentsTitle.textContent = `${sampleComments.length} comentarios`;

  const sortButtons = document.createElement('div');
  sortButtons.className = 'comments-sort-buttons';

  type SortFn = (a: typeof sampleComments[0], b: typeof sampleComments[0]) => number;
  let currentSortFn: SortFn = (a, b) => a.timestamp - b.timestamp;

  const sortOptions: { label: string; sortFn: SortFn }[] = [
    { label: 'Más recientes', sortFn: (a, b) => a.timestamp - b.timestamp },
    { label: 'Más populares', sortFn: (a, b) => b.likes - a.likes },
    { label: 'Más antiguos', sortFn: (a, b) => b.timestamp - a.timestamp },
  ];

  // Comment search
  const commentSearch = document.createElement('div');
  commentSearch.className = 'comment-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'comment-search-field';
  searchInput.placeholder = 'Buscar comentarios...';

  commentSearch.appendChild(searchInput);

  function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = query
      ? sampleComments.filter(c => c.author.toLowerCase().includes(query) || c.text.toLowerCase().includes(query))
      : [...sampleComments];
    filtered.sort(currentSortFn);
    renderComments(filtered);
  }

  sortOptions.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'comments-sort-btn' + (i === 0 ? ' active' : '');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      sortButtons.querySelectorAll('.comments-sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSortFn = opt.sortFn;
      applyFilters();
    });
    sortButtons.appendChild(btn);
  });

  searchInput.addEventListener('input', applyFilters);

  commentsHeader.append(commentsTitle, sortButtons);

  // Comment input
  const commentInput = document.createElement('div');
  commentInput.className = 'comment-input';

  const inputAvatar = document.createElement('div');
  inputAvatar.className = 'comment-avatar';
  inputAvatar.textContent = 'T';
  inputAvatar.style.background = hashColor('Tú');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'comment-input-field';
  input.placeholder = 'Añade un comentario...';

  commentInput.append(inputAvatar, input);

  // Comment list
  const commentList = document.createElement('div');
  commentList.className = 'comment-list';

  function renderComments(list: typeof sampleComments) {
    commentList.innerHTML = '';
    list.forEach(c => {
      const comment = document.createElement('div');
      comment.className = 'comment';

      const avatar = document.createElement('div');
      avatar.className = 'comment-avatar';
      avatar.textContent = c.author.charAt(0).toUpperCase();
      avatar.style.background = hashColor(c.author);

      const body = document.createElement('div');
      body.className = 'comment-body';

      const header = document.createElement('div');
      header.className = 'comment-meta';

      const authorEl = document.createElement('span');
      authorEl.className = 'comment-author';
      authorEl.textContent = c.author;

      const timeEl = document.createElement('span');
      timeEl.className = 'comment-time';
      timeEl.textContent = c.time;

      header.append(authorEl, timeEl);

      const textEl = document.createElement('p');
      textEl.className = 'comment-text';
      textEl.textContent = c.text;

      const actions = document.createElement('div');
      actions.className = 'comment-actions';

      const likeBtn = document.createElement('button');
      likeBtn.className = 'comment-action-btn';
      likeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
        <span>${c.likes}</span>
      `;

      const dislikeBtn = document.createElement('button');
      dislikeBtn.className = 'comment-action-btn';
      dislikeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
        </svg>
        <span>${c.dislikes}</span>
      `;

      const replyBtn = document.createElement('button');
      replyBtn.className = 'comment-action-btn';
      replyBtn.textContent = 'Responder';

      actions.append(likeBtn, dislikeBtn, replyBtn);
      body.append(header, textEl, actions);
      comment.append(avatar, body);
      commentList.appendChild(comment);
    });
  }

  // Initial render
  applyFilters();

  secondary.append(commentsHeader, commentSearch, commentInput, commentList);
  page.append(primary, secondary);

  return page;
}
