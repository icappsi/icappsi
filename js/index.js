// Configuración de Supabase
const SUPABASE_URL = 'TU_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById('loginForm');
const cedulaInput = document.getElementById('cedula');
const mensajeDiv = document.getElementById('mensaje');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cedula = cedulaInput.value.trim();
  
  if (!cedula) {
    mostrarMensaje('Por favor ingrese su número de cédula', 'error');
    return;
  }
  
  try {
    mostrarMensaje('Verificando...', 'exito');
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('cedula', cedula)
      .single();
    
    if (error || !data) {
      mostrarMensaje('Cédula no encontrada en el sistema', 'error');
      return;
    }
    
    // Guardar datos del usuario en sessionStorage
    sessionStorage.setItem('usuario', JSON.stringify({
      id: data.id,
      cedula: data.cedula,
      nombre: data.primer_nombre,
      apellido: data.primer_apellido,
      jerarquia: data.jerarquia,
      nivel_acceso: data.nivel_acceso,
      foto_url: data.foto_url
    }));
    
    mostrarMensaje('Acceso concedido. Redirigiendo...', 'exito');
    
    // Redirigir al dashboard después de 1 segundo
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (err) {
    console.error('Error:', err);
    mostrarMensaje('Error al conectar con el servidor', 'error');
  }
});

function mostrarMensaje(texto, tipo) {
  mensajeDiv.textContent = texto;
  mensajeDiv.className = `mensaje ${tipo}`;
}
