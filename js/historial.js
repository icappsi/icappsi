// ============================================
// HISTORIAL GENERAL - COMPLETO
// ============================================

let todosLosUsuariosData = [];
let usuariosFiltrados = [];
let paginaActual = 1;
const usuariosPorPagina = 10;

// ============================================
// 1. INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const usuarioStr = sessionStorage.getItem('usuario');
  if (!usuarioStr) {
    window.location.href = '../index.html';
    return;
  }
  
  const usuario = JSON.parse(usuarioStr);
  if (usuario.nivel_acceso !== 'administrador') {
    alert('Acceso denegado. Solo administradores pueden ver el historial.');
    window.location.href = '../index.html';
    return;
  }
  
  // Event listener del buscador
  document.getElementById('buscadorUsuarios').addEventListener('input', (e) => {
    filtrarUsuarios(e.target.value);
  });
  
  cargarDatos();
});

// ============================================
// 2. CARGAR TODOS LOS DATOS
// ============================================

async function cargarDatos() {
  try {
    // Cargar todas las estadísticas en paralelo
    await Promise.all([
      cargarEstadisticasPruebas(),
      cargarEstadisticasConfirmaciones(),
      cargarEstadisticasUsuarios(),
      cargarDetalleUsuarios()
    ]);
  } catch (error) {
    console.error('Error cargando datos:', error);
    alert('Error al cargar los datos del historial');
  }
}

// ============================================
// 3. ESTADÍSTICAS DE PRUEBAS
// ============================================

async function cargarEstadisticasPruebas() {
  try {
    // Total de pruebas creadas
    const { data: pruebas, error: errorPruebas } = await supabaseClient
      .from('pruebas')
      .select('id');
    
    if (errorPruebas) throw errorPruebas;
    document.getElementById('statPruebas').textContent = pruebas ? pruebas.length : 0;
    
    // Pruebas aprobadas y reprobadas
    const { data: intentos, error: errorIntentos } = await supabaseClient
      .from('intentos_pruebas')
      .select('puntuacion, estado')
      .eq('estado', 'completado');
    
    if (errorIntentos) throw errorIntentos;
    
    let aprobados = 0;
    let reprobados = 0;
    
    if (intentos) {
      intentos.forEach(i => {
        if (i.puntuacion >= 60) {
          aprobados++;
        } else {
          reprobados++;
        }
      });
    }
    
    document.getElementById('statAprobados').textContent = aprobados;
    document.getElementById('statReprobados').textContent = reprobados;
    
  } catch (error) {
    console.error('Error cargando estadísticas de pruebas:', error);
  }
}

// ============================================
// 4. ESTADÍSTICAS DE CONFIRMACIONES
// ============================================

async function cargarEstadisticasConfirmaciones() {
  try {
    // Total de confirmaciones
    const { data: confirmaciones, error: errorConf } = await supabaseClient
      .from('confirmaciones_lectura')
      .select('material_id, material_apoyo:material_id(tipo)');
    
    if (errorConf) throw errorConf;
    
    document.getElementById('statConfirmaciones').textContent = confirmaciones ? confirmaciones.length : 0;
    
    // Contar por tipo de material
    const categorias = {
      documentos: 0,
      videos: 0,
      imagenes: 0,
      presentaciones: 0,
      blogs: 0
    };
    
    if (confirmaciones) {
      confirmaciones.forEach(c => {
        const tipo = c.material_apoyo?.tipo;
        if (tipo === 'documento') categorias.documentos++;
        else if (tipo === 'video') categorias.videos++;
        else if (tipo === 'imagen') categorias.imagenes++;
        else if (tipo === 'presentacion') categorias.presentaciones++;
        else if (tipo === 'blog') categorias.blogs++;
      });
    }
    
    document.getElementById('catDocumentos').textContent = categorias.documentos;
    document.getElementById('catVideos').textContent = categorias.videos;
    document.getElementById('catImagenes').textContent = categorias.imagenes;
    document.getElementById('catPresentaciones').textContent = categorias.presentaciones;
    document.getElementById('catBlogs').textContent = categorias.blogs;
    
    // Total de materiales publicados
    const { data: materiales, error: errorMat } = await supabaseClient
      .from('material_apoyo')
      .select('id');
    
    if (errorMat) throw errorMat;
    document.getElementById('statMateriales').textContent = materiales ? materiales.length : 0;
    
  } catch (error) {
    console.error('Error cargando confirmaciones:', error);
  }
}

