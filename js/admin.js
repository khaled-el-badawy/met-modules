/* ======================================
   Study With Me - Admin Panel Logic
   Uses Firestore + Firebase Auth
   ====================================== */

let currentAdminName = '';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();

  // Protect this page - require login
  Auth.protectRoute();

  // Wait for auth state then init
  Auth.onAuthChange(async (user) => {
    if (user) {
      // Show user info
      const userEmail = document.getElementById('admin-user-email');
      if (userEmail) userEmail.textContent = user.email;

      // Check if admin has a name set
      await checkAdminName(user.uid);

      initAdminPanel();
    }
  });

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => Auth.logout());
  }

  // Name modal save button
  const saveNameBtn = document.getElementById('save-admin-name-btn');
  if (saveNameBtn) {
    saveNameBtn.addEventListener('click', saveAdminName);
  }
});

// ======== Admin Name System ========
async function checkAdminName(uid) {
  try {
    const doc = await db.collection('admins').doc(uid).get();
    if (doc.exists && doc.data().name) {
      currentAdminName = doc.data().name;
      updateAdminNameDisplay();
    } else {
      // Show name prompt modal
      showNameModal();
    }
  } catch (error) {
    console.error('Error checking admin name:', error);
  }
}

function showNameModal() {
  const modal = document.getElementById('admin-name-modal');
  if (modal) modal.style.display = 'flex';
}

function hideNameModal() {
  const modal = document.getElementById('admin-name-modal');
  if (modal) modal.style.display = 'none';
}

async function saveAdminName() {
  const nameInput = document.getElementById('admin-name-input');
  const name = nameInput?.value.trim();

  if (!name) {
    showToast('يرجى إدخال اسمك', 'error');
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  try {
    await db.collection('admins').doc(user.uid).set({
      name: name,
      email: user.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    currentAdminName = name;
    updateAdminNameDisplay();
    hideNameModal();
    showToast('تم حفظ اسمك بنجاح ');
  } catch (error) {
    console.error('Error saving admin name:', error);
    showToast('حدث خطأ في حفظ الاسم', 'error');
  }
}

function updateAdminNameDisplay() {
  const nameDisplay = document.getElementById('admin-display-name');
  if (nameDisplay) nameDisplay.textContent = currentAdminName;
}

function initAdminPanel() {
  // Admin navigation
  const navItems = document.querySelectorAll('.admin-nav-item');
  const sections = document.querySelectorAll('.admin-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      item.classList.add('active');
      const sectionId = item.dataset.section;
      document.getElementById(sectionId)?.classList.add('active');

      loadExistingItems(sectionId);
    });
  });

  // Load first section
  loadExistingItems('add-video');

  // Init forms
  initSubjectForm();
  initVideoForm();
  initPDFForm();
  initPostForm();

  // Setup dependent dropdowns
  setupSubjectDependentDropdown('video-year', 'video-subject');
  setupSubjectDependentDropdown('pdf-year', 'pdf-subject');
  setupSubjectDependentDropdown('post-year', 'post-subject');
}

// ======== Subject Form ========
function initSubjectForm() {
  const form = document.getElementById('subject-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري الإضافة...';

    try {
      const name = document.getElementById('subject-name').value.trim();
      const year = document.getElementById('subject-year').value;

      if (!name || !year) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      await DB.add('subjects', { name, year, title: name });
      showToast('تم إضافة المادة بنجاح ');
      form.reset();
      loadExistingItems('add-subject');
    } catch (error) {
      showToast('حدث خطأ في إضافة المادة', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '➕ إضافة المادة';
    }
  });
}

// ======== Dependent Dropdowns ========
async function updateSubjectDropdowns(year, dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  if (!year) {
    dropdown.innerHTML = '<option value="">اختار المادة</option>';
    return;
  }

  dropdown.innerHTML = '<option value="">⏳ جاري التحميل...</option>';
  const subjects = await DB.getAll('subjects', year);

  dropdown.innerHTML = '<option value="">اختار المادة</option>';
  subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub.name;
    opt.textContent = sub.name;
    dropdown.appendChild(opt);
  });
}

function setupSubjectDependentDropdown(yearDropdownId, subjectDropdownId) {
  const yearDropdown = document.getElementById(yearDropdownId);
  if (yearDropdown) {
    yearDropdown.addEventListener('change', (e) => {
      updateSubjectDropdowns(e.target.value, subjectDropdownId);
    });
  }
}


