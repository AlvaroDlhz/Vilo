import './style.css';
import './components/MainContent/MainContent.css';
import { Navbar } from './components/Navbar/Navbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Banner } from './components/Banner/Banner';
import { VideoGrid } from './components/VideoGrid/VideoGrid';
import { WatchPage } from './components/WatchPage/WatchPage';
import { getAllVideos, getVideoById, initVideoStore } from './data/videoStore';
import { getChannelByRouteId, initChannelStore } from './data/channelStore';
import { initAuthStore } from './data/authStore';
import { Feed, filterVideosByFeed, getPredefinedFeeds } from './data/feedStore';
import { ChannelPage } from './components/ChannelPage/ChannelPage';
import { UploadPage } from './components/UploadPage/UploadPage';
import { getAuthState } from './data/authStore';
import { addRoute, navigate, startRouter, refreshRoute } from './router/router';
import { subscribe as subscribeAuthState } from './data/authStore';

// Apply saved theme before first paint
const savedTheme = localStorage.getItem('vilo-theme');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}

(async () => {
  await Promise.all([initVideoStore(), initChannelStore(), initAuthStore()]);

  const app = document.getElementById('app');

  if (app) {
    let activeFeed: Feed = getPredefinedFeeds()[0];

    const sidebar = new Sidebar({
      onOpen: () => console.log('Sidebar abierto'),
      onClose: () => console.log('Sidebar cerrado'),
    });

    app.appendChild(sidebar.getElement());

    const navbar = Navbar({
      onMenuClick: () => {
        sidebar.toggle();
      },
      onLogoClick: () => {
        navigate('/');
      },
      onFeedChange: (feed) => {
        activeFeed = feed;
        renderHome();
      },
    });

    app.appendChild(navbar);

    // Route content container
    const contentContainer = document.createElement('div');
    contentContainer.id = 'route-content';
    app.appendChild(contentContainer);

    function renderHome() {
      contentContainer.innerHTML = '';

      const banner = Banner();

      const allVideos = getAllVideos();
      const videos = filterVideosByFeed(activeFeed, allVideos);
      const videoGrid = VideoGrid({
        videos: videos.map(v => ({
          thumbnail: v.thumbnailUrl || undefined,
          videoUrl: v.videoUrl,
          title: v.title,
          channelName: v.channelName,
          channelAvatar: v.channelAvatar || undefined,
          views: v.views,
          uploadedAt: v.uploadedAt,
          duration: v.duration,
          gradientIndex: v.gradientIndex,
          onClick: () => navigate(`/watch/${v.id}`),
        })),
        columns: {
          default: 4,
          tablet: 3,
          mobile: 1,
        },
      });

      const mainContent = document.createElement('div');
      mainContent.className = 'main-content';
      mainContent.appendChild(banner);

      if (videos.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:80px 24px;color:var(--text-muted);';
        empty.innerHTML = `
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;opacity:0.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <h3 style="font-size:18px;margin-bottom:8px;color:var(--text)">No hay videos todavia</h3>
          <p style="font-size:14px">Se el primero en subir un video a Vilo</p>
        `;
        mainContent.appendChild(empty);
      } else {
        mainContent.appendChild(videoGrid);
      }

      contentContainer.appendChild(mainContent);
    }

    function renderWatch(params: Record<string, string>) {
      contentContainer.innerHTML = '';

      const video = getVideoById(params.id);
      if (!video) {
        navigate('/');
        return;
      }

      const watchPage = WatchPage({ video });
      contentContainer.appendChild(watchPage);

      window.scrollTo(0, 0);
    }

    function renderChannel(params: Record<string, string>) {
      const channelId = params.id;
      const tab = params.tab || 'videos';
      contentContainer.innerHTML = '';

      const loading = document.createElement('div');
      loading.style.cssText = 'padding:48px 24px;text-align:center;color:var(--text-muted);';
      loading.textContent = 'Cargando canal...';
      contentContainer.appendChild(loading);

      void getChannelByRouteId(channelId).then((channel) => {
        const currentHash = window.location.hash.slice(1) || '/';
        const expected = `/channel/${channelId}`;
        if (!(currentHash === expected || currentHash.startsWith(`${expected}/`))) {
          return;
        }

        if (!channel) {
          navigate('/');
          return;
        }

        contentContainer.innerHTML = '';
        const channelPage = ChannelPage({ channel, activeTab: tab });
        contentContainer.appendChild(channelPage);
        window.scrollTo(0, 0);
      });
    }

    function renderUpload() {
      contentContainer.innerHTML = '';

      if (!getAuthState().isLoggedIn) {
        navigate('/');
        return;
      }

      const uploadPage = UploadPage();
      contentContainer.appendChild(uploadPage);
      window.scrollTo(0, 0);
    }

    addRoute('/', renderHome);
    addRoute('/upload', renderUpload);
    addRoute('/watch/:id', renderWatch);
    addRoute('/channel/:id', (params) => {
      renderChannel({ ...params, tab: 'videos' });
    });
    addRoute('/channel/:id/:tab', renderChannel);
    startRouter();

    let lastAuthUserId = getAuthState().user?.id || null;
    let lastIsLoggedIn = getAuthState().isLoggedIn;

    subscribeAuthState((authState) => {
      const currentUserId = authState.user?.id || null;
      const userChanged = currentUserId !== lastAuthUserId;
      const loginStateChanged = authState.isLoggedIn !== lastIsLoggedIn;

      lastAuthUserId = currentUserId;
      lastIsLoggedIn = authState.isLoggedIn;

      if (userChanged) {
        refreshRoute();
        return;
      }

      if (loginStateChanged) {
        refreshRoute();
      }
    });
  }
})();