// ============================================
// 5. ESTADÍSTICAS DE USUARIOS
// ============================================

async function cargarEstadisticasUsuarios() {
  try {
    const { data: usuarios, error } = await supabaseClient
      .from('usuarios')
      .select('id');
    
    if (error) throw error;
    document.getElementById('statUsuarios').textContent = usuarios ? usuarios.length : 0;
    
  } catch (error) {
    console.error('Error cargando usuarios:', error);
  }
}

// ============================================
// 6. DETALLE DE USUARIOS CON RENDIMIENTO
// ============================================

async function cargarDetalleUsuarios() {
  const tbody = document.getElementById('tablaUsuariosBody');
  tbody.innerHTML = '<tr><td colspan="11" class="loading">Cargando detalle de usuarios...</td></tr>';
  
  try {
    // Obtener todos los usuarios
    const { data: usuarios, error: errorUsuarios } = await supabaseClient
      .from('usuarios')
      .select('*')
      .order('creado_en', { ascending: false });
    
    if (errorUsuarios) throw errorUsuarios;
    if (!usuarios) {
      tbody.innerHTML = '<tr><td colspan="11" class="loading">No hay usuarios registrados</td></tr>';
      return;
    }
    
    // Obtener todos los intentos de pruebas
    const { data: intentos, error: errorIntentos } = await supabaseClient
      .from('intentos_pruebas')
      .select('usuario_id, puntuacion, estado');
    
    // Obtener todas las confirmaciones
    const { data: confirmaciones, error: errorConf } = await supabaseClient
      .from('confirmaciones_lectura')
      .select('usuario_id');
    
    // Procesar datos por usuario
    todosLosUsuariosData = usuarios.map(u => {
      const intentosUsuario = (intentos || []).filter(i => i.usuario_id === u.id && i.estado === 'completado');
      const confirmacionesUsuario = (confirmaciones || []).filter(c => c.usuario_id === u.id);
      
      const pruebasRealizadas = intentosUsuario.length;
      const aprobadas = intentosUsuario.filter(i => i.puntuacion >= 60).length;
      const reprobadas = intentosUsuario.filter(i => i.puntuacion < 60).length;
      const mejorPuntuacion = intentosUsuario.length > 0 
        ? Math.max(...intentosUsuario.map(i => i.puntuacion))
        : null;
      const totalConfirmaciones = confirmacionesUsuario.length;
      
      return {
        ...u,
        pruebasRealizadas,
        aprobadas,
        reprobadas,
        mejorPuntuacion,
        totalConfirmaciones
      };
    });
    
    filtrarUsuarios(document.getElementById('buscadorUsuarios').value);
    
  } catch (error) {
    console.error('Error:', error);
    tbody.innerHTML = `<tr><td colspan="11" class="loading" style="color:#c33;">Error: ${error.message}</td></tr>`;
  }
}

// ============================================
// 7. FILTRAR Y RENDERIZAR TABLA
// ============================================

function filtrarUsuarios(filtro) {
  const filtroLower = filtro.toLowerCase().trim();
  
  usuariosFiltrados = todosLosUsuariosData.filter(u => {
    if (!filtroLower) return true;
    const texto = `${u.cedula} ${u.primer_nombre} ${u.primer_apellido} ${u.numero_expediente || ''} ${u.jerarquia || ''}`.toLowerCase();
    return texto.includes(filtroLower);
  });
  
  paginaActual = 1;
  renderizarTabla();
}