// ======== Video Form ========
function initVideoForm() {
  const form = document.getElementById('video-form');
  if (!form) return;

  const urlInput = document.getElementById('video-url');
  const previewContainer = document.getElementById('video-preview');

  if (urlInput && previewContainer) {
    urlInput.addEventListener('input', () => {
      const videoId = extractYouTubeId(urlInput.value);
      if (videoId) {
        previewContainer.innerHTML = `
          <img src="${getYouTubeThumbnail(videoId)}" 
               alt="معاينة" 
               style="width:100%;border-radius:var(--radius-sm);margin-top:8px;">
        `;
      } else {
        previewContainer.innerHTML = '';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري الإضافة...';

    try {
      const title = document.getElementById('video-title').value.trim();
      const url = document.getElementById('video-url').value.trim();
      const year = document.getElementById('video-year').value;
      const subject = document.getElementById('video-subject').value.trim();

      if (!title || !url || !year) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      if (!extractYouTubeId(url)) {
        showToast('يرجى إدخال رابط يوتيوب صحيح', 'error');
        return;
      }

      await DB.add('videos', { title, url, subject, year, createdBy: currentAdminName });
      showToast('تم إضافة الفيديو بنجاح ');
      form.reset();
      if (previewContainer) previewContainer.innerHTML = '';
      loadExistingItems('add-video');
    } catch (error) {
      showToast('حدث خطأ في إضافة الفيديو', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '➕ إضافة الفيديو';
    }
  });
}

// ======== PDF Form ========
function initPDFForm() {
  const form = document.getElementById('pdf-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري الإضافة...';

    try {
      const title = document.getElementById('pdf-title').value.trim();
      const url = document.getElementById('pdf-url').value.trim();
      const year = document.getElementById('pdf-year').value;
      const subject = document.getElementById('pdf-subject').value.trim();

      if (!title || !url || !year) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      await DB.add('pdfs', { title, url, subject, year, createdBy: currentAdminName });
      showToast('تم إضافة ملف PDF بنجاح ');
      form.reset();
      loadExistingItems('add-pdf');
    } catch (error) {
      showToast('حدث خطأ في إضافة الملف', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '➕ إضافة الملف';
    }
  });
}

// ======== Post Form ========
function initPostForm() {
  const form = document.getElementById('post-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري النشر...';

    try {
      const content = document.getElementById('post-content').value.trim();
      const year = document.getElementById('post-year').value;
      const subject = document.getElementById('post-subject').value.trim();
      const author = document.getElementById('post-author').value.trim();

      if (!content || !year) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      await DB.add('posts', { content, subject, author: author || 'المحاضر', year, createdBy: currentAdminName });
      showToast('تم إضافة البوست بنجاح ');
      form.reset();
      loadExistingItems('add-post');
    } catch (error) {
      showToast('حدث خطأ في نشر البوست', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '➕ نشر البوست';
    }
  });
}

// ======== Load Existing Items ========
async function loadExistingItems(sectionId) {
  const typeMap = {
    'add-subject': 'subjects',
    'add-video': 'videos',
    'add-pdf': 'pdfs',
    'add-post': 'posts'
  };
  const type = typeMap[sectionId];
  const container = document.getElementById(`existing-${type}`);
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:20px;color:var(--text-muted);">
      <span class="loading-spinner"></span> جاري التحميل...
    </div>
  `;

  const yearLabels = { '1': 'أولى', '2': 'تانية', '3': 'تالتة', '4': 'رابعة' };

  let allItems = [];
  for (let y = 1; y <= 4; y++) {
    const items = await DB.getAll(type, y);
    items.forEach(item => allItems.push({ ...item, yearNum: y }));
  }

  if (allItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 20px;">
        <div class="empty-icon" style="font-size:2rem;">📭</div>
        <h3 style="font-size:1rem;">لا توجد عناصر بعد</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = allItems.map(item => `
    <div class="existing-item">
      <div class="item-info">
        <h4>${item.title || item.name || (item.content ? item.content.substring(0, 60) + '...' : '')}</h4>
        <span>السنة ${yearLabels[item.year || item.yearNum]} ${item.subject ? '• ' + item.subject : ''} • ${formatDate(item.createdAt)}${item.createdBy ? ' • بواسطة: ' + item.createdBy : ''}</span>
      </div>
      <div class="item-actions">
        <button class="btn-danger" onclick="deleteItem('${type}', '${item.id}')">
          حذف 🗑
        </button>
      </div>
    </div>
  `).join('');
}

// ======== Delete Item (global) ========
async function deleteItem(type, id) {
  if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
    try {
      await DB.delete(type, id);
      showToast('تم الحذف بنجاح');
      const activeSection = document.querySelector('.admin-section.active');
      if (activeSection) loadExistingItems(activeSection.id);
    } catch (error) {
      showToast('حدث خطأ في الحذف', 'error');
    }
  }
}
