// --- VERIFICACIÓN DE SESIÓN ---
const usuarioStr = sessionStorage.getItem('usuario');

if (!usuarioStr) {
  // Si no hay sesión, redirigir al login
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
  document.getElementById('welcomeText').textContent = `¡Bienvenido, ${user.nombre}!`;
  
  // Cargar foto (o usar un placeholder si no tiene)
  const photoImg = document.getElementById('userPhoto');
  if (user.foto_url) {
    photoImg.src = user.foto_url;
  } else {
    // Placeholder SVG si no hay foto
    photoImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23ddd"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="%23888">👤</text></svg>';
  }

  // 2. Control de Acceso (Ocultar elementos de administrador si es usuario normal)
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
      // Si el botón está oculto (por ser admin-only y el user no ser admin), no hacer nada
      if (button.style.display === 'none') return;

      const targetId = button.getAttribute('data-target');

      // Quitar clase 'active' de todos los botones y fieldsets
      navButtons.forEach(btn => btn.classList.remove('active'));
      fieldsets.forEach(fs => fs.classList.remove('active'));

      // Agregar clase 'active' al botón y fieldset clickeado
      button.classList.add('active');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // 4. Botón de Cerrar Sesión
  document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      cerrarSesion(); // Llama a la función de auth.js
    }
  });
}
