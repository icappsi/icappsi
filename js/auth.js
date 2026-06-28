async function cerrarSesion() {
  const usuarioStr = sessionStorage.getItem('usuario');
  
  if (!usuarioStr) {
    window.location.href = 'index.html';
    return;
  }
  
  const usuario = JSON.parse(usuarioStr);
  
  try {
    // 🆕 USAR registrarLogCierre (con sendBeacon) en lugar de registrarLog
    if (typeof registrarLogCierre === 'function') {
      console.log('📝 Enviando log de cierre de sesión...');
      registrarLogCierre(
        usuario, 
        'Logout', 
        'Autenticación', 
        `El usuario ${usuario.nombre} ${usuario.apellido} cerró sesión`,
        { 
          cedula: usuario.cedula,
          nivel: usuario.nivel_acceso,
          es_super_admin: usuario.es_super_admin || false
        }
      );
      console.log('✅ Log de cierre enviado con sendBeacon');
    } else {
      console.warn('⚠️ La función registrarLogCierre no está disponible');
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
