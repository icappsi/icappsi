// ============================================
// AUTENTICACIÓN Y SESIONES
// ============================================

// Función para cerrar sesión
async function cerrarSesion() {
  const usuarioStr = sessionStorage.getItem('usuario');
  
  if (!usuarioStr) {
    // Si no hay sesión, redirigir al login
    window.location.href = 'index.html';
    return;
  }
  
  const usuario = JSON.parse(usuarioStr);
  
  try {
    // 🆕 NUEVO: Registrar log de cierre de sesión ANTES de limpiar sessionStorage
    if (typeof registrarLog === 'function') {
      await registrarLog({
        accion: 'Cierre de sesión',
        modulo: 'Autenticación',
        descripcion: `El usuario ${usuario.nombre} ${usuario.apellido} cerró sesión manualmente`,
        detalles: { 
          cedula: usuario.cedula,
          tipo_cierre: 'Botón Cerrar Sesión',
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
    // Limpiar sessionStorage
    sessionStorage.removeItem('usuario');
    
    // Redirigir al login
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
