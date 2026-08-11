// ==========================================================================
// MotoControl — login.js
// Fase 2: pantalla de acceso.
// ==========================================================================

import { login } from './auth.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div style="max-width:360px;margin:40px auto 0;">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:56px;height:56px;border-radius:14px;margin:0 auto 12px;
          background:conic-gradient(var(--accent) 0deg 270deg, var(--surface-2) 270deg 360deg);
          display:flex;align-items:center;justify-content:center;">
          <div style="width:42px;height:42px;border-radius:10px;background:var(--bg);
            display:flex;align-items:center;justify-content:center;color:var(--accent);
            font-family:'Rajdhani';font-weight:700;font-size:20px;">M</div>
        </div>
        <h1 style="font-size:20px;">MotoControl</h1>
        <p style="color:var(--text-dim);font-size:12px;margin-top:4px;">Acceso al sistema</p>
      </div>

      <form id="login-form" class="card" style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;">Correo</label>
          <input type="email" id="login-email" required autocomplete="username"
            style="width:100%;margin-top:6px;padding:11px 12px;background:var(--surface-2);
            border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;">Contraseña</label>
          <input type="password" id="login-password" required autocomplete="current-password"
            style="width:100%;margin-top:6px;padding:11px 12px;background:var(--surface-2);
            border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;">
        </div>
        <div id="login-error" style="display:none;color:var(--danger);font-size:12px;"></div>
        <button type="submit" id="login-submit"
          style="margin-top:4px;padding:12px;border:none;border-radius:var(--radius-sm);
          background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">
          Entrar
        </button>
      </form>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    submitBtn.textContent = 'Entrando…';
    submitBtn.disabled = true;

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const result = await login(email, password);

    if (!result.ok) {
      errorBox.textContent = result.error;
      errorBox.style.display = 'block';
      submitBtn.textContent = 'Entrar';
      submitBtn.disabled = false;
    }
    // Si tiene éxito, onAuthStateChanged en auth.js dispara el re-render vía app.js
  });
}
