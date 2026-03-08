import { getAllVideos, VideoData } from './videoStore';

export interface ChannelLink {
  label: string;
  url: string;
}

export interface ChannelPlaylist {
  title: string;
  videoCount: number;
  gradientIndex: number;
}

export interface ChannelPost {
  text: string;
  date: string;
}

export interface ChannelData {
  id: string;
  name: string;
  subscribers: string;
  description: string;
  joinedDate: string;
  totalViews: string;
  location: string;
  links: ChannelLink[];
  bannerGradientIndex: number;
  playlists: ChannelPlaylist[];
  posts: ChannelPost[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Extract unique channels from videoStore and build channel data
function buildChannelData(): Map<string, ChannelData> {
  const videos = getAllVideos();
  const seen = new Map<string, VideoData>();

  // Get first video per channel for subscriber count
  videos.forEach(v => {
    if (!seen.has(v.channelName)) {
      seen.set(v.channelName, v);
    }
  });

  const channelMap = new Map<string, ChannelData>();

  const descriptions: Record<string, string> = {
    'Canal de Ejemplo': 'Bienvenidos al Canal de Ejemplo. Aquí encontrarás contenido variado sobre tecnología, entretenimiento y mucho más. Suscríbete y activa la campana para no perderte ningún video.',
    'Otro Canal': 'Canal dedicado a compartir contenido de calidad. Nuevos videos cada semana sobre temas variados.',
    'Dev Tutorials': 'Tutoriales de programación para todos los niveles. Desde conceptos básicos hasta arquitecturas avanzadas. Aprende a tu ritmo con explicaciones claras y proyectos prácticos.',
    'Trending Now': 'Lo más trending de internet, cada día. Recopilamos el contenido viral que no te puedes perder.',
    'Web Dev': 'Desarrollo web moderno: HTML, CSS, JavaScript y frameworks. Tips, trucos y tutoriales para mejorar tus habilidades como desarrollador.',
    'Nuevo Creador': 'Hola, soy nuevo en la plataforma. Comparto mi vida cotidiana y mis pasiones. Gracias por visitar mi canal.',
    'Tech Reviews': 'Reviews honestos y detallados de tecnología. Smartphones, laptops, gadgets y más. Sin filtros, sin patrocinios ocultos.',
    'GameZone': 'Tu zona de gaming favorita. Gameplays, reviews, noticias y todo lo relacionado con el mundo de los videojuegos.',
    'Docs Channel': 'Documentales fascinantes sobre ciencia, historia, naturaleza y sociedad. Contenido educativo de alta calidad.',
    'Life Hacks': 'Tips y trucos para mejorar tu vida diaria. Productividad, organización, salud y bienestar.',
    'Chill Vibes': 'Música relajante 24/7. Lo-fi hip hop, jazz, ambient y sonidos de la naturaleza para estudiar, trabajar o relajarte.',
    'Chef Casero': 'Recetas fáciles y deliciosas para hacer en casa. Cocina internacional, postres, comida rápida y recetas saludables.',
    'CodeMaster': 'Cursos completos de programación. React, Angular, Vue, Node.js, Python y mucho más. Tu camino al desarrollo profesional.',
    'Tech Unbox': 'Unboxings y primeras impresiones de los últimos productos tecnológicos. Descubre antes que nadie lo nuevo del mercado.',
    'Traveler': 'Viajes por el mundo. Guías completas, tips de viaje, cultura local y las mejores recomendaciones para tu próxima aventura.',
    'Fitness Pro': 'Rutinas de ejercicio, nutrición y vida saludable. Entrenamientos para casa y gimnasio, para principiantes y avanzados.',
    'CodeAcademy': 'La academia de programación más grande en español. Cursos gratuitos, ejercicios prácticos y una comunidad increíble.',
    'FailTube': 'Los videos más graciosos y fails de internet. Compilaciones semanales que te van a sacar una sonrisa.',
    'Nature Docs': 'Documentales de naturaleza filmados en la más alta calidad. Explora la biodiversidad del planeta desde tu pantalla.',
    'Magic Tricks': 'Aprende magia desde casa. Trucos con cartas, monedas, mentalismo y mucho más. Sorprende a tus amigos y familia.',
    'DevFast': 'Aprende tecnología rápido. Cursos condensados, tutoriales express y tips para desarrolladores que quieren avanzar.',
    'CineFan': 'Todo sobre cine. Reviews, rankings, análisis de películas y series. El canal definitivo para cinéfilos.',
    'PC Builder': 'Guías de armado de PC, benchmarks, comparativas de hardware y overclocking. Todo lo que necesitas para tu setup.',
    'ArtClass': 'Historia del arte, técnicas artísticas y tutoriales creativos. Aprende a dibujar, pintar y desarrollar tu estilo.',
    'PhotoPro': 'Fotografía profesional al alcance de todos. Composición, edición, equipo y técnicas para llevar tus fotos al siguiente nivel.',
    'StyleHub': 'Moda, estilo y tendencias. Outfits, hauls, consejos de imagen personal y las últimas novedades del mundo fashion.',
  };

  const locations: Record<string, string> = {
    'Canal de Ejemplo': 'España',
    'Otro Canal': 'México',
    'Dev Tutorials': 'Argentina',
    'Trending Now': 'Estados Unidos',
    'Web Dev': 'Colombia',
    'Nuevo Creador': 'Chile',
    'Tech Reviews': 'España',
    'GameZone': 'México',
    'Docs Channel': 'España',
    'Life Hacks': 'Perú',
    'Chill Vibes': 'Japón',
    'Chef Casero': 'México',
    'CodeMaster': 'Argentina',
    'Tech Unbox': 'Colombia',
    'Traveler': 'España',
    'Fitness Pro': 'México',
    'CodeAcademy': 'Estados Unidos',
    'FailTube': 'Estados Unidos',
    'Nature Docs': 'Reino Unido',
    'Magic Tricks': 'España',
    'DevFast': 'Argentina',
    'CineFan': 'España',
    'PC Builder': 'Estados Unidos',
    'ArtClass': 'Italia',
    'PhotoPro': 'Japón',
    'StyleHub': 'Francia',
  };

  const playlistsData: Record<string, ChannelPlaylist[]> = {
    'Dev Tutorials': [
      { title: 'Curso de TypeScript', videoCount: 24, gradientIndex: 2 },
      { title: 'Node.js Avanzado', videoCount: 18, gradientIndex: 4 },
      { title: 'Patrones de Diseño', videoCount: 12, gradientIndex: 6 },
    ],
    'Web Dev': [
      { title: 'CSS Masterclass', videoCount: 30, gradientIndex: 0 },
      { title: 'HTML Semántico', videoCount: 10, gradientIndex: 5 },
    ],
    'CodeMaster': [
      { title: 'React Completo', videoCount: 45, gradientIndex: 4 },
      { title: 'Vue.js desde Cero', videoCount: 28, gradientIndex: 1 },
      { title: 'Angular Pro', videoCount: 35, gradientIndex: 7 },
    ],
    'CodeAcademy': [
      { title: 'Python para Principiantes', videoCount: 50, gradientIndex: 0 },
      { title: 'Estructuras de Datos', videoCount: 22, gradientIndex: 3 },
    ],
    'DevFast': [
      { title: 'JavaScript Express', videoCount: 15, gradientIndex: 4 },
      { title: 'APIs en 10 min', videoCount: 8, gradientIndex: 2 },
    ],
    'GameZone': [
      { title: 'Mejores Momentos 2026', videoCount: 20, gradientIndex: 7 },
      { title: 'Reviews de Juegos', videoCount: 35, gradientIndex: 1 },
    ],
    'Tech Reviews': [
      { title: 'Smartphones 2026', videoCount: 12, gradientIndex: 6 },
      { title: 'Laptops vs Tablets', videoCount: 8, gradientIndex: 3 },
    ],
    'Chef Casero': [
      { title: 'Recetas Rápidas', videoCount: 25, gradientIndex: 3 },
      { title: 'Postres Fáciles', videoCount: 18, gradientIndex: 5 },
    ],
    'Traveler': [
      { title: 'Europa 2026', videoCount: 14, gradientIndex: 6 },
      { title: 'Asia Aventura', videoCount: 10, gradientIndex: 2 },
      { title: 'Latinoamérica Mágica', videoCount: 8, gradientIndex: 1 },
    ],
    'PC Builder': [
      { title: 'Builds por Presupuesto', videoCount: 20, gradientIndex: 0 },
      { title: 'Overclocking Guide', videoCount: 6, gradientIndex: 7 },
    ],
  };

  const postsData: Record<string, ChannelPost[]> = {
    'Dev Tutorials': [
      { text: 'Nuevo curso de TypeScript próximamente! Estén atentos esta semana.', date: 'hace 2 días' },
      { text: 'Gracias por los 1.2M de suscriptores! Son increíbles.', date: 'hace 1 semana' },
      { text: '¿Qué tema les gustaría ver en el próximo tutorial? Dejen sus sugerencias.', date: 'hace 2 semanas' },
    ],
    'Trending Now': [
      { text: 'Video nuevo todos los días a las 6 PM!', date: 'hace 1 día' },
      { text: 'El video de ayer rompió récord de vistas. Gracias a todos!', date: 'hace 3 días' },
    ],
    'GameZone': [
      { text: 'Stream especial este viernes. No se lo pierdan!', date: 'hace 1 día' },
      { text: 'Review del nuevo juego del año sale mañana.', date: 'hace 4 días' },
      { text: '¿Cuál es su juego favorito de este año? Comenten abajo.', date: 'hace 1 semana' },
    ],
    'CodeMaster': [
      { text: 'El curso de React se actualiza a la versión 20. Nuevos videos esta semana.', date: 'hace 3 días' },
      { text: 'Workshop en vivo el próximo sábado. Link en la descripción del último video.', date: 'hace 1 semana' },
    ],
    'Chef Casero': [
      { text: 'Receta especial de temporada este domingo. Preparen los ingredientes!', date: 'hace 1 día' },
      { text: 'Nuevo libro de recetas disponible. Link en mi perfil.', date: 'hace 5 días' },
    ],
    'Traveler': [
      { text: 'Próximo destino: Japón! Serie de videos empezando la próxima semana.', date: 'hace 2 días' },
      { text: '¿A dónde debería ir después? Voten en la encuesta!', date: 'hace 1 semana' },
    ],
    'Fitness Pro': [
      { text: 'Reto de 30 días empieza el lunes. ¿Se apuntan?', date: 'hace 1 día' },
      { text: 'Nueva rutina de espalda subida hoy. Comenten si les gustó.', date: 'hace 3 días' },
    ],
    'PC Builder': [
      { text: 'Las nuevas GPUs ya están aquí. Review completo este fin de semana.', date: 'hace 2 días' },
      { text: 'Build de $500 que rinde como una de $1000. Video mañana.', date: 'hace 5 días' },
    ],
  };

  let bannerIdx = 0;
  seen.forEach((video, channelName) => {
    const id = slugify(channelName);
    const videoCount = videos.filter(v => v.channelName === channelName).length;

    channelMap.set(id, {
      id,
      name: channelName,
      subscribers: video.subscribers,
      description: descriptions[channelName] || `Bienvenidos al canal ${channelName}. Nuevo contenido cada semana.`,
      joinedDate: 'ene 2020',
      totalViews: video.views.replace(' vistas', ''),
      location: locations[channelName] || 'España',
      links: [
        { label: 'Twitter', url: '#' },
        { label: 'Instagram', url: '#' },
      ],
      bannerGradientIndex: bannerIdx % 8,
      playlists: playlistsData[channelName] || [
        { title: `Lo mejor de ${channelName}`, videoCount: videoCount + 5, gradientIndex: (bannerIdx + 2) % 8 },
        { title: 'Populares', videoCount: videoCount + 2, gradientIndex: (bannerIdx + 4) % 8 },
      ],
      posts: postsData[channelName] || [
        { text: `Nuevo video pronto! Estén atentos al canal.`, date: 'hace 3 días' },
        { text: `Gracias por todo el apoyo. Seguimos creciendo juntos!`, date: 'hace 1 semana' },
      ],
    });

    bannerIdx++;
  });

  return channelMap;
}

const channelMap = buildChannelData();

export function getChannelById(id: string): ChannelData | undefined {
  return channelMap.get(id);
}

export function getAllChannels(): ChannelData[] {
  return Array.from(channelMap.values());
}

export function getVideosByChannel(channelId: string): VideoData[] {
  const channel = channelMap.get(channelId);
  if (!channel) return [];
  return getAllVideos().filter(v => v.channelName === channel.name);
}

export function getChannelIdByName(channelName: string): string {
  return slugify(channelName);
}
