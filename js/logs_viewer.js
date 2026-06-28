// ============================================
// VISUALIZADOR DE LOGS
// ============================================

let todosLosLogs = [];
let logsFiltrados = [];
let paginaActual = 1;
const logsPorPagina = 20;

document.addEventListener('DOMContentLoaded', () => {
  const usuarioStr = sessionStorage.getItem('usuario');
  if (!usuarioStr) {
    window.location.href = '../index.html';
    return;
  }
  
  const usuario = JSON.parse(usuarioStr);
  
  if (!usuario.es_super_admin) {
    document.body.innerHTML = `
      <div style="text-align: center; padding: 100px 20px;">
        <h1 style="color: #dc3545;">⛔ Acceso Denegado</h1>
        <p style="color: #666; margin-top: 20px;">Solo Super Administradores pueden ver los logs del sistema.</p>
        <button onclick="window.close()" style="margin-top: 20px; padding: 10px 30px; background: #6b0f0f; color: white; border: none; border-radius: 6px; cursor: pointer;">Cerrar Ventana</button>
      </div>
    `;
    return;
  }
  
  document.getElementById('buscadorLogs').addEventListener('input', aplicarFiltros);
  document.getElementById('filtroModulo').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroAccion').addEventListener('change', aplicarFiltros);
  
  cargarLogs();
});

async function cargarLogs() {
  const tbody = document.getElementById('tablaLogsBody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Cargando logs...</td></tr>';
  
  try {
    const { data, error } = await supabaseClient
      .from('logs_sistema')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(1000);
    
    if (error) throw error;
    
    todosLosLogs = data || [];
    actualizarEstadisticas();
    aplicarFiltros();
    
  } catch (error) {
    console.error('Error:', error);
    tbody.innerHTML = `<tr><td colspan="7" class="loading" style="color:#c33;">Error: ${error.message}</td></tr>`;
  }
}

function actualizarEstadisticas() {
  document.getElementById('statTotal').textContent = todosLosLogs.length;
  document.getElementById('statLogins').textContent = todosLosLogs.filter(l => l.accion.toLowerCase().includes('login') || l.accion.toLowerCase().includes('sesión')).length;
  document.getElementById('statCreaciones').textContent = todosLosLogs.filter(l => l.accion.toLowerCase().includes('crear') || l.accion.toLowerCase().includes('creación')).length;
  document.getElementById('statEdiciones').textContent = todosLosLogs.filter(l => l.accion.toLowerCase().includes('editar') || l.accion.toLowerCase().includes('edición') || l.accion.toLowerCase().includes('actualizar')).length;
  document.getElementById('statEliminaciones').textContent = todosLosLogs.filter(l => l.accion.toLowerCase().includes('eliminar') || l.accion.toLowerCase().includes('eliminación')).length;
}

function aplicarFiltros() {
  const buscador = document.getElementById('buscadorLogs').value.toLowerCase().trim();
  const filtroModulo = document.getElementById('filtroModulo').value;
  const filtroAccion = document.getElementById('filtroAccion').value;
  
  logsFiltrados = todosLosLogs.filter(log => {
    // Filtro de texto
    if (buscador) {
      const texto = `${log.usuario_nombre} ${log.usuario_cedula} ${log.accion} ${log.descripcion} ${log.modulo || ''}`.toLowerCase();
      if (!texto.includes(buscador)) return false;
    }
    
    // Filtro por módulo
    if (filtroModulo && log.modulo !== filtroModulo) return false;
    
    // Filtro por tipo de acción
    if (filtroAccion) {
      const accion = log.accion.toLowerCase();
      if (filtroAccion === 'login' && !accion.includes('login') && !accion.includes('sesión')) return false;
      if (filtroAccion === 'crear' && !accion.includes('crear') && !accion.includes('creación')) return false;
      if (filtroAccion === 'editar' && !accion.includes('editar') && !accion.includes('edición') && !accion.includes('actualizar')) return false;
      if (filtroAccion === 'eliminar' && !accion.includes('eliminar') && !accion.includes('eliminación')) return false;
    }
    
    return true;
  });
  
  paginaActual = 1;
  renderizarTabla();
}

function renderizarTabla() {
  const tbody = document.getElementById('tablaLogsBody');
  const total = logsFiltrados.length;
  const totalPaginas = Math.ceil(total / logsPorPagina);
  const inicio = (paginaActual - 1) * logsPorPagina;
  const fin = Math.min(inicio + logsPorPagina, total);
  const pagina = logsFiltrados.slice(inicio, fin);
  
  document.getElementById('contadorLogs').textContent = 
    `Mostrando ${total > 0 ? inicio + 1 : 0} - ${fin} de ${total} registros`;
  
  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">No hay registros que coincidan con los filtros</td></tr>';
    document.getElementById('paginacionLogs').innerHTML = '';
    return;
  }
  
  tbody.innerHTML = '';
  
  pagina.forEach(log => {
    const tr = document.createElement('tr');
    const fecha = new Date(log.fecha).toLocaleString('es-VE');
    
let badgeAccion;
const accionLower = log.accion.toLowerCase();
if (accionLower === 'logout' || accionLower.includes('logout')) {
  badgeAccion = '<span class="badge-accion badge-logout">🔴 Logout</span>';
} else if (accionLower.includes('login') || (accionLower.includes('sesión') && !accionLower.includes('cerró'))) {
  badgeAccion = '<span class="badge-accion badge-login">🟢 Login</span>';
} else if (accionLower.includes('crear') || accionLower.includes('creación')) {
  badgeAccion = '<span class="badge-accion badge-crear"> Crear</span>';
} else if (accionLower.includes('editar') || accionLower.includes('edición') || accionLower.includes('actualizar')) {
  badgeAccion = '<span class="badge-accion badge-editar">🟡 Editar</span>';
} else if (accionLower.includes('eliminar') || accionLower.includes('eliminación')) {
  badgeAccion = '<span class="badge-accion badge-eliminar">🔴 Eliminar</span>';
} else {
  badgeAccion = '<span class="badge-accion badge-otro">⚪ Otro</span>';
}
    
    const badgeModulo = log.modulo ? `<span class="badge-modulo">${log.modulo}</span>` : '<span style="color:#888;">-</span>';
    
    const descripcionCorta = log.descripcion 
      ? (log.descripcion.length > 50 ? log.descripcion.substring(0, 50) + '...' : log.descripcion)
      : '<span style="color:#888;">-</span>';
    
    const tieneDetalles = log.detalles && Object.keys(log.detalles).length > 0;
    const btnDetalles = tieneDetalles 
      ? `<button class="btn btn-info btn-ver-detalles" data-id="${log.id}" style="padding: 4px 10px; font-size: 11px;">🔍 Ver</button>`
      : '<span style="color:#888;">-</span>';
    
    tr.innerHTML = `
      <td style="font-size: 12px; white-space: nowrap;">${fecha}</td>
      <td><strong>${log.usuario_nombre || 'Sistema'}</strong></td>
      <td>${log.usuario_cedula || '-'}</td>
      <td>${badgeAccion}</td>
      <td>${badgeModulo}</td>
      <td title="${log.descripcion || ''}">${descripcionCorta}</td>
      <td>${btnDetalles}</td>
    `;
    
    tbody.appendChild(tr);
    
    if (tieneDetalles) {
      tr.querySelector('.btn-ver-detalles').addEventListener('click', () => {
        mostrarDetalles(log);
      });
    }
  });
  
  renderizarPaginacion(totalPaginas);
}

