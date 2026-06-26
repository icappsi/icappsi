// ============================================
// MÓDULO DE SEGURIDAD - HASH Y VALIDACIÓN
// ============================================

// Función para generar hash SHA-256
async function generarHash(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Función para verificar contraseña
async function verificarPassword(passwordIngresada, hashGuardado) {
  const hashIngresado = await generarHash(passwordIngresada);
  return hashIngresado === hashGuardado;
}

// Función para generar contraseña aleatoria (para nuevos admins)
function generarPasswordAleatoria(longitud = 12) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < longitud; i++) {
    password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return password;
}
