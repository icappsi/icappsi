// --- VERIFICACIÓN DE SESIÓN ---
const usuarioStr = sessionStorage.getItem('usuario');
if (!usuarioStr) {
  window.location.href = 'index.html';
} else {
  const usuario = JSON.parse(usuarioStr);
  inicializarDashboard(usuario);
}

// --- INICIALIZACIÓN DEL DASHBOARD ---
function inicializarDashboard(user) {
  // 1. Cargar datos del usuario en el Header
  document.getElementById('userName').textContent = `${user.nombre} ${user.apellido}`;
  document.getElementById('userJerarquia').textContent = user.jerarquia || 'Sin jerarquía';
  document.getElementById('userLevel').textContent = user.nivel_acceso || 'Usuario';
  
  // Formatear número de expediente con formato ID-ZU-CPNB-XXXXX-YY
  let expedienteTexto = '';
  if (user.numero_expediente) {
    // Extraer solo los números del expediente
    const numeros = user.numero_expediente.replace(/\D/g, '');
    // Formatear con ceros a la izquierda (5 dígitos)
    const numeroFormateado = numeros.padStart(5, '0');
    // Obtener últimos 2 dígitos del año actual
    const añoActual = new Date().getFullYear().toString().slice(-2);
    expedienteTexto = `ID-ZU-CPNB-${numeroFormateado}-${añoActual}`;
    document.getElementById('welcomeText').textContent = `¡Bienvenido, ${user.nombre}! | Expediente Investigado: ${expedienteTexto}`;
  } else {
    document.getElementById('welcomeText').textContent = `¡Bienvenido, ${user.nombre}!`;
  }
  
  // Mostrar causa de sanción debajo del mensaje de bienvenida
  const causaSancionDiv = document.getElementById('causaSancion');
  if (causaSancionDiv) {
    if (user.causa_sancion && user.causa_sancion.trim() !== '') {
      causaSancionDiv.innerHTML = `
        <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin-top: 15px;">
          <p style="margin: 0 0 5px 0; font-weight: 600; color: #856404; font-size: 14px;">⚠️ Causa de Sanción:</p>
          <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.5;">${user.causa_sancion}</p>
        </div>
      `;
      causaSancionDiv.style.display = 'block';
    } else {
      causaSancionDiv.style.display = 'none';
    }
  }
  
  // Cargar foto (o usar un placeholder si no tiene)
  const photoImg = document.getElementById('userPhoto');
  if (user.foto_url) {
    photoImg.src = user.foto_url;
  } else {
    photoImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23ddd"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="%23888">👤</text></svg>';
  }
  
  // 2. Control de Acceso
  if (user.nivel_acceso !== 'administrador') {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      el.style.display = 'none';
    });
  }
  
  // 3. Lógica de Navegación (Tabs)
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
  
  // 4. Botón de Cerrar Sesión
  document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      cerrarSesion();
    }
  });
}
