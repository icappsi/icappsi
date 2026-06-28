// DASHBOARD - VERSIÓN COMPLETA Y CORREGIDA
// ============================================

const usuarioStr = sessionStorage.getItem('usuario');
if (!usuarioStr) {
  window.location.href = 'index.html';
} else {
  const usuario = JSON.parse(usuarioStr);
  inicializarDashboard(usuario);
}

function inicializarDashboard(user) {
  document.getElementById('userName').textContent = `${user.nombre} ${user.apellido}`;
  document.getElementById('userJerarquia').textContent = user.jerarquia || 'Sin jerarquía';
  document.getElementById('userLevel').textContent = user.nivel_acceso || 'Usuario';
  
  let expedienteTexto = '';
  if (user.numero_expediente) {
    if (user.numero_expediente.includes('ID-ZU-CPNB')) {
      expedienteTexto = user.numero_expediente;
    } else {
      const numeros = user.numero_expediente.replace(/\D/g, '');
      const numeroFormateado = numeros.padStart(5, '0');
      const añoActual = new Date().getFullYear().toString().slice(-2);
      expedienteTexto = `ID-ZU-CPNB-${numeroFormateado}-${añoActual}`;
    }
    document.getElementById('welcomeText').textContent = `¡Bienvenido, ${user.nombre}! | Expediente Investigado: ${expedienteTexto}`;
  } else {
    document.getElementById('welcomeText').textContent = `¡Bienvenido, ${user.nombre}!`;
  }
  
  const welcomeBanner = document.querySelector('.welcome-banner > div');
  if (welcomeBanner && user.causa_sancion && user.causa_sancion.trim() !== '') {
    const causaExistente = document.getElementById('causaSancion');
    if (!causaExistente) {
      const causaSancionDiv = document.createElement('div');
      causaSancionDiv.id = 'causaSancion';
      causaSancionDiv.innerHTML = `
        <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin-top: 15px;">
          <p style="margin: 0 0 5px 0; font-weight: 600; color: #856404; font-size: 14px;">⚠️ Causa de Sanción:</p>
          <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.5;">${user.causa_sancion}</p>
        </div>
      `;
      welcomeBanner.appendChild(causaSancionDiv);
    }
  }
  
  const photoImg = document.getElementById('userPhoto');
  if (user.foto_url) {
    photoImg.src = user.foto_url;
  } else {
    photoImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23ddd"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="%23888">👤</text></svg>';
  }
  
  if (user.nivel_acceso !== 'administrador') {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      el.style.display = 'none';
    });
  }
  
  const navButtons = document.querySelectorAll('.nav-btn');
  const fieldsets = document.querySelectorAll('.content-fieldset');
  
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.style.display === 'none') return;
      
      const targetId = button.getAttribute('data-target');
      
      navButtons.forEach(btn => btn.classList.remove('active'));
      fieldsets.forEach(fs => fs.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(targetId).classList.add('active');
    });
  });
  
  document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      cerrarSesion();
    }
  });
  
  if (user.es_super_admin) {
    const btnLogs = document.getElementById('btnVerLogs');
    if (btnLogs) {
      btnLogs.style.display = 'inline-block';
      btnLogs.addEventListener('click', () => {
        window.open('html/logs.html', '_blank');
      });
    }
  }
}
