async function cerrarSesion() {
  try {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (usuarioStr) {
      const usuario = JSON.parse(usuarioStr);
      
      // Eliminar sesión activa de la base de datos
      await supabaseClient
        .from('sesiones_activas')
        .delete()
        .eq('cedula', usuario.cedula);
    }
    
    // Limpiar sessionStorage
    sessionStorage.removeItem('usuario');
    
    // Redirigir al login
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    // Aún así, limpiar y redirigir
    sessionStorage.removeItem('usuario');
    window.location.href = 'index.html';
  }
}
