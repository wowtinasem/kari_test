// ===========================
// Auth Module (localStorage)
// ===========================
const Auth = (function() {
  const USERS_KEY = 'kari_users';
  const SESSION_KEY = 'kari_session';
  const POSTS_KEY = 'kari_posts';
  const GOOGLE_PENDING_KEY = 'kari_google_pending';

  // ★ Google OAuth Client ID - 실제 배포 시 본인의 Client ID로 교체하세요
  // Google Cloud Console → APIs & Services → Credentials 에서 생성
  const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

  // Initialize default admin account
  function init() {
    const users = getUsers();
    const hasAdmin = users.some(u => u.role === 'admin');
    if (!hasAdmin) {
      users.push({
        name: '관리자',
        email: 'admin@kari.co.kr',
        password: hashPassword('admin1234'),
        role: 'admin',
        provider: 'email',
        createdAt: formatDate(new Date())
      });
      saveUsers(users);
    }
  }

  // Simple hash (for demo purposes - not for production)
  function hashPassword(pw) {
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
      const char = pw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'h_' + Math.abs(hash).toString(36);
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + d;
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getPosts() {
    try {
      return JSON.parse(localStorage.getItem(POSTS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function savePosts(posts) {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  }

  // ===========================
  // Email Signup
  // ===========================
  function signup({ name, email, password, role }) {
    if (!name || !email || !password || !role) {
      return { success: false, message: '모든 항목을 입력해주세요.' };
    }
    if (password.length < 8) {
      return { success: false, message: '비밀번호는 8자 이상이어야 합니다.' };
    }

    const users = getUsers();
    if (users.some(u => u.email === email)) {
      return { success: false, message: '이미 등록된 이메일입니다.' };
    }

    users.push({
      name: name,
      email: email,
      password: hashPassword(password),
      role: role,
      provider: 'email',
      createdAt: formatDate(new Date())
    });
    saveUsers(users);

    return { success: true, message: '회원가입이 완료되었습니다! 로그인해주세요.' };
  }

  // ===========================
  // Email Login
  // ===========================
  function login(email, password) {
    if (!email || !password) {
      return { success: false, message: '이메일과 비밀번호를 입력해주세요.' };
    }

    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return { success: false, message: '등록되지 않은 이메일입니다.' };
    }

    if (user.provider === 'google') {
      return { success: false, message: 'Google 계정으로 가입된 이메일입니다. Google로 로그인해주세요.' };
    }

    if (user.password !== hashPassword(password)) {
      return { success: false, message: '비밀번호가 올바르지 않습니다.' };
    }

    // Save session
    const session = {
      name: user.name,
      email: user.email,
      role: user.role,
      provider: 'email'
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { success: true, message: '로그인 성공! 환영합니다, ' + user.name + '님.' };
  }

  // ===========================
  // Google Login / Signup
  // ===========================
  function decodeJwtPayload(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  function handleGoogleCredential(response, mode) {
    const payload = decodeJwtPayload(response.credential);
    if (!payload) {
      showAuthMessage('Google 인증에 실패했습니다.', 'error');
      return;
    }

    const googleEmail = payload.email;
    const googleName = payload.name || googleEmail.split('@')[0];
    const users = getUsers();
    const existingUser = users.find(u => u.email === googleEmail);

    if (mode === 'login') {
      if (existingUser) {
        // Existing user → login
        const session = {
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          provider: existingUser.provider || 'google'
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        showAuthMessage('로그인 성공! 환영합니다, ' + existingUser.name + '님.', 'success');
        setTimeout(function() { window.location.href = 'index.html'; }, 800);
      } else {
        // Not registered → redirect to signup
        showAuthMessage('등록되지 않은 계정입니다. 회원가입 페이지로 이동합니다.', 'error');
        setTimeout(function() { window.location.href = 'signup.html'; }, 1200);
      }
    } else {
      // Signup mode
      if (existingUser) {
        showAuthMessage('이미 등록된 이메일입니다. 로그인 페이지로 이동합니다.', 'error');
        setTimeout(function() { window.location.href = 'login.html'; }, 1200);
        return;
      }

      // Save pending Google data and show role selection modal
      localStorage.setItem(GOOGLE_PENDING_KEY, JSON.stringify({
        name: googleName,
        email: googleEmail
      }));

      const roleModal = document.getElementById('roleModal');
      if (roleModal) {
        roleModal.classList.add('active');
      }
    }
  }

  function googleLogin(mode) {
    // Check if Google Identity Services is loaded
    if (typeof google === 'undefined' || !google.accounts) {
      showAuthMessage('Google 로그인 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.', 'error');
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: function(response) {
          handleGoogleCredential(response, mode);
        }
      });

      google.accounts.id.prompt(function(notification) {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: use popup mode
          google.accounts.id.renderButton(
            document.createElement('div'),
            { theme: 'outline', size: 'large' }
          );
          // Show manual prompt
          showAuthMessage('팝업이 차단되었을 수 있습니다. 브라우저 설정을 확인해주세요.', 'error');
        }
      });
    } catch (err) {
      showAuthMessage('Google 로그인 초기화에 실패했습니다. Client ID를 확인해주세요.', 'error');
    }
  }

  function completeGoogleSignup(role, extraInfo) {
    var pendingData;
    try {
      pendingData = JSON.parse(localStorage.getItem(GOOGLE_PENDING_KEY));
    } catch {
      pendingData = null;
    }

    if (!pendingData) {
      showAuthMessage('Google 계정 정보를 찾을 수 없습니다. 다시 시도해주세요.', 'error');
      return;
    }

    var userName = (extraInfo && extraInfo.name) ? extraInfo.name : pendingData.name;
    var userPhone = (extraInfo && extraInfo.phone) ? extraInfo.phone : '';

    const users = getUsers();
    users.push({
      name: userName,
      email: pendingData.email,
      password: null,
      phone: userPhone,
      role: role,
      provider: 'google',
      createdAt: formatDate(new Date())
    });
    saveUsers(users);

    // Auto-login after signup
    const session = {
      name: userName,
      email: pendingData.email,
      role: role,
      provider: 'google'
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(GOOGLE_PENDING_KEY);

    // Close modal and redirect
    var modal = document.getElementById('roleModal');
    if (modal) modal.classList.remove('active');

    showAuthMessage('Google 회원가입이 완료되었습니다!', 'success');
    setTimeout(function() { window.location.href = 'index.html'; }, 800);
  }

  function showAuthMessage(message, type) {
    var msgEl = document.getElementById('authMessage');
    if (msgEl) {
      msgEl.className = 'auth-message ' + type;
      msgEl.textContent = message;
    }
  }

  // ===========================
  // Logout
  // ===========================
  function logout() {
    localStorage.removeItem(SESSION_KEY);
    // Revoke Google session if applicable
    if (typeof google !== 'undefined' && google.accounts) {
      try { google.accounts.id.disableAutoSelect(); } catch(e) {}
    }
    window.location.href = 'index.html';
  }

  // Get current user
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  }

  // Check login status
  function isLoggedIn() {
    return getCurrentUser() !== null;
  }

  // Password strength checker
  function checkPasswordStrength(password) {
    if (!password) return { level: '', text: '' };
    if (password.length < 8) return { level: 'weak', text: '약함 - 8자 이상 입력하세요' };

    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (password.length >= 12) score++;

    if (score <= 2) return { level: 'weak', text: '약함' };
    if (score <= 3) return { level: 'medium', text: '보통' };
    return { level: 'strong', text: '강함' };
  }

  // Update navigation auth buttons based on login state
  function updateNavAuth() {
    const authEl = document.getElementById('navAuth');
    if (!authEl) return;

    const user = getCurrentUser();

    if (user) {
      let adminBtn = '';
      if (user.role === 'admin') {
        adminBtn = '<a href="admin.html" class="nav-btn nav-btn-admin">관리자</a>';
      }
      authEl.innerHTML =
        '<span class="nav-user-name">' + escapeHtml(user.name) + '님</span>' +
        adminBtn +
        '<button class="nav-btn nav-btn-logout" id="logoutBtn">로그아웃</button>';

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
          logout();
        });
      }
    } else {
      authEl.innerHTML =
        '<a href="login.html" class="nav-btn nav-btn-login">로그인</a>' +
        '<a href="signup.html" class="nav-btn nav-btn-signup">회원가입</a>';
    }
  }

  // Get all users (for admin)
  function getAllUsers() {
    return getUsers();
  }

  // Delete user (for admin)
  function deleteUser(email) {
    let users = getUsers();
    users = users.filter(u => u.email !== email);
    saveUsers(users);
  }

  // Get all posts (for admin)
  function getAllPosts() {
    return getPosts();
  }

  // Add post
  function addPost(author, text) {
    const posts = getPosts();
    posts.unshift({
      author: author,
      text: text,
      date: formatDate(new Date())
    });
    savePosts(posts);
  }

  // Delete post (for admin)
  function deletePost(index) {
    const posts = getPosts();
    if (index >= 0 && index < posts.length) {
      posts.splice(index, 1);
      savePosts(posts);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initialize on load
  init();

  return {
    signup,
    login,
    logout,
    googleLogin,
    completeGoogleSignup,
    getCurrentUser,
    isLoggedIn,
    checkPasswordStrength,
    updateNavAuth,
    getAllUsers,
    deleteUser,
    getAllPosts,
    addPost,
    deletePost
  };
})();

// Auto-update nav on every page load
document.addEventListener('DOMContentLoaded', function() {
  Auth.updateNavAuth();
});
