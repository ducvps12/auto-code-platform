// ============ Nemark Academy — Interactive JS ============

const API = '';

// ============ COURSE DATA ============
const COURSES = [
  { id: 'scratch-kids', title: 'Scratch cho bé', desc: 'Học lập trình qua kéo thả, tạo game và hoạt hình vui nhộn.', emoji: '🧩', cover: 'linear-gradient(135deg,#f472b6,#ec4899)', level: 'Cơ bản', duration: '8 tuần', lessons: 16, tags: ['beginner'], free: true },
  { id: 'python-basic', title: 'Python từ Zero', desc: 'Ngôn ngữ lập trình phổ biến nhất thế giới, dễ học, mạnh mẽ.', emoji: '🐍', cover: 'linear-gradient(135deg,#fbbf24,#f59e0b)', level: 'Cơ bản', duration: '10 tuần', lessons: 40, tags: ['python'], free: true },
  { id: 'html-css', title: 'HTML & CSS', desc: 'Xây dựng website đẹp từ con số 0. Responsive, hiện đại.', emoji: '🎨', cover: 'linear-gradient(135deg,#60a5fa,#3b82f6)', level: 'Cơ bản', duration: '6 tuần', lessons: 24, tags: ['web'], free: true },
  { id: 'javascript-core', title: 'JavaScript Core', desc: 'Ngôn ngữ của web. DOM, Events, Async, ES6+.', emoji: '⚡', cover: 'linear-gradient(135deg,#fbbf24,#eab308)', level: 'Trung bình', duration: '10 tuần', lessons: 40, tags: ['web'], free: false },
  { id: 'react-modern', title: 'React.js Modern', desc: 'Xây dựng UI hiện đại với React, Hooks, Router, State.', emoji: '⚛️', cover: 'linear-gradient(135deg,#22d3ee,#06b6d4)', level: 'Nâng cao', duration: '12 tuần', lessons: 48, tags: ['web'], free: false },
  { id: 'node-api', title: 'Node.js & API', desc: 'Backend development, REST API, Database, Authentication.', emoji: '🟢', cover: 'linear-gradient(135deg,#34d399,#10b981)', level: 'Nâng cao', duration: '12 tuần', lessons: 48, tags: ['web'], free: false },
  { id: 'python-data', title: 'Python Data Science', desc: 'Pandas, NumPy, Matplotlib. Phân tích dữ liệu thực tế.', emoji: '📊', cover: 'linear-gradient(135deg,#a78bfa,#7c3aed)', level: 'Trung bình', duration: '10 tuần', lessons: 40, tags: ['python', 'ai'], free: false },
  { id: 'ai-ml-intro', title: 'AI & Machine Learning', desc: 'TensorFlow, Neural Networks, Computer Vision cơ bản.', emoji: '🤖', cover: 'linear-gradient(135deg,#f472b6,#7c3aed)', level: 'Nâng cao', duration: '14 tuần', lessons: 56, tags: ['ai', 'python'], free: false },
  { id: 'cyber-security', title: 'Cybersecurity Basics', desc: 'Bảo mật web, OWASP Top 10, WAF, Penetration Testing.', emoji: '🛡️', cover: 'linear-gradient(135deg,#f87171,#ef4444)', level: 'Trung bình', duration: '8 tuần', lessons: 32, tags: ['security'], free: false },
  { id: 'game-dev-kids', title: 'Làm Game cho bé', desc: 'Tạo game đơn giản với Scratch và Python Pygame.', emoji: '🎮', cover: 'linear-gradient(135deg,#fb923c,#f97316)', level: 'Cơ bản', duration: '8 tuần', lessons: 16, tags: ['beginner'], free: true },
  { id: 'logic-thinking', title: 'Tư duy Logic', desc: 'Thuật toán, giải quyết vấn đề, tư duy computational.', emoji: '🧠', cover: 'linear-gradient(135deg,#a78bfa,#8b5cf6)', level: 'Cơ bản', duration: '6 tuần', lessons: 12, tags: ['beginner'], free: true },
  { id: 'devops-cloud', title: 'DevOps & Cloud', desc: 'Docker, CI/CD, AWS/GCP, Monitoring, Infrastructure.', emoji: '☁️', cover: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', level: 'Nâng cao', duration: '12 tuần', lessons: 48, tags: ['security'], free: false },
];

// ============ RENDER COURSES ============
function renderCourses(filter = 'all') {
  const grid = document.getElementById('course-grid');
  const filtered = filter === 'all' ? COURSES : COURSES.filter(c => c.tags.includes(filter));
  grid.innerHTML = filtered.map(c => `
    <div class="course-card" onclick="alert('Khóa học ${c.title} sắp ra mắt!')">
      <div class="course-cover" style="background:${c.cover}">${c.emoji}</div>
      <div class="course-body">
        <h3>${c.title}</h3>
        <p>${c.desc}</p>
        <div class="course-meta">
          <span class="course-tag">${c.level}</span>
          <span>📅 ${c.duration}</span>
          <span>📖 ${c.lessons} bài</span>
          ${c.free ? '<span class="course-free">✦ Miễn phí</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ============ FILTER ============
document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCourses(btn.dataset.filter);
  });
});

// ============ CODE PLAYGROUND ============
const CODE_SAMPLES = {
  javascript: `// 🎉 Chào mừng đến Nemark Academy!
// Thử viết code JavaScript đầu tiên

function chaoMung(ten) {
  return \`Xin chào \${ten}! 🚀\`;
}

// In ra kết quả
console.log(chaoMung("Bạn"));
console.log("2 + 3 =", 2 + 3);

// Vòng lặp
for (let i = 1; i <= 5; i++) {
  console.log(\`Bước \${i}: Đang học lập trình...\`);
}

console.log("\\n✅ Bạn đã chạy code thành công!");`,

  python: `# 🐍 Python — Ngôn ngữ phổ biến nhất!
# Thử code Python ngay tại đây

def chao_mung(ten):
    return f"Xin chào {ten}! 🚀"

# In ra kết quả  
print(chao_mung("Bạn"))
print(f"2 + 3 = {2 + 3}")

# Vòng lặp
for i in range(1, 6):
    print(f"Bước {i}: Đang học Python...")

# List comprehension
so_chan = [x for x in range(10) if x % 2 == 0]
print(f"\\nSố chẵn: {so_chan}")
print("\\n✅ Code Python chạy thành công!")`,

  html: `<!-- 🌐 HTML + CSS — Xây dựng website -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: Arial; 
      background: #0f172a; 
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background: rgba(124,58,237,0.1);
      border: 1px solid rgba(124,58,237,0.3);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
    }
    h1 { color: #a78bfa; }
    p { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎓 Nemark Academy</h1>
    <p>Website đầu tiên của tôi!</p>
    <button onclick="alert('Hello!')">Click me</button>
  </div>
</body>
</html>`
};

let currentLang = 'javascript';

function loadCode(lang) {
  currentLang = lang;
  document.getElementById('code-editor').value = CODE_SAMPLES[lang];
  document.querySelectorAll('.pg-tab').forEach(t => t.classList.toggle('active', t.dataset.lang === lang));
  updateLineNumbers();
  document.getElementById('code-output').textContent = '// Nhấn ▶ Chạy để xem kết quả';
}

document.querySelectorAll('.pg-tab').forEach(tab => {
  tab.addEventListener('click', () => loadCode(tab.dataset.lang));
});

function updateLineNumbers() {
  const lines = document.getElementById('code-editor').value.split('\n').length;
  document.getElementById('line-numbers').innerHTML = Array.from({length: lines}, (_, i) => `<div>${i + 1}</div>`).join('');
}

document.getElementById('code-editor').addEventListener('input', updateLineNumbers);
document.getElementById('code-editor').addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { e.preventDefault(); const t = e.target; const s = t.selectionStart; t.value = t.value.substring(0, s) + '  ' + t.value.substring(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 2; }
});

function runCode() {
  const code = document.getElementById('code-editor').value;
  const out = document.getElementById('code-output');
  
  if (currentLang === 'javascript') {
    const logs = [];
    const fakeConsole = { log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')) };
    try {
      const fn = new Function('console', code);
      fn(fakeConsole);
      out.textContent = logs.join('\n') || '(no output)';
      out.style.color = '#34d399';
    } catch (err) {
      out.textContent = `❌ Error: ${err.message}`;
      out.style.color = '#f87171';
    }
  } else if (currentLang === 'python') {
    out.textContent = '🐍 Python chạy trên server.\nĐang phát triển tính năng này...\n\n(Hiện tại hỗ trợ JavaScript)';
    out.style.color = '#fbbf24';
  } else if (currentLang === 'html') {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;height:300px;border:none;border-radius:8px;background:#fff';
    out.textContent = '';
    out.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(code);
    iframe.contentDocument.close();
  }
}

function resetCode() {
  loadCode(currentLang);
}

function askAI() {
  const code = document.getElementById('code-editor').value;
  const out = document.getElementById('code-output');
  out.style.color = '#a78bfa';
  out.textContent = '🤖 AI Tutor đang phân tích code...\n\n';
  
  setTimeout(() => {
    out.textContent += `📝 Phân tích code ${currentLang}:\n`;
    out.textContent += `• Tổng cộng ${code.split('\n').length} dòng code\n`;
    out.textContent += `• Ngôn ngữ: ${currentLang}\n\n`;
    out.textContent += `💡 Gợi ý: Hãy thử thay đổi giá trị và chạy lại!\n`;
    out.textContent += `\n🔜 Tính năng AI Tutor đầy đủ sắp ra mắt...`;
  }, 1000);
}

// ============ COUNTER ANIMATION ============
function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = Math.floor(current) + (target > 100 ? '+' : '');
    }, 40);
  });
}

