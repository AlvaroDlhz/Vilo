import './style.css';
import './components/MainContent/MainContent.css';
import { Navbar } from './components/Navbar/Navbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Banner } from './components/Banner/Banner';
import { VideoGrid } from './components/VideoGrid/VideoGrid';
import { WatchPage } from './components/WatchPage/WatchPage';
import { getAllVideos, getVideoById } from './data/videoStore';
import { getChannelById } from './data/channelStore';
import { Feed, filterVideosByFeed, getPredefinedFeeds } from './data/feedStore';
import { ChannelPage } from './components/ChannelPage/ChannelPage';
import { addRoute, navigate, startRouter } from './router/router';

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
        title: v.title,
        channelName: v.channelName,
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
    mainContent.append(banner, videoGrid);

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
    contentContainer.innerHTML = '';

    const channel = getChannelById(params.id);
    if (!channel) {
      navigate('/');
      return;
    }

    const tab = params.tab || 'videos';
    const channelPage = ChannelPage({ channel, activeTab: tab });
    contentContainer.appendChild(channelPage);

    window.scrollTo(0, 0);
  }

  addRoute('/', renderHome);
  addRoute('/watch/:id', renderWatch);
  addRoute('/channel/:id', (params) => {
    // Replace instead of push to avoid back-button loop
    window.location.replace(`#/channel/${params.id}/videos`);
  });
  addRoute('/channel/:id/:tab', renderChannel);
  startRouter();
}
