// ============================================
// USUARIOS ELIMINADOS - HISTORIAL
// ============================================

let todosLosUsuariosEliminados = [];
let usuariosFiltrados = [];
let paginaActual = 1;
const usuariosPorPagina = 20;

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
  
  // Solo Super Admin puede ver esta página
  if (!usuario.es_super_admin) {
    document.body.innerHTML = `
      <div style="text-align: center; padding: 100px 20px;">
        <h1 style="color: #dc3545;">⛔ Acceso Denegado</h1>
        <p style="color: #666; margin-top: 20px;">Solo Super Administradores pueden ver el historial de usuarios eliminados.</p>
        <button onclick="window.close()" style="margin-top: 20px; padding: 10px 30px; background: #6b0f0f; color: white; border: none; border-radius: 6px; cursor: pointer;">Cerrar Ventana</button>
      </div>
    `;
    return;
  }
  
  // Event listener del buscador
  document.getElementById('buscadorEliminados').addEventListener('input', (e) => {
    filtrarUsuarios(e.target.value);
  });
  
  cargarUsuariosEliminados();
});

// ============================================
// 2. CARGAR USUARIOS ELIMINADOS
// ============================================

async function cargarUsuariosEliminados() {
  const tbody = document.getElementById('tablaUsuariosBody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading">Cargando usuarios eliminados...</td></tr>';
  
  try {
    const { data, error } = await supabaseClient
      .from('usuarios_eliminados')
      .select('*')
      .order('fecha_eliminacion', { ascending: false });
    
    if (error) throw error;
    
    todosLosUsuariosEliminados = data || [];
    document.getElementById('statTotal').textContent = todosLosUsuariosEliminados.length;
    filtrarUsuarios(document.getElementById('buscadorEliminados').value);
    
  } catch (error) {
    console.error('Error:', error);
    tbody.innerHTML = `<tr><td colspan="8" class="loading" style="color:#c33;">Error al cargar usuarios: ${error.message}</td></tr>`;
  }
}

// ============================================
// 3. FILTRAR Y RENDERIZAR
// ============================================

function filtrarUsuarios(filtro) {
  const filtroLower = filtro.toLowerCase().trim();
  
  usuariosFiltrados = todosLosUsuariosEliminados.filter(u => {
    if (!filtroLower) return true;
    const texto = `${u.cedula} ${u.primer_nombre} ${u.primer_apellido} ${u.numero_expediente || ''}`.toLowerCase();
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
    `Mostrando ${total > 0 ? inicio + 1 : 0} - ${fin} de ${total} usuarios eliminados`;
  
  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">No hay usuarios eliminados</td></tr>';
    document.getElementById('paginacionUsuarios').innerHTML = '';
    return;
  }
  
  tbody.innerHTML = '';
  
  pagina.forEach(u => {
    const tr = document.createElement('tr');
    const fechaEliminacion = u.fecha_eliminacion 
      ? new Date(u.fecha_eliminacion).toLocaleString('es-VE') 
      : 'N/A';
    
    let badgeNivel;
    if (u.es_super_admin) {
      badgeNivel = '<span class="badge badge-superadmin">⭐ Super Admin</span>';
    } else if (u.nivel_acceso === 'administrador') {
      badgeNivel = '<span class="badge badge-admin">Admin</span>';
    } else {
      badgeNivel = '<span class="badge badge-usuario">Usuario</span>';
    }
    
    let fotoHTML;
    if (u.foto_url) {
      fotoHTML = `<img src="${u.foto_url}" class="foto-mini" alt="Foto">`;
    } else {
      fotoHTML = `<div class="foto-placeholder">👤</div>`;
    }
    
    const expediente = u.numero_expediente || '<span style="color:#888;">-</span>';
    const razon = u.razon_eliminacion || '<span style="color:#888;">No especificada</span>';
    
    tr.innerHTML = `
      <td>${fotoHTML}</td>
      <td><strong>${u.cedula}</strong></td>
      <td>${u.primer_nombre} ${u.primer_apellido}</td>
      <td>${u.jerarquia || '<span style="color:#888;">-</span>'}</td>
      <td>${badgeNivel}</td>
      <td style="font-size: 12px; font-family: monospace;">${expediente}</td>
      <td style="font-size: 12px; color: #dc3545;">${fechaEliminacion}</td>
      <td style="font-size: 12px;">${razon}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  renderizarPaginacion(totalPaginas);
}

// ============================================
// 4. PAGINACIÓN
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
