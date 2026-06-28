async function cerrarSesion() {
  const usuarioStr = sessionStorage.getItem('usuario');
  
  if (!usuarioStr) {
    window.location.href = 'index.html';
    return;
  }
  
  const usuario = JSON.parse(usuarioStr);
  
  try {
    // 🆕 USAR registrarLogBeacon (fetch con keepalive) en lugar de registrarLogCierre
    if (typeof registrarLogBeacon === 'function') {
      console.log('📝 Enviando log de cierre de sesión...');
      registrarLogBeacon({
        usuario: usuario,
        accion: 'Logout',
        modulo: 'Autenticación',
        descripcion: `El usuario ${usuario.nombre} ${usuario.apellido} cerró sesión`,
        detalles: {
          cedula: usuario.cedula,
          nivel: usuario.nivel_acceso,
          es_super_admin: usuario.es_super_admin || false
        }
      });
      console.log('✅ Log de cierre enviado con fetch keepalive');
    } else {
      console.warn('⚠️ La función registrarLogBeacon no está disponible');
    }
    
    // Eliminar sesión activa de la base de datos
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
  
  sessionStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

function verificarSesion() {
  const usuarioStr = sessionStorage.getItem('usuario');
  
  if (!usuarioStr) {
    sessionStorage.removeItem('usuario');
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

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
