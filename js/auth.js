// ============================================
// AUTENTICACIÓN Y SESIONES
// ============================================

async function cerrarSesion() {
  const usuarioStr = sessionStorage.getItem('usuario');
  
  if (!usuarioStr) {
    window.location.href = 'index.html';
    return;
  }
  
  const usuario = JSON.parse(usuarioStr);
  
  try {
    // 🆕 REGISTRAR LOG DE CIERRE DE SESIÓN CON BEACON (antes de limpiar sessionStorage)
    if (typeof registrarLogBeacon === 'function') {
      registrarLogBeacon({
        usuario: usuario,
        accion: 'Cierre de sesión',
        modulo: 'Autenticación',
        descripcion: `El usuario ${usuario.nombre} ${usuario.apellido} cerró sesión`,
        detalles: { 
          cedula: usuario.cedula,
          nivel: usuario.nivel_acceso,
          es_super_admin: usuario.es_super_admin || false
        }
      });
    }
    
    // Eliminar la sesión activa de la base de datos
    const { error } = await supabaseClient
      .from('sesiones_activas')
      .delete()
      .eq('cedula', usuario.cedula);
    
    if (error) {
      console.error('Error cerrando sesión:', error);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
  
  // Limpiar sessionStorage
  sessionStorage.removeItem('usuario');
  
  // Redirigir al login
  window.location.href = 'index.html';
}

// Función para verificar si hay sesión activa
function verificarSesion() {
  const usuarioStr = sessionStorage.getItem('usuario');
  
  if (!usuarioStr) {
    sessionStorage.removeItem('usuario');
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

// Función para actualizar la última actividad (heartbeat)
async function actualizarActividad() {
  const usuarioStr = sessionStorage.getItem('usuario');
  
  if (!usuarioStr) return;
  
  const usuario = JSON.parse(usuarioStr);
  
  try {
    await supabaseClient
      .from('sesiones_activas')
      .update({ ultima_actividad: new Date().toISOString() })
      .eq('cedula', usuario.cedula);
  } catch (err) {
    console.error('Error actualizando actividad:', err);
  }
}
