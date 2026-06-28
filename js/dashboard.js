// ============================================
// DASHBOARD - VERSIÓN COMPLETA Y CORREGIDA
// ============================================

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
  
  // 2. Formatear número de expediente con formato ID-ZU-CPNB-XXXXX-YY
  let expedienteTexto = '';
  if (user.numero_expediente) {
    // Si ya tiene el formato completo, usarlo tal cual
    if (user.numero_expediente.includes('ID-ZU-CPNB')) {
      expedienteTexto = user.numero_expediente;
    } else {
      // Si solo tiene el número, formatearlo
      const numeros = user.numero_expediente.replace(/\D/g, '');
      const numeroFormateado = numeros.padStart(5, '0');
      const añoActual = new Date().getFullYear().toString().slice(-2);
      expedienteTexto = `ID-ZU-CPNB-${numeroFormateado}-${añoActual}`;
    }
    document.getElementById('welcomeText').textContent = `¡Bienvenido, ${user.nombre}! | Expediente Investigado: ${expedienteTexto}`;
  } else {
    document.getElementById('welcomeText').textContent = `¡Bienvenido, ${user.nombre}!`;
  }
  
  // 3. Mostrar causa de sanción debajo del mensaje de bienvenida
  const welcomeBanner = document.querySelector('.welcome-banner > div');
  if (welcomeBanner && user.causa_sancion && user.causa_sancion.trim() !== '') {
    // Verificar si ya existe el div de causa de sanción
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
  
  // 4. Cargar foto (o usar un placeholder si no tiene)
  const photoImg = document.getElementById('userPhoto');
  if (user.foto_url) {
    photoImg.src = user.foto_url;
  } else {
    photoImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23ddd"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="%23888">👤</text></svg>';
  }
  
  // 5. Control de Acceso (Ocultar elementos de administrador si es usuario normal)
  if (user.nivel_acceso !== 'administrador') {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      el.style.display = 'none';
    });
  }
  
  // 6. Lógica de Navegación (Tabs)
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
  
  // 7. Botón de Cerrar Sesión
  document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      cerrarSesion();
    }
  });
}
// 🆕 NUEVO: Mostrar botón de Logs solo para Super Admin
if (user.es_super_admin) {
  const btnLogs = document.getElementById('btnVerLogs');
  if (btnLogs) {
    btnLogs.style.display = 'inline-block';
    btnLogs.addEventListener('click', () => {
      window.open('html/logs.html', '_blank');
    });
  }
}

// 🆕 NUEVO: Registrar log de inicio de sesión
if (typeof registrarLog === 'function') {
  registrarLog({
    accion: 'Inicio de sesión',
    modulo: 'Autenticación',
    descripcion: `El usuario ${user.nombre} ${user.apellido} inició sesión en el sistema`,
    detalles: {
      cedula: user.cedula,
      nivel: user.nivel_acceso,
      es_super_admin: user.es_super_admin || false
    }
  });
}
