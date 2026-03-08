/* ============================================
   AutoCode Ecosystem — Shared Components
   Global navigation, footer, and styles
   ============================================ */

/* ====== GLOBAL NAV ====== */
function createGlobalNav(activePage) {
  const user = JSON.parse(localStorage.getItem('academy_user') || 'null');
  const nav = document.createElement('nav');
  nav.className = 'eco-nav';
  nav.innerHTML = `
    <div class="eco-nav-inner">
      <a href="/" class="eco-brand">
        <span class="eco-brand-icon">⚡</span>
        <span class="eco-brand-name">Auto<span class="eco-accent">Code</span></span>
        <span class="eco-brand-by">by Nemark</span>
      </a>
      <div class="eco-nav-links">
        <a href="/" class="${activePage === 'home' ? 'active' : ''}">🏠 Trang chủ</a>
        <a href="/dashboard" class="${activePage === 'dashboard' ? 'active' : ''}">📊 Dashboard</a>
        <a href="/academy/" class="${activePage === 'academy' ? 'active' : ''}">🎓 Academy</a>
        <a href="/waf" class="${activePage === 'waf' ? 'active' : ''}">🛡️ WAF</a>
        <a href="/tunnel" class="${activePage === 'tunnel' ? 'active' : ''}">🔗 Tunnel</a>
      </div>
      <div class="eco-nav-right">
        ${user
          ? `<span class="eco-user">${user.name || user.email}</span>
             <button class="eco-btn eco-btn-sm" onclick="ecoLogout()">Đăng xuất</button>`
          : `<button class="eco-btn eco-btn-ghost" onclick="location.href='/academy/#login'">Đăng nhập</button>
             <button class="eco-btn eco-btn-primary" onclick="location.href='/academy/#register'">Đăng ký</button>`
        }
      </div>
      <button class="eco-menu-toggle" onclick="this.parentElement.classList.toggle('open')">☰</button>
    </div>
  `;
  document.body.prepend(nav);
}

function ecoLogout() {
  localStorage.removeItem('academy_token');
  localStorage.removeItem('academy_user');
  localStorage.removeItem('autocode_api_key');
  location.href = '/';
}

/* ====== GLOBAL FOOTER ====== */
function createGlobalFooter() {
  const footer = document.createElement('footer');
  footer.className = 'eco-footer';
  footer.innerHTML = `
    <div class="eco-footer-inner">
      <div class="eco-footer-grid">
        <div class="eco-footer-col">
          <div class="eco-footer-brand">⚡ AutoCode Platform</div>
          <p>Hệ sinh thái automation toàn diện.<br>AI Coding • Anti-DDoS WAF • Tunnel • Academy</p>
          <p class="eco-footer-copy">© 2026 Nemark Digital Solutions Co., Ltd<br>MST: 0111278699</p>
        </div>
        <div class="eco-footer-col">
          <h4>Sản phẩm</h4>
          <a href="/dashboard">📊 Dashboard</a>
          <a href="/academy/">🎓 Academy</a>
          <a href="/waf">🛡️ Mango WAF</a>
          <a href="/tunnel">🔗 ProxVN Tunnel</a>
        </div>
        <div class="eco-footer-col">
          <h4>Dịch vụ</h4>
          <a href="#">💻 Lập trình & Phần mềm</a>
          <a href="#">🛡️ Bảo mật Website</a>
          <a href="#">🎓 Tư vấn giáo dục CNTT</a>
          <a href="#">🤖 AI & Automation</a>
        </div>
        <div class="eco-footer-col">
          <h4>Liên hệ</h4>
          <a href="tel:0914659183">📞 0914 659 183</a>
          <a href="mailto:contact@nemarkdigital.com">✉️ contact@nemarkdigital.com</a>
          <a href="#">📍 Hạ Bằng, Thạch Thất, Hà Nội</a>
          <a href="https://github.com/ducvps12/auto-code-platform" target="_blank">🐙 GitHub</a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(footer);
}