function renderizarTabla() {
  const tbody = document.getElementById('tablaUsuariosBody');
  const total = usuariosFiltrados.length;
  const totalPaginas = Math.ceil(total / usuariosPorPagina);
  const inicio = (paginaActual - 1) * usuariosPorPagina;
  const fin = Math.min(inicio + usuariosPorPagina, total);
  const pagina = usuariosFiltrados.slice(inicio, fin);
  
  document.getElementById('contadorUsuarios').textContent = 
    `Mostrando ${total > 0 ? inicio + 1 : 0} - ${fin} de ${total} usuarios`;
  
  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="loading">No se encontraron usuarios</td></tr>';
    document.getElementById('paginacionUsuarios').innerHTML = '';
    return;
  }
  
  tbody.innerHTML = '';
  
  pagina.forEach(u => {
    const tr = document.createElement('tr');
    const badgeNivel = u.nivel_acceso === 'administrador' 
      ? '<span class="badge badge-admin">Admin</span>' 
      : '<span class="badge badge-usuario">Usuario</span>';
    
    // Foto
    let fotoHTML;
    if (u.foto_url) {
      fotoHTML = `<img src="${u.foto_url}" class="foto-mini" alt="Foto">`;
    } else {
      fotoHTML = `<div class="foto-placeholder">👤</div>`;
    }
    
    // Expediente
    const expediente = u.numero_expediente || '<span style="color:#888;">-</span>';
    
    // Pruebas realizadas
    const pruebasHTML = u.pruebasRealizadas > 0 
      ? `<strong>${u.pruebasRealizadas}</strong>` 
      : '<span style="color:#888;">0</span>';
    
    // Aprobadas
    const aprobadasHTML = u.aprobadas > 0 
      ? `<span class="badge badge-aprobado">${u.aprobadas}</span>` 
      : '<span style="color:#888;">0</span>';
    
    // Reprobadas
    const reprobadasHTML = u.reprobadas > 0 
      ? `<span class="badge badge-reprobado">${u.reprobadas}</span>` 
      : '<span style="color:#888;">0</span>';
    
    // Mejor puntuación
    let puntuacionHTML;
    if (u.mejorPuntuacion === null) {
      puntuacionHTML = '<span class="badge badge-sin-pruebas">Sin pruebas</span>';
    } else {
      let clase = 'puntuacion-baja';
      if (u.mejorPuntuacion >= 80) clase = 'puntuacion-alta';
      else if (u.mejorPuntuacion >= 60) clase = 'puntuacion-media';
      puntuacionHTML = `<span class="${clase}">${u.mejorPuntuacion.toFixed(1)}%</span>`;
    }
    
    // Confirmaciones
    const confirmacionesHTML = u.totalConfirmaciones > 0 
      ? `<strong>${u.totalConfirmaciones}</strong>` 
      : '<span style="color:#888;">0</span>';
    
    tr.innerHTML = `
      <td>${fotoHTML}</td>
      <td><strong>${u.cedula}</strong></td>
      <td>${u.primer_nombre} ${u.primer_apellido}</td>
      <td>${u.jerarquia || '<span style="color:#888;">-</span>'}</td>
      <td>${badgeNivel}</td>
      <td style="font-size: 12px; font-family: monospace;">${expediente}</td>
      <td style="text-align:center;">${pruebasHTML}</td>
      <td style="text-align:center;">${aprobadasHTML}</td>
      <td style="text-align:center;">${reprobadasHTML}</td>
      <td style="text-align:center;">${puntuacionHTML}</td>
      <td style="text-align:center;">${confirmacionesHTML}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  renderizarPaginacion(totalPaginas);
}

// ============================================
// 8. PAGINACIÓN
// ============================================

function renderizarPaginacion(totalPaginas) {
  const div = document.getElementById('paginacionUsuarios');
  div.innerHTML = '';
  
  if (totalPaginas <= 1) return;
  
  const btnAnt = document.createElement('button');
  btnAnt.textContent = '← Anterior';
  btnAnt.disabled = paginaActual === 1;
  btnAnt.addEventListener('click', () => {
    if (paginaActual > 1) {
      paginaActual--;
      renderizarTabla();
    }
  });
  div.appendChild(btnAnt);
  
  let inicioPag = Math.max(1, paginaActual - 2);
  let finPag = Math.min(totalPaginas, inicioPag + 4);
  if (finPag - inicioPag < 4) inicioPag = Math.max(1, finPag - 4);
  
  for (let i = inicioPag; i <= finPag; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'page-num' + (i === paginaActual ? ' active' : '');
    btn.addEventListener('click', () => {
      paginaActual = i;
      renderizarTabla();
    });
    div.appendChild(btn);
  }
  
  const btnSig = document.createElement('button');
  btnSig.textContent = 'Siguiente →';
  btnSig.disabled = paginaActual === totalPaginas;
  btnSig.addEventListener('click', () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      renderizarTabla();
    }
  });
  div.appendChild(btnSig);
}
