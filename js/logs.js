// ============================================
// SISTEMA DE LOGS - REGISTRO DE ACTIVIDAD
// ============================================

/**
 * Registra una acción en el log del sistema (versión normal, asíncrona)
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
      ip_address: null,
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Error al registrar log:', error);
  }
}

/**
 * Registra un log de forma confiable usando sendBeacon
 * Útil para cuando se cierra la pestaña o se redirige
 * Esta función NO depende de sessionStorage, los datos se pasan como parámetro
 */
function registrarLogBeacon({ usuario, accion, modulo, descripcion, detalles = null }) {
  try {
    if (!usuario) return false;
    
    const logData = {
      usuario_id: usuario.id,
      usuario_nombre: `${usuario.nombre} ${usuario.apellido}`,
      usuario_cedula: usuario.cedula,
      accion: accion,
      modulo: modulo,
      descripcion: descripcion,
      detalles: detalles,
      ip_address: null,
      user_agent: navigator.userAgent
    };
    
    // Obtener configuración de Supabase desde el cliente
    const supabaseUrl = supabaseClient.supabaseUrl;
    const supabaseKey = supabaseClient.supabaseKey;
    
    const url = `${supabaseUrl}/rest/v1/logs_sistema`;
    const payload = JSON.stringify(logData);
    const blob = new Blob([payload], { type: 'application/json' });
    
    // Intentar con sendBeacon primero
    if (navigator.sendBeacon) {
      // sendBeacon no soporta headers personalizados, así que necesitamos usar fetch con keepalive
      try {
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: payload,
          keepalive: true  // 🔑 CLAVE: Mantiene la petición activa aunque se cierre la página
        });
        return true;
      } catch (e) {
        console.error('Error con fetch keepalive:', e);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Error al registrar log con beacon:', error);
    return false;
  }
}
