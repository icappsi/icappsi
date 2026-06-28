// ============================================
// SISTEMA DE LOGS - REGISTRO DE ACTIVIDAD
// ============================================

/**
 * Registra una acción en el log del sistema (versión normal)
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
 * Registra un log de forma síncrona usando sendBeacon
 * Útil para cuando se cierra la pestaña o el navegador
 */
function registrarLogSincrono({ accion, modulo, descripcion, detalles = null }) {
  try {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr) return false;
    
    const usuario = JSON.parse(usuarioStr);
    
    // Crear el objeto del log
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
    
    // Obtener la URL de la API de Supabase para insertar directamente
    const supabaseUrl = supabaseClient.supabaseUrl;
    const supabaseKey = supabaseClient.supabaseKey;
    
    const url = `${supabaseUrl}/rest/v1/logs_sistema`;
    
    const payload = JSON.stringify(logData);
    
    // Usar sendBeacon para enviar los datos de forma confiable
    const blob = new Blob([payload], { type: 'application/json' });
    
    // Crear un Request con los headers necesarios
    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    };
    
    // sendBeacon no soporta headers personalizados, así que usamos XMLHttpRequest sincrónico como fallback
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, false); // false = síncrono
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('apikey', supabaseKey);
      xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
      xhr.setRequestHeader('Prefer', 'return=minimal');
      xhr.send(payload);
      return xhr.status >= 200 && xhr.status < 300;
    } catch (e) {
      console.error('Error en registro síncrono:', e);
      return false;
    }
  } catch (error) {
    console.error('Error al registrar log síncrono:', error);
    return false;
  }
}
