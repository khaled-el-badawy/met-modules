/* ======================================
   Study With Me - Admin Panel Logic
   Uses Firestore + Firebase Auth
   ====================================== */

let currentAdminName = '';
let currentUserRole = 'admin';
let currentUserUid = '';

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
  currentUserUid = uid;
  try {
    const docRef = db.collection('admins').doc(uid);
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      currentAdminName = data.name || '';
      currentUserRole = data.role || 'admin'; // Legacy users are admins by default

      // Patch legacy docs with missing role or createdAt
      if (!data.role || !data.createdAt) {
        try {
          await docRef.set({
            role: currentUserRole,
            createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (err) {
          console.warn('Could not patch legacy user:', err);
        }
      }

      if (currentUserRole === 'admin' || currentUserRole === 'super_admin') {
        const navAddUser = document.getElementById('nav-add-user');
        if (navAddUser) navAddUser.style.display = 'block';
      }
      if (currentAdminName) {
        updateAdminNameDisplay();
      } else {
        showNameModal();
      }
    } else {
      // New user, defaults to admin if none specified, but better to set later
      currentUserRole = 'contributor'; // Safe default if doc missing
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
  initUserForm();

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
    submitBtn.textContent = ' جاري الإضافة...';

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
      submitBtn.textContent = ' إضافة المادة';
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

  dropdown.innerHTML = '<option value=""> جاري التحميل...</option>';
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
    submitBtn.textContent = ' جاري الإضافة...';

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

      await DB.add('videos', { title, url, subject, year, createdBy: currentAdminName, createdByUid: currentUserUid });
      showToast('تم إضافة الفيديو بنجاح ');
      form.reset();
      if (previewContainer) previewContainer.innerHTML = '';
      loadExistingItems('add-video');
    } catch (error) {
      showToast('حدث خطأ في إضافة الفيديو', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = ' إضافة الفيديو';
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
    submitBtn.textContent = ' جاري الإضافة...';

    try {
      const title = document.getElementById('pdf-title').value.trim();
      const url = document.getElementById('pdf-url').value.trim();
      const year = document.getElementById('pdf-year').value;
      const subject = document.getElementById('pdf-subject').value.trim();

      if (!title || !url || !year) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      await DB.add('pdfs', { title, url, subject, year, createdBy: currentAdminName, createdByUid: currentUserUid });
      showToast('تم إضافة ملف PDF بنجاح ');
      form.reset();
      loadExistingItems('add-pdf');
    } catch (error) {
      showToast('حدث خطأ في إضافة الملف', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = ' إضافة الملف';
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
    submitBtn.textContent = ' جاري النشر...';

    try {
      const content = document.getElementById('post-content').value.trim();
      const year = document.getElementById('post-year').value;
      const subject = document.getElementById('post-subject').value.trim();
      const author = document.getElementById('post-author').value.trim();

      if (!content || !year) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      await DB.add('posts', { content, subject, author: author || 'المحاضر', year, createdBy: currentAdminName, createdByUid: currentUserUid });
      showToast('تم إضافة البوست بنجاح ');
      form.reset();
      loadExistingItems('add-post');
    } catch (error) {
      showToast('حدث خطأ في نشر البوست', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = ' نشر البوست';
    }
  });
}

// ======== User Form (Admin Only) ========
function initUserForm() {
  const form = document.getElementById('user-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'admin' && currentUserRole !== 'super_admin') {
      showToast('ليس لديك صلاحية لإضافة مستخدمين', 'error');
      return;
    }

    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = ' جاري الإضافة...';

    try {
      const email = document.getElementById('new-user-email').value.trim();
      const password = document.getElementById('new-user-password').value;
      const role = document.getElementById('new-user-role').value;

      if (!email || password.length < 6) {
        showToast('تم إدخال بيانات غير صحيحة', 'error');
        return;
      }

      // Create a secondary app to not sign out current admin
      let secondaryApp;
      try {
        secondaryApp = firebase.app("Secondary");
      } catch (e) {
        secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
      }
      const secondaryAuth = secondaryApp.auth();

      const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      const newUid = userCredential.user.uid;

      // Add to admins collection
      await db.collection('admins').doc(newUid).set({
        email: email,
        role: role,
        name: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // إعطاء مهلة صغيرة جداً لفايربيز لإكمال مهام الخلفية (مثل accounts:lookup) لمنع خطأ الـ Console
      await new Promise(resolve => setTimeout(resolve, 800));
      await secondaryAuth.signOut();

      showToast('تم إضافة المستخدم بنجاح ');
      form.reset();
      loadExistingItems('add-user');
    } catch (error) {
      console.error(error);
      let msg = 'حدث خطأ في إضافة المستخدم';
      if (error.code === 'auth/email-already-in-use') {
        msg = 'البريد الإلكتروني مستخدم بالفعل';
      } else if (error.code === 'auth/weak-password') {
        msg = 'كلمة المرور ضعيفة';
      } else if (error.code === 'permission-denied') {
        msg = 'ليس لديك صلاحية كافية (يرجى تتحديث الصلاحيات Rules)';
      }
      showToast(msg, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = ' إضافة المستخدم';
    }
  });
}

// ======== Load Existing Items ========
async function loadExistingItems(sectionId) {
  const typeMap = {
    'add-subject': 'subjects',
    'add-video': 'videos',
    'add-pdf': 'pdfs',
    'add-post': 'posts',
    'add-user': 'admins'
  };
  const type = typeMap[sectionId];
  const container = document.getElementById(type === 'admins' ? 'existing-users' : `existing-${type}`);
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:20px;color:var(--text-muted);">
      <span class="loading-spinner"></span> جاري التحميل...
    </div>
  `;

  const yearLabels = { '1': 'أولى', '2': 'تانية', '3': 'تالتة', '4': 'رابعة' };

  let allItems = [];

  if (type === 'admins') {
    if (currentUserRole !== 'admin' && currentUserRole !== 'super_admin') {
      container.innerHTML = '<div style="padding:20px;">ليس لديك صلاحية لعرض هذا المحتوى.</div>';
      return;
    }
    try {
      const snapshot = await db.collection('admins').get();
      snapshot.forEach(doc => allItems.push({ id: doc.id, ...doc.data() }));

      // Sort manually so users without createdAt don't disappear
      allItems.sort((a, b) => {
        const t1 = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : 0) : 0;
        const t2 = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : 0) : 0;
        return t2 - t1;
      });
    } catch (e) {
      console.error(e);
    }
  } else {
    for (let y = 1; y <= 4; y++) {
      const items = await DB.getAll(type, y);
      items.forEach(item => allItems.push({ ...item, yearNum: y }));
    }
  }

  if (allItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 20px;">
        <div class="empty-icon" style="font-size:2rem;"></div>
        <h3 style="font-size:1rem;">لا توجد عناصر بعد</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = allItems.map(item => {
    if (type === 'admins') {
      let roleLabel = 'مساهم';
      if (item.role === 'admin') roleLabel = 'مدير';
      if (item.role === 'super_admin') roleLabel = 'مدير عام (مؤسس)';

      let actionButtons = '';
      const safeName = (item.name || 'بدون اسم').replace(/'/g, "\\'");
      if (item.id === currentUserUid) {
        actionButtons = `<button class="btn-submit" style="padding:4px 8px;font-size:0.8rem;margin-left:8px;" onclick="showUserHistory('${item.id}', '${safeName}')">سجل الإضافات </button>` +
                        '<span style="color:var(--text-muted);font-size:0.8rem;">(حسابك)</span>';
      } else if (item.role === 'super_admin' && currentUserRole !== 'super_admin') {
        actionButtons = `<button class="btn-submit" style="padding:4px 8px;font-size:0.8rem;margin-left:8px;" onclick="showUserHistory('${item.id}', '${safeName}')">سجل الإضافات </button>` +
                        '<span style="color:var(--text-muted);font-weight:bold;font-size:0.8rem;"> مؤسس النظام</span>';
      } else {
        actionButtons = `<button class="btn-submit" style="padding:4px 8px;font-size:0.8rem;margin-left:8px;" onclick="showUserHistory('${item.id}', '${safeName}')">سجل الإضافات </button>
                          <button class="btn-danger" style="margin-right:8px;" onclick="deleteItem('${type}', '${item.id}')">حذف </button> 
                          <button class="btn-submit" style="padding:4px 8px;font-size:0.8rem;" onclick="editAdminRole('${item.id}', '${item.role}')">تعديل الصلاحية </button>`;
      }

      return `
        <div class="existing-item">
          <div class="item-info">
            <h4>${item.name || 'بدون اسم'} (${roleLabel})</h4>
            <span>البريد: ${item.email}</span>
          </div>
          <div class="item-actions">
            ${actionButtons}
          </div>
        </div>
      `;
    }

    // Role-based deletion logic for content
    const canDelete = currentUserRole === 'admin' || currentUserRole === 'super_admin' || (item.createdBy === currentAdminName) || (item.createdByUid === currentUserUid);

    return `
      <div class="existing-item">
        <div class="item-info">
          <h4>${item.title || item.name || (item.content ? item.content.substring(0, 60) + '...' : '')}</h4>
          <span>السنة ${yearLabels[item.year || item.yearNum]} ${item.subject ? '• ' + item.subject : ''} • ${formatDate(item.createdAt)}${item.createdBy ? ' • بواسطة: ' + item.createdBy : ''}</span>
        </div>
        <div class="item-actions">
          ${canDelete ? `<button class="btn-danger" onclick="deleteItem('${type}', '${item.id}')">حذف </button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ======== Delete Item (global) ========
async function deleteItem(type, id) {
  if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
    try {
      await DB.delete(type, id);
      showToast('تم الحذف بنجاح');

      if (type === 'admins') {
        alert("تنبيه هام: تم حذف صلاحيات المستخدم من النظام (لن يتمكن من الدخول كمدير)، ولكن الإيميل نفسه لا يزال مسجلاً في الفايربيز (Authentication) كحساب فارغ. لحذفه نهائياً يرجى حذفه يدوياً من قسم Authentication في لوحة تحكم الفايربيز.");
      }

      const activeSection = document.querySelector('.admin-section.active');
      if (activeSection) loadExistingItems(activeSection.id);
    } catch (error) {
      showToast('ليس لديك صلاحية', 'error');
    }
  }
}

// ======== Edit Role ========
window.editAdminRole = async function (id, currentRole) {
  if (currentRole === 'super_admin' && currentUserRole !== 'super_admin') {
    showToast('لا يمكنك تعديل صلاحية مؤسس النظام', 'error');
    return;
  }

  const newRole = prompt('ادخل الصلاحية الجديدة (مدير / مساهم):', currentRole === 'admin' ? 'مدير' : 'مساهم');
  if (!newRole) return;

  const roleCode = (newRole.trim() === 'مدير') ? 'admin' : (newRole.trim() === 'مساهم' ? 'contributor' : null);
  if (!roleCode) {
    showToast('يجب كتابة "مدير" أو "مساهم"', 'error');
    return;
  }

  try {
    await db.collection('admins').doc(id).update({
      role: roleCode,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('تم تحديث الصلاحية بنجاح');
    const activeSection = document.querySelector('.admin-section.active');
    if (activeSection) loadExistingItems(activeSection.id);
  } catch (error) {
    console.error(error);
    showToast('حدث خطأ في تحديث الصلاحية', 'error');
  }
};

// ======== Show User History ========
window.showUserHistory = async function(uid, userName) {
  const modal = document.getElementById('user-history-modal');
  const content = document.getElementById('user-history-content');
  const title = document.getElementById('history-modal-title');
  
  if (title) title.innerHTML = `<span style="font-size: 1.5rem;"></span> سجل إضافات: ${userName}`;
  if (modal) {
    modal.style.display = 'flex';
  }
  
  content.innerHTML = `
    <div style="text-align:center;padding:20px;color:var(--text-muted);">
      <span class="loading-spinner"></span> جاري التحميل...
    </div>
  `;

  try {
    let allHistory = [];
    
    for (const type of ['videos', 'pdfs', 'posts']) {
      const snapshot = await db.collection(type).where('createdByUid', '==', uid).get();
      snapshot.forEach(doc => {
        const data = doc.data();
        allHistory.push({
          id: doc.id,
          type: type,
          ...data
        });
      });
    }

    // Sort by createdAt descending
    allHistory.sort((a, b) => {
      const t1 = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : 0) : 0;
      const t2 = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : 0) : 0;
      return t2 - t1;
    });

    if (allHistory.length === 0) {
      content.innerHTML = `
        <div style="text-align:center;padding:40px 20px; color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:10px;"></div>
          <p>لم يقم هذا المستخدم بإضافة أي محتوى بعد.</p>
        </div>
      `;
      return;
    }

    const typeIcons = {
      'videos': '',
      'pdfs': '',
      'posts': ''
    };
    
    const typeLabel = {
      'videos': 'فيديو',
      'pdfs': 'ملف PDF',
      'posts': 'بوست'
    };

    content.innerHTML = allHistory.map(item => {
      const titleText = item.title || item.name || (item.content ? item.content.substring(0, 50) + '...' : 'بدون عنوان');
      const dateText = item.createdAt ? formatDate(item.createdAt) : 'تاريخ غير معروف';
      const subjectText = item.subject ? `المادة: ${item.subject}` : '';
      const yearLabels = { '1': 'الأولى', '2': 'الثانية', '3': 'الثالثة', '4': 'الرابعة' };
      const yearText = item.year ? `السنة: ${yearLabels[item.year] || item.year}` : '';
      
      let linkUrl = '#';
      if (item.type === 'videos' || item.type === 'pdfs') {
        linkUrl = item.url;
      } else {
        linkUrl = `year.html?year=${item.year}`;
      }

      // Google search history style look
      return `
        <div style="display: flex; align-items: flex-start; gap: 15px; padding: 15px; border-bottom: 1px solid rgba(108, 99, 255, 0.1); background: var(--bg-surface); transition: background 0.2s; border-radius: var(--radius-sm); margin-bottom: 8px;">
          <div style="font-size: 1.4rem; background: rgba(108, 99, 255, 0.08); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: var(--primary); flex-shrink: 0;">
            ${typeIcons[item.type] || ''}
          </div>
          <div style="flex-grow: 1; text-align: right;">
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px; font-size: 1rem; line-height: 1.4;">
              ${titleText}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="background: var(--gradient-primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold;">
                ${typeLabel[item.type] || 'محتوى'}
              </span>
              <span> ${dateText}</span>
              ${yearText ? `<span style="background: rgba(108, 99, 255, 0.08); color: var(--primary); padding: 2px 8px; border-radius: 12px; font-weight: 600;"> ${yearText}</span>` : ''}
              ${subjectText ? `<span style="background: rgba(108, 99, 255, 0.08); color: var(--primary); padding: 2px 8px; border-radius: 12px; font-weight: 600;">${subjectText}</span>` : ''}
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: center; margin-right: 10px;">
            <a href="${linkUrl}" target="_blank" style="display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: rgba(108, 99, 255, 0.1); color: var(--primary); border-radius: 20px; text-decoration: none; font-size: 0.8rem; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.background='var(--gradient-primary)'; this.style.color='white';" onmouseout="this.style.background='rgba(108, 99, 255, 0.1)'; this.style.color='var(--primary)';">
              عرض 
            </a>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading history:', error);
    content.innerHTML = '<div style="color:var(--accent);text-align:center;padding:20px;">حدث خطأ في جلب بيانات السجل. تأكد من إعدادات الفايربيز (Indexes/Rules).</div>';
  }
};