// ============ SCROLL OBSERVER ============
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; } });
}, { threshold: 0.1 });

document.querySelectorAll('.section').forEach(s => {
  s.style.opacity = '0';
  s.style.transform = 'translateY(20px)';
  s.style.transition = 'all 0.6s ease';
  observer.observe(s);
});

// ============ AUTH ============
function showLogin() { document.getElementById('login-modal').classList.add('show'); }
function showRegister() { document.getElementById('register-modal').classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

async function handleLogin(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: f.email.value, password: f.password.value }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('academy_token', data.accessToken);
    localStorage.setItem('academy_user', JSON.stringify(data.user));
    closeModal('login-modal');
    alert(`Chào mừng ${data.user.name || data.user.email}! 🎉`);
  } catch (err) { alert('Lỗi: ' + err.message); }
}

async function handleRegister(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const res = await fetch(`${API}/api/auth/register`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: f.name.value, email: f.email.value, password: f.password.value }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('academy_token', data.accessToken);
    localStorage.setItem('academy_user', JSON.stringify(data.user));
    closeModal('register-modal');
    alert(`Đăng ký thành công! Chào mừng ${data.user.name}! 🎉`);
  } catch (err) { alert('Lỗi: ' + err.message); }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  renderCourses();
  loadCode('javascript');
  animateCounters();
});
