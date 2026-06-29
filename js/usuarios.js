// ============================================
// GESTIÓN DE USUARIOS - COMPLETO Y CORREGIDO
// ============================================

let todosLosUsuarios = [];
let usuariosFiltrados = [];
let paginaActual = 1;
const usuariosPorPagina = 10;
let usuarioEditandoId = null;
let usuarioEliminandoId = null;
let fotoUrlActual = null;
let usuariosSeleccionados = new Set();

// 🆕 Variables para la cámara
let streamCamara = null;
let fotoCapturadaData = null;
let modoCamaraActual = 'user'; // 'user' = frontal, 'environment' = trasera

// ============================================
// 1. INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const usuarioStr = sessionStorage.getItem('usuario');
  if (!usuarioStr) {
    window.location.href = '../index.html';
    return;
  }
  
  const usuario = JSON.parse(usuarioStr);
  
  if (usuario.nivel_acceso !== 'administrador') {
    document.body.innerHTML = '';
    return;
  }
  
  configurarEventos();
  cargarUsuarios();
});

// ============================================
// 2. CONFIGURACIÓN DE EVENTOS (CON VERIFICACIONES)
// ============================================

function configurarEventos() {
  const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuario'));
  
  // Verificar existencia antes de agregar listeners
  const elBuscar = document.getElementById('buscarUsuario');
  if (elBuscar) elBuscar.addEventListener('input', (e) => filtrarUsuarios(e.target.value));
  
  const elNuevo = document.getElementById('btnNuevoUsuario');
  if (elNuevo) elNuevo.addEventListener('click', () => abrirModalUsuario());
  
  const elRefrescar = document.getElementById('btnRefrescar');
  if (elRefrescar) elRefrescar.addEventListener('click', () => cargarUsuarios());
  
  const elGuardar = document.getElementById('btnGuardarUsuario');
  if (elGuardar) elGuardar.addEventListener('click', guardarUsuario);
  
  const elCancelar = document.getElementById('btnCancelarUsuario');
  if (elCancelar) elCancelar.addEventListener('click', () => {
    document.getElementById('modalUsuario').style.display = 'none';
  });
  
  const elConfirmar = document.getElementById('btnConfirmarEliminar');
  if (elConfirmar) elConfirmar.addEventListener('click', confirmarEliminar);
  
  const elCancelarElim = document.getElementById('btnCancelarEliminar');
  if (elCancelarElim) elCancelarElim.addEventListener('click', () => {
    document.getElementById('modalEliminar').style.display = 'none';
  });
  
  const btnSeleccionarTodos = document.getElementById('btnSeleccionarTodos');
  if (btnSeleccionarTodos) btnSeleccionarTodos.addEventListener('click', seleccionarTodosUsuarios);
  
  const btnDeseleccionarTodos = document.getElementById('btnDeseleccionarTodos');
  if (btnDeseleccionarTodos) btnDeseleccionarTodos.addEventListener('click', deseleccionarTodosUsuarios);
  
  const btnEliminarSeleccionados = document.getElementById('btnEliminarSeleccionados');
  if (btnEliminarSeleccionados) btnEliminarSeleccionados.addEventListener('click', eliminarSeleccionados);
  
  const btnCancelarSeleccion = document.getElementById('btnCancelarSeleccion');
  if (btnCancelarSeleccion) btnCancelarSeleccion.addEventListener('click', cancelarSeleccion);
  
  const btnEliminarTodos = document.getElementById('btnEliminarTodos');
  if (btnEliminarTodos) btnEliminarTodos.addEventListener('click', eliminarTodosUsuarios);
  
  const inputCedula = document.getElementById('usuarioCedula');
  if (inputCedula) {
    inputCedula.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      if (e.target.value.length > 8) {
        e.target.value = e.target.value.slice(0, 8);
      }
    });
  }
  
  const inputFoto = document.getElementById('usuarioFoto');
  if (inputFoto) {
    inputFoto.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          document.getElementById('fotoPreview').src = event.target.result;
          document.getElementById('fotoPreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // 🆕 Botones de cámara (con verificación)
  const btnAbrirCamara = document.getElementById('btnAbrirCamara');
  if (btnAbrirCamara) btnAbrirCamara.addEventListener('click', () => abrirCamara('user'));
  
  const btnCambiarCamara = document.getElementById('btnCambiarCamara');
  if (btnCambiarCamara) btnCambiarCamara.addEventListener('click', cambiarCamara);
  
  const btnCapturar = document.getElementById('btnCapturar');
  if (btnCapturar) btnCapturar.addEventListener('click', capturarFoto);
  
  const btnNuevaFoto = document.getElementById('btnNuevaFoto');
  if (btnNuevaFoto) btnNuevaFoto.addEventListener('click', tomarOtraFoto);
  
  const btnUsarFoto = document.getElementById('btnUsarFoto');
  if (btnUsarFoto) btnUsarFoto.addEventListener('click', usarFotoCapturada);
  
  const btnCerrarCamara = document.getElementById('btnCerrarCamara');
  if (btnCerrarCamara) btnCerrarCamara.addEventListener('click', cerrarCamara);
  
  const btnQuitarFoto = document.getElementById('btnQuitarFoto');
  if (btnQuitarFoto) {
    btnQuitarFoto.addEventListener('click', () => {
      document.getElementById('fotoPreviewContainer').style.display = 'none';
      document.getElementById('fotoPreview').src = '';
      fotoUrlActual = null;
      document.getElementById('usuarioFoto').value = '';
    });
  }
  
  const checkboxSuperAdmin = document.getElementById('usuarioEsSuperAdmin');
  if (checkboxSuperAdmin) {
    checkboxSuperAdmin.addEventListener('change', (e) => {
      const passwordContainer = document.getElementById('passwordContainer');
      const passwordLabel = document.getElementById('passwordLabel');
      
      if (e.target.checked) {
        document.getElementById('usuarioNivel').value = 'administrador';
        passwordContainer.style.display = 'block';
        passwordLabel.innerHTML = '🔑 Contraseña de Super Administrador: *';
        passwordLabel.style.color = '#d4af37';
      } else {
        const nivel = document.getElementById('usuarioNivel').value;
        if (nivel !== 'administrador') {
          passwordContainer.style.display = 'none';
          passwordLabel.innerHTML = 'Contraseña de Administrador: *';
          passwordLabel.style.color = '#4a0404';
        }
      }
    });
  }
  
  const selectNivel = document.getElementById('usuarioNivel');
  if (selectNivel) {
    selectNivel.addEventListener('change', (e) => {
      const passwordContainer = document.getElementById('passwordContainer');
      const passwordLabel = document.getElementById('passwordLabel');
      const checkboxSuperAdmin = document.getElementById('usuarioEsSuperAdmin');
      
      if (e.target.value === 'administrador') {
        passwordContainer.style.display = 'block';
        passwordLabel.innerHTML = '🔐 Contraseña de Administrador: *';
        passwordLabel.style.color = '#4a0404';
      } else {
        if (!checkboxSuperAdmin || !checkboxSuperAdmin.checked) {
          passwordContainer.style.display = 'none';
        }
      }
    });
  }
  
  const btnVerEliminados = document.getElementById('btnVerEliminados');
  if (btnVerEliminados) {
    if (usuarioLogueado.es_super_admin) {
      btnVerEliminados.style.display = 'inline-block';
      btnVerEliminados.addEventListener('click', () => {
        window.open('usuarios_eliminados.html', '_blank');
      });
    }
  }
}
