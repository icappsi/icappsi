async function cerrarSesion() {
  const usuarioStr = sessionStorage.getItem('usuario');
  
  if (!usuarioStr) {
    window.location.href = 'index.html';
    return;
  }
  
  const usuario = JSON.parse(usuarioStr);
  
  try {
   
    if (typeof registrarLog === 'function') {
      console.log('📝 Registrando log de cierre de sesión...');
      await registrarLog({
        accion: 'Cierre de sesión',
        modulo: 'Autenticación',
        descripcion: `El usuario ${usuario.nombre} ${usuario.apellido} cerró sesión`,
        detalles: { 
          cedula: usuario.cedula,
          nivel: usuario.nivel_acceso,
          es_super_admin: usuario.es_super_admin || false
        }
      });
      console.log('✅ Log registrado correctamente');
    } else {
      console.warn('⚠️ La función registrarLog no está disponible');
    }
    
    // PASO 3: Eliminar sesión activa de la base de datos
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
  
  // PASO 5: Redirigir al login
  window.location.href = 'index.html';
}
