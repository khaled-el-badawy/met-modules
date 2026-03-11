/* ======================================
   MET Modules - Main Application Logic
   Uses Firestore for data storage
   ====================================== */

// ======== YouTube Helpers ========
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getYouTubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// ======== Toast Notifications ========
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : '❌';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// ======== Date Formatter ========
function formatDate(timestamp) {
  if (!timestamp) return '';
  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('ar-EG', options);
}

// ======== Navbar ========
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.navbar-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      menuBtn.innerHTML = navLinks.classList.contains('open') ? '✕' : '☰';
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuBtn.innerHTML = '☰';
      });
    });
  }
}

// ======== Loading Spinner ========
function showLoading(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="loading-spinner"></div>
      <p style="margin-top:16px;color:var(--text-muted)">جاري التحميل...</p>
    </div>
  `;
}

// ======== Home Page ========
async function initHomePage() {
  // Update hero stats
  const [videoCount, pdfCount, postCount] = await Promise.all([
    DB.getTotalCount('videos'),
    DB.getTotalCount('pdfs'),
    DB.getTotalCount('posts')
  ]);

  const totalVideos = document.getElementById('total-videos');
  const totalPdfs = document.getElementById('total-pdfs');
  const totalPosts = document.getElementById('total-posts');

  if (totalVideos) animateNumber(totalVideos, videoCount);
  if (totalPdfs) animateNumber(totalPdfs, pdfCount);
  if (totalPosts) animateNumber(totalPosts, postCount);

  // Update year card stats
  for (let y = 1; y <= 4; y++) {
    const card = document.querySelector(`.year-card[data-year="${y}"]`);
    if (!card) continue;

    const [vc, pc, postc] = await Promise.all([
      DB.getCount('videos', y),
      DB.getCount('pdfs', y),
      DB.getCount('posts', y)
    ]);

    const videoEl = card.querySelector('.video-count');
    const pdfEl = card.querySelector('.pdf-count');
    const postEl = card.querySelector('.post-count');

    if (videoEl) videoEl.textContent = vc;
    if (pdfEl) pdfEl.textContent = pc;
    if (postEl) postEl.textContent = postc;
  }
}

function animateNumber(element, target) {
  let current = 0;
  const duration = 1000;
  const step = target / (duration / 16);

  function update() {
    current += step;
    if (current >= target) {
      element.textContent = target;
      return;
    }
    element.textContent = Math.floor(current);
    requestAnimationFrame(update);
  }
  
  if (target > 0) update();
  else element.textContent = '0';
}

// ======== Year Page ========
const yearNames = {
  '1': 'السنة الأولى',
  '2': 'السنة الثانية',
  '3': 'السنة الثالثة',
  '4': 'السنة الرابعة'
};

let currentYear = '1';
let searchTimeout = null;

async function initYearPage() {
  const urlParams = new URLSearchParams(window.location.search);
  currentYear = urlParams.get('year') || '1';

  // Update page info
  const pageTitle = document.getElementById('year-title');
  const pageSubtitle = document.getElementById('year-subtitle');
  const breadcrumbYear = document.getElementById('breadcrumb-year');

  if (pageTitle) pageTitle.textContent = yearNames[currentYear] || 'السنة الأولى';
  if (pageSubtitle) pageSubtitle.textContent = `محتوى ${yearNames[currentYear]} - نظم معلومات الأعمال`;
  if (breadcrumbYear) breadcrumbYear.textContent = yearNames[currentYear];
  document.title = `${yearNames[currentYear]} | MET Modules`;

  // Highlight active nav link
  document.querySelectorAll('.navbar-links a').forEach(link => {
    if (link.href && link.href.includes(`year=${currentYear}`)) {
      link.classList.add('active');
    }
  });

  // Init tabs
  initTabs();

  // Load initial content
  await loadVideos(currentYear);
  updateTabCounts(currentYear);

  // Search with debounce
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = e.target.value;
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (activeTab === 'videos') loadVideos(currentYear, query);
        else if (activeTab === 'pdfs') loadPDFs(currentYear, query);
        else if (activeTab === 'posts') loadPosts(currentYear, query);
      }, 300);
    });
  }
}

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      const content = document.getElementById(`tab-${tabId}`);
      if (content) content.classList.add('active');

      // Clear search  
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = '';

      // Load content
      if (tabId === 'videos') await loadVideos(currentYear);
      else if (tabId === 'pdfs') await loadPDFs(currentYear);
      else if (tabId === 'posts') await loadPosts(currentYear);
    });
  });
}

async function updateTabCounts(year) {
  const [vc, pc, postc] = await Promise.all([
    DB.getCount('videos', year),
    DB.getCount('pdfs', year),
    DB.getCount('posts', year)
  ]);

  const videoCount = document.querySelector('.tab-btn[data-tab="videos"] .tab-count');
  const pdfCount = document.querySelector('.tab-btn[data-tab="pdfs"] .tab-count');
  const postCount = document.querySelector('.tab-btn[data-tab="posts"] .tab-count');

  if (videoCount) videoCount.textContent = vc;
  if (pdfCount) pdfCount.textContent = pc;
  if (postCount) postCount.textContent = postc;
}

// ======== Load Videos ========
async function loadVideos(year, query = '') {
  const container = document.getElementById('videos-container');
  if (!container) return;

  showLoading(container);
  const videos = query ? await DB.search('videos', year, query) : await DB.getAll('videos', year);

  if (videos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎬</div>
        <h3>لا توجد فيديوهات بعد</h3>
        <p>سيتم إضافة فيديوهات قريباً إن شاء الله</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="content-grid">${videos.map(video => {
    const videoId = extractYouTubeId(video.url);
    const thumbnail = videoId ? getYouTubeThumbnail(videoId) : '';
    return `
      <a href="${video.url}" target="_blank" rel="noopener" class="video-card animate-in">
        <div class="video-thumbnail">
          ${thumbnail ? `<img src="${thumbnail}" alt="${video.title}" loading="lazy">` : ''}
          <div class="video-play-btn">▶</div>
        </div>
        <div class="video-info">
          ${video.subject ? `<span class="subject-tag">${video.subject}</span>` : ''}
          <h3>${video.title}</h3>
          <div class="video-meta">
            <span>📅 ${formatDate(video.createdAt)}</span>
          </div>
        </div>
      </a>
    `;
  }).join('')}</div>`;
}

