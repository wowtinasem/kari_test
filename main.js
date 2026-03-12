// ===========================
// Navbar Scroll Effect
// ===========================
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// ===========================
// Mobile Navigation Toggle
// ===========================
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  navMenu.classList.toggle('open');
});

// Close menu when a nav link is clicked
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navMenu.classList.remove('open');
  });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
    navToggle.classList.remove('active');
    navMenu.classList.remove('open');
  }
});

// ===========================
// Active Nav Link Highlight
// ===========================
const sections = document.querySelectorAll('section[id]');

function highlightNav() {
  const scrollPos = window.scrollY + 100;

  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    const link = document.querySelector(`.nav-link[href="#${id}"]`);

    if (link) {
      if (scrollPos >= top && scrollPos < top + height) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    }
  });
}

window.addEventListener('scroll', highlightNav);

// ===========================
// Scroll Reveal Animation
// ===========================
function initReveal() {
  const revealTargets = document.querySelectorAll(
    '.service-card, .pillar-card, .section-title, .vision-statement, .community-layout, .mission-bottom'
  );

  revealTargets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  revealTargets.forEach(el => observer.observe(el));
}

initReveal();

// ===========================
// Load Board Posts (admin-created)
// ===========================
function loadBoardPosts() {
  const boardItems = document.getElementById('boardItems');
  const boardEmpty = document.getElementById('boardEmpty');
  if (!boardItems || typeof Auth === 'undefined') return;

  const posts = Auth.getAllPosts();
  boardItems.innerHTML = '';

  if (posts.length === 0) {
    if (boardEmpty) boardEmpty.style.display = 'block';
    return;
  }

  if (boardEmpty) boardEmpty.style.display = 'none';

  posts.forEach(post => {
    const li = document.createElement('li');
    li.className = 'board-item';
    li.innerHTML = `
      <span class="board-author">${escapeHtml(post.author)}</span>
      <span class="board-text">${escapeHtml(post.text)}</span>
      <span class="board-date">${escapeHtml(post.date)}</span>
    `;
    boardItems.appendChild(li);
  });
}

loadBoardPosts();

// ===========================
// Board Form Submission (상담 신청)
// ===========================
const boardForm = document.getElementById('boardForm');

if (boardForm) {
  boardForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('userName').value.trim();
    const region = document.getElementById('userRegion').value.trim();
    const userType = document.querySelector('input[name="userType"]:checked');
    const requestType = document.querySelector('input[name="requestType"]:checked');
    const phone = document.getElementById('userPhone').value.trim();
    const message = document.getElementById('userMessage').value.trim();

    if (!name || !region || !userType || !requestType || !phone || !message) return;

    // Reset form and show confirmation
    boardForm.reset();
    alert('신청이 완료되었습니다. 담당 컨설턴트가 연락드리겠습니다.');
  });
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
