/* ======================================
   MET Modules - Authentication Manager
   ====================================== */

const Auth = {
  // ======== Check if user is logged in ========
  isLoggedIn() {
    return auth.currentUser !== null;
  },

  // ======== Login ========
  async login(email, password) {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: result.user };
    } catch (error) {
      let message = 'حدث خطأ في تسجيل الدخول';
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'البريد الإلكتروني غير مسجل';
          break;
        case 'auth/wrong-password':
          message = 'كلمة المرور غير صحيحة';
          break;
        case 'auth/invalid-email':
          message = 'البريد الإلكتروني غير صالح';
          break;
        case 'auth/too-many-requests':
          message = 'محاولات كثيرة، حاول بعد قليل';
          break;
        case 'auth/invalid-credential':
          message = 'بيانات الدخول غير صحيحة';
          break;
      }
      return { success: false, message };
    }
  },

  // ======== Logout ========
  async logout() {
    try {
      await auth.signOut();
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // ======== Listen to auth state changes ========
  onAuthChange(callback) {
    auth.onAuthStateChanged(callback);
  },

  // ======== Protect admin page ========
  protectRoute() {
    auth.onAuthStateChanged(user => {
      if (!user) {
        window.location.href = 'login.html';
      }
    });
  }
};
