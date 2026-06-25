// Los elementos del DOM
const loginForm = document.getElementById('loginForm');
const cedulaInput = document.getElementById('cedula');
const mensajeDiv = document.getElementById('mensaje');
const btnIngresar = document.getElementById('btnIngresar');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cedula = cedulaInput.value.trim();
  
  if (!cedula) {
    mostrarMensaje('Por favor ingrese su número de cédula', 'error');
    return;
  }
  
  try {
    // Deshabilitar botón mientras verifica
    btnIngresar.disabled = true;
    btnIngresar.textContent = 'Verificando...';
    
    mostrarMensaje('Verificando credenciales...', 'exito');
    
    // Consultar directamente la tabla de usuarios (sin usar Auth)
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('cedula', cedula)
      .single();
    
    // Rehabilitar botón
    btnIngresar.disabled = false;
    btnIngresar.textContent = 'Ingresar';
    
    if (error || !data) {
      mostrarMensaje('Cédula no encontrada en el sistema', 'error');
      return;
    }
    
    // Guardar datos del usuario en sessionStorage
// Guardar datos del usuario en sessionStorage
sessionStorage.setItem('usuario', JSON.stringify({
  id: data.id,
  cedula: data.cedula,
  nombre: data.primer_nombre,
  apellido: data.primer_apellido,
  jerarquia: data.jerarquia,
  nivel_acceso: data.nivel_acceso,
  foto_url: data.foto_url,
  causa_sancion: data.causa_sancion || '',
  numero_expediente: data.numero_expediente || ''
}));
    mostrarMensaje('Acceso concedido. Redirigiendo...', 'exito');
    
    // Redirigir al dashboard después de 1 segundo
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (err) {
    console.error('Error:', err);
    mostrarMensaje('Error al conectar con el servidor', 'error');
    
    // Rehabilitar botón en caso de error
    btnIngresar.disabled = false;
    btnIngresar.textContent = 'Ingresar';
  }
});

function mostrarMensaje(texto, tipo) {
  mensajeDiv.textContent = texto;
  mensajeDiv.className = `mensaje ${tipo}`;
}