// ======== Load PDFs ========
async function loadPDFs(year, query = '') {
  const container = document.getElementById('pdfs-container');
  if (!container) return;

  showLoading(container);
  const pdfs = query ? await DB.search('pdfs', year, query) : await DB.getAll('pdfs', year);

  if (pdfs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <h3>لا توجد ملفات PDF بعد</h3>
        <p>سيتم إضافة ملفات قريباً إن شاء الله</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="content-grid">${pdfs.map(pdf => `
    <div class="pdf-card animate-in">
      <div class="pdf-icon">📄</div>
      <div class="pdf-info">
        <h3>${pdf.title}</h3>
        <div class="pdf-meta">
          ${pdf.subject ? `<span>📚 ${pdf.subject}</span>` : ''}
          <span>📅 ${formatDate(pdf.createdAt)}</span>
        </div>
      </div>
      <a href="${pdf.url}" target="_blank" rel="noopener" class="pdf-download-btn" title="تحميل">⬇</a>
    </div>
  `).join('')}</div>`;
}

// ======== Load Posts ========
async function loadPosts(year, query = '') {
  const container = document.getElementById('posts-container');
  if (!container) return;

  showLoading(container);
  const posts = query ? await DB.search('posts', year, query) : await DB.getAll('posts', year);

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>لا توجد بوستات بعد</h3>
        <p>سيتم إضافة بوستات قريباً إن شاء الله</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="content-grid">${posts.map(post => `
    <div class="post-card animate-in">
      <div class="post-header">
        <div class="post-avatar">م</div>
        <div class="post-author-info">
          <h4>${post.author || 'المحاضر'}</h4>
          <span>${formatDate(post.createdAt)}</span>
        </div>
      </div>
      <div class="post-content">${post.content}</div>
      ${post.subject ? `
        <div class="post-tags">
          <span class="post-tag">${post.subject}</span>
        </div>
      ` : ''}
    </div>
  `).join('')}</div>`;
}

// ======== Init ========
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();

  if (document.querySelector('.hero')) {
    initHomePage();
  }

  if (document.querySelector('.year-page-header')) {
    initYearPage();
  }
});