function mostrarDetalles(log) {
  const fecha = new Date(log.fecha).toLocaleString('es-VE');
  const detallesHTML = `
    <div class="detalles-item">
      <strong>Fecha y Hora</strong>
      <div>${fecha}</div>
    </div>
    <div class="detalles-item">
      <strong>Usuario</strong>
      <div>${log.usuario_nombre || 'Sistema'} (Cédula: ${log.usuario_cedula || '-'})</div>
    </div>
    <div class="detalles-item">
      <strong>Acción</strong>
      <div>${log.accion}</div>
    </div>
    <div class="detalles-item">
      <strong>Módulo</strong>
      <div>${log.modulo || '-'}</div>
    </div>
    <div class="detalles-item">
      <strong>Descripción</strong>
      <div>${log.descripcion || '-'}</div>
    </div>
    ${log.detalles ? `
    <div class="detalles-item">
      <strong>Detalles Adicionales</strong>
      <pre>${JSON.stringify(log.detalles, null, 2)}</pre>
    </div>
    ` : ''}
    <div class="detalles-item">
      <strong>Navegador</strong>
      <div style="font-size: 11px; word-break: break-all;">${log.user_agent || '-'}</div>
    </div>
  `;
  
  document.getElementById('detallesContenido').innerHTML = detallesHTML;
  document.getElementById('modalDetalles').style.display = 'flex';
}

function renderizarPaginacion(totalPaginas) {
  const div = document.getElementById('paginacionLogs');
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
