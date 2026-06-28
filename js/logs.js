// ============================================
// SISTEMA DE LOGS - REGISTRO DE ACTIVIDAD
// ============================================

/**
 * Registra una acción en el log del sistema
 * @param {Object} params - Parámetros del log
 * @param {string} params.accion - Acción realizada (ej: "Crear usuario", "Eliminar prueba")
 * @param {string} params.modulo - Módulo donde se realizó (ej: "Usuarios", "Pruebas")
 * @param {string} params.descripcion - Descripción breve
 * @param {Object} params.detalles - Detalles adicionales (opcional)
 */
async function registrarLog({ accion, modulo, descripcion, detalles = null }) {
  try {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr) return;
    
    const usuario = JSON.parse(usuarioStr);
    
    await supabaseClient.from('logs_sistema').insert({
      usuario_id: usuario.id,
      usuario_nombre: `${usuario.nombre} ${usuario.apellido}`,
      usuario_cedula: usuario.cedula,
      accion: accion,
      modulo: modulo,
      descripcion: descripcion,
      detalles: detalles,
      ip_address: null, // No disponible sin backend
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Error al registrar log:', error);
    // No bloquear la acción principal si falla el log
  }
}
