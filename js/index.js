// ============================================
// LOGIN CON SISTEMA DE SEGURIDAD
// ============================================

const loginForm = document.getElementById('loginForm');
const cedulaInput = document.getElementById('cedula');
const passwordInput = document.getElementById('password');
const passwordGroup = document.getElementById('passwordGroup');
const mensajeDiv = document.getElementById('mensaje');
const btnIngresar = document.getElementById('btnIngresar');

let usuarioDetectado = null;

// Permitir solo números en la cédula
cedulaInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '');
});

// Cuando el usuario termina de escribir la cédula, verificar si es admin
cedulaInput.addEventListener('blur', async () => {
  const cedula = cedulaInput.value.trim();
  
  if (cedula.length < 7) {
    passwordGroup.style.display = 'none';
    usuarioDetectado = null;
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('id, cedula, primer_nombre, primer_apellido, jerarquia, nivel_acceso, foto_url, password_hash, es_super_admin, causa_sancion, numero_expediente')
      .eq('cedula', cedula)
      .maybeSingle();
    
    if (error || !data) {
      usuarioDetectado = null;
      passwordGroup.style.display = 'none';
      return;
    }
    
    usuarioDetectado = data;
    
    // Si es administrador, mostrar campo de contraseña
    if (data.nivel_acceso === 'administrador') {
      passwordGroup.style.display = 'block';
      setTimeout(() => {
        passwordInput.focus();
      }, 100);
    } else {
      passwordGroup.style.display = 'none';
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
});

// También verificar al presionar Enter en la cédula
cedulaInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && usuarioDetectado && usuarioDetectado.nivel_acceso !== 'administrador') {
    loginForm.dispatchEvent(new Event('submit'));
  }
});

// Enviar formulario
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cedula = cedulaInput.value.trim();
  
  if (!cedula) {
    mostrarMensaje('Por favor ingrese su número de cédula', 'error');
    return;
  }
  
  try {
    btnIngresar.disabled = true;
    btnIngresar.textContent = 'Verificando...';
    mostrarMensaje('Verificando credenciales...', 'info');
    
    // Buscar usuario
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('cedula', cedula)
      .single();
    
    if (error || !data) {
      mostrarMensaje('❌ Cédula no encontrada en el sistema', 'error');
      resetButton();
      return;
    }
    
    // Si es administrador, verificar contraseña
    if (data.nivel_acceso === 'administrador') {
      const password = passwordInput.value;
      
      if (!password) {
        mostrarMensaje('🔐 Los administradores deben ingresar su contraseña', 'error');
        passwordInput.focus();
        resetButton();
        return;
      }
      
      if (!data.password_hash) {
        mostrarMensaje('⚠️ Este administrador no tiene contraseña configurada. Contacte al Super Administrador.', 'error');
        resetButton();
        return;
      }
      
      // Verificar contraseña
      const passwordValida = await verificarPassword(password, data.password_hash);
      
      if (!passwordValida) {
        mostrarMensaje('❌ Contraseña incorrecta', 'error');
        passwordInput.value = '';
        passwordInput.focus();
        resetButton();
        return;
      }
    }
    
    // Verificar sesión activa
    const { data: sesionExistente, error: errorSesion } = await supabaseClient
      .from('sesiones_activas')
      .select('*')
      .eq('cedula', cedula)
      .maybeSingle();
    
    if (sesionExistente) {
      mostrarMensaje('⚠️ Este usuario ya tiene una sesión activa. Debe cerrar sesión primero.', 'error');
      resetButton();
      return;
    }
    
    // Crear sesión activa
    await supabaseClient
      .from('sesiones_activas')
      .insert({ cedula: cedula, usuario_id: data.id });
    
    // Guardar datos del usuario en sessionStorage
    // 🆕 NUEVO: Registrar log de inicio de sesión
if (typeof registrarLog === 'function') {
  await registrarLog({
    accion: 'Inicio de sesión',
    modulo: 'Autenticación',
    descripcion: `El usuario ${data.primer_nombre} ${data.primer_apellido} inició sesión en el sistema`,
    detalles: {
      cedula: data.cedula,
      nivel: data.nivel_acceso,
      es_super_admin: data.es_super_admin || false,
      tipo_usuario: data.es_super_admin ? 'Super Admin' : (data.nivel_acceso === 'administrador' ? 'Administrador' : 'Usuario Normal')
    }
  });
}
      id: data.id,
      cedula: data.cedula,
      nombre: data.primer_nombre,
      apellido: data.primer_apellido,
      jerarquia: data.jerarquia,
      nivel_acceso: data.nivel_acceso,
      foto_url: data.foto_url,
      causa_sancion: data.causa_sancion || '',
      numero_expediente: data.numero_expediente || '',
      es_super_admin: data.es_super_admin || false
    }));
    
    mostrarMensaje('✅ Acceso concedido. Redirigiendo...', 'exito');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (err) {
    console.error('Error:', err);
    mostrarMensaje('❌ Error al conectar con el servidor', 'error');
    resetButton();
  }
});

function mostrarMensaje(texto, tipo) {
  mensajeDiv.textContent = texto;
  mensajeDiv.className = `mensaje ${tipo}`;
}

function resetButton() {
  btnIngresar.disabled = false;
  btnIngresar.textContent = 'Ingresar';
}
