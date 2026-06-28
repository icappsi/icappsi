@@ -1,79 +1,25 @@
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
    // Eliminar la sesión activa de la base de datos
    const { error } = await supabaseClient
      .from('sesiones_activas')
      .delete()
      .eq('cedula', usuario.cedula);
    
    if (error) {
      console.error('Error cerrando sesión:', error);
    const usuarioStr = sessionStorage.getItem('usuario');
    if (usuarioStr) {
      const usuario = JSON.parse(usuarioStr);
      
      // Eliminar sesión activa de la base de datos
      await supabaseClient
        .from('sesiones_activas')
        .delete()
        .eq('cedula', usuario.cedula);
    }
  } catch (err) {
    console.error('Error:', err);
  }
  // Registrar log de cierre de sesión
if (typeof registrarLog === 'function') {
  const usuarioStr = sessionStorage.getItem('usuario');
  if (usuarioStr) {
    const usuario = JSON.parse(usuarioStr);
    registrarLog({
      accion: 'Cierre de sesión',
      modulo: 'Autenticación',
      descripcion: `El usuario ${usuario.nombre} ${usuario.apellido} cerró sesión`,
      detalles: { cedula: usuario.cedula }
    }).then(() => {
      sessionStorage.removeItem('usuario');
      window.location.href = 'index.html';
    });
    return;
  }
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
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    // Aún así, limpiar y redirigir
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
