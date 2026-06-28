// ============================================
// SISTEMA DE PRUEBAS - VERSIÓN COMPLETA
// ============================================

let pruebaActual = null;
let preguntasActuales = [];
let respuestasUsuario = {};
let tiempoRestante = 0;
let intervaloTiempo = null;
let paginaPreguntasActual = 1;
const preguntasPorPagina = 10;

let todosLosUsuarios = [];
let todosLosIntentos = [];
let pruebaIdActual = null;

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
  
  if (usuario.nivel_acceso === 'administrador') {
    document.getElementById('adminPruebasSection').style.display = 'block';
    cargarPruebasAdmin();
    document.getElementById('btnNuevaPrueba').addEventListener('click', () => abrirModalPrueba());
  }
  
  cargarPruebasUsuario();
  configurarModales();
});

// ============================================
// 2. CONFIGURACIÓN DE MODALES
// ============================================

function configurarModales() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    if (modal.id === 'modalPrueba') return;
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });
  
  const safeAddListener = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };
  
  safeAddListener('btnCancelarPrueba', 'click', () => document.getElementById('modalPrueba').style.display = 'none');
  safeAddListener('btnCerrarGestion', 'click', () => document.getElementById('modalGestionPreguntas').style.display = 'none');
  safeAddListener('btnCancelarPregunta', 'click', () => document.getElementById('modalPregunta').style.display = 'none');
  safeAddListener('btnCerrarAsignar', 'click', () => document.getElementById('modalAsignarUsuarios').style.display = 'none');
  safeAddListener('btnCerrarResultados', 'click', () => document.getElementById('modalResultados').style.display = 'none');
  safeAddListener('btnCerrarDetalle', 'click', () => document.getElementById('modalDetalle').style.display = 'none');
  
  const preguntaTipo = document.getElementById('preguntaTipo');
  if (preguntaTipo) {
    preguntaTipo.addEventListener('change', function() {
      const tipo = this.value;
      const opc = document.getElementById('opcionesContainer');
      const resp = document.getElementById('respuestaCorrectaContainer');
      const txt = document.getElementById('textoLibreConfig');
      if (opc) opc.style.display = tipo === 'opcion_multiple' ? 'block' : 'none';
      if (resp) resp.style.display = tipo === 'verdadero_falso' ? 'block' : 'none';
      if (txt) txt.style.display = tipo === 'texto_libre' ? 'block' : 'none';
    });
  }
  
  safeAddListener('btnAgregarOpcion', 'click', agregarOpcion);
  safeAddListener('btnGuardarPrueba', 'click', guardarPrueba);
  safeAddListener('btnGuardarPregunta', 'click', guardarPregunta);
  safeAddListener('btnImprimir', 'click', () => window.print());
  safeAddListener('btnEnviarPrueba', 'click', enviarPrueba);
  safeAddListener('buscarUsuario', 'input', (e) => filtrarUsuarios(e.target.value));
  safeAddListener('buscarResultado', 'input', (e) => filtrarResultados(e.target.value));
  safeAddListener('btnSeleccionarTodos', 'click', seleccionarTodosUsuarios);
  safeAddListener('btnDeseleccionarTodos', 'click', deseleccionarTodosUsuarios);
}

// ============================================
// 3. FUNCIONES AUXILIARES
// ============================================

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function evaluarTextoLibre(respuestaUsuario, pregunta) {
  if (pregunta.evaluacion_manual) return { correcta: false, manual: true };
  
  const textoUsuario = normalizarTexto(respuestaUsuario || '');
  if (!textoUsuario) return { correcta: false, manual: false };
  
  if (pregunta.palabras_clave && pregunta.palabras_clave.length > 0) {
    const palabrasEncontradas = pregunta.palabras_clave.filter(palabra => 
      textoUsuario.includes(normalizarTexto(palabra))
    );
    const total = pregunta.palabras_clave.length;
    const minimo = Math.max(1, Math.ceil(total * 0.67));
    if (palabrasEncontradas.length >= minimo) return { correcta: true, manual: false };
  }
  
  if (pregunta.respuestas_validas && pregunta.respuestas_validas.length > 0) {
    const coincide = pregunta.respuestas_validas.some(respuestaValida => {
      const respuestaNorm = normalizarTexto(respuestaValida);
      if (textoUsuario === respuestaNorm) return true;
      const palabrasU = textoUsuario.split(' ').filter(p => p);
      const palabrasR = respuestaNorm.split(' ').filter(p => p);
      const coincidentes = palabrasU.filter(p => palabrasR.some(pr => pr.includes(p) || p.includes(pr)));
      return (coincidentes.length / Math.max(palabrasU.length, palabrasR.length)) >= 0.7;
    });
    if (coincide) return { correcta: true, manual: false };
  }
  
  return { correcta: false, manual: false };
}

// ============================================
// 4. FILTRAR USUARIOS Y RESULTADOS
// ============================================

function filtrarUsuarios(filtro) {
  const filtroLower = filtro.toLowerCase().trim();
  const lista = document.getElementById('listaUsuariosAsignar');
  lista.innerHTML = '';
  
  const filtrados = todosLosUsuarios.filter(u => {
    if (!filtroLower) return true;
    const texto = `${u.cedula} ${u.primer_nombre} ${u.primer_apellido}`.toLowerCase();
    return texto.includes(filtroLower);
  });
  
  document.getElementById('contadorAsignados').textContent = 
    `Mostrando ${filtrados.length} de ${todosLosUsuarios.length} usuarios`;
  
  if (filtrados.length === 0) {
    lista.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">No se encontraron usuarios.</p>';
    return;
  }
  
  filtrados.forEach(u => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; justify-content:space-between; padding:10px; border:1px solid #e0e0e0; border-radius:6px; margin-bottom:10px;';
    div.innerHTML = `
      <div>
        <p style="margin:0; font-weight:600;">${u.primer_nombre} ${u.primer_apellido}</p>
        <p style="margin:0; font-size:12px; color:#888;">Cédula: ${u.cedula}</p>
      </div>
      <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
        <input type="checkbox" class="checkbox-usuario" ${u.asignado ? 'checked' : ''} data-uid="${u.id}" style="width:20px; height:20px;">
        <span>Habilitar</span>
      </label>
    `;
    lista.appendChild(div);
    
    div.querySelector('.checkbox-usuario').addEventListener('change', async (e) => {
      if (e.target.checked) {
        await supabaseClient.from('pruebas_usuarios').insert({ prueba_id: pruebaIdActual, usuario_id: u.id });
        u.asignado = true;
        
        // 🆕 REGISTRAR LOG DE ASIGNAR USUARIO A PRUEBA
        if (typeof registrarLog === 'function') {
          const { data: pruebaData } = await supabaseClient.from('pruebas').select('titulo').eq('id', pruebaIdActual).single();
          await registrarLog({
            accion: 'Asignar usuario a prueba',
            modulo: 'Pruebas',
            descripcion: `Usuario ${u.primer_nombre} ${u.primer_apellido} habilitado para prueba: ${pruebaData?.titulo || 'ID ' + pruebaIdActual}`,
            detalles: { 
              usuario_id: u.id,
              usuario_cedula: u.cedula,
              prueba_id: pruebaIdActual
            }
          });
        }
      } else {
        await supabaseClient.from('pruebas_usuarios').delete().eq('prueba_id', pruebaIdActual).eq('usuario_id', u.id);
        u.asignado = false;
        
        // 🆕 REGISTRAR LOG DE DESASIGNAR USUARIO DE PRUEBA
        if (typeof registrarLog === 'function') {
          const { data: pruebaData } = await supabaseClient.from('pruebas').select('titulo').eq('id', pruebaIdActual).single();
          await registrarLog({
            accion: 'Desasignar usuario de prueba',
            modulo: 'Pruebas',
            descripcion: `Usuario ${u.primer_nombre} ${u.primer_apellido} deshabilitado de prueba: ${pruebaData?.titulo || 'ID ' + pruebaIdActual}`,
            detalles: { 
              usuario_id: u.id,
              usuario_cedula: u.cedula,
              prueba_id: pruebaIdActual
            }
          });
        }
      }
    });
  });
}

function filtrarResultados(filtro) {
  const filtroLower = filtro.toLowerCase().trim();
  const lista = document.getElementById('listaResultados');
  lista.innerHTML = '';
  
  const filtrados = todosLosIntentos.filter(i => {
    if (!filtroLower) return true;
    const texto = `${i.usuarios.cedula} ${i.usuarios.primer_nombre} ${i.usuarios.primer_apellido}`.toLowerCase();
    return texto.includes(filtroLower);
  });
  
  document.getElementById('contadorResultados').textContent = 
    `Mostrando ${filtrados.length} de ${todosLosIntentos.length} resultados`;
  
  if (filtrados.length === 0) {
    lista.innerHTML = '<p style="text-align:center; color:#888; padding:40px;">No hay resultados.</p>';
    return;
  }
  
  filtrados.forEach(i => {
    const pct = i.total_preguntas > 0 ? ((i.respuestas_correctas / i.total_preguntas) * 100).toFixed(1) : 0;
    const estado = i.puntuacion >= 60 ? 'Aprobado' : 'Reprobado';
    const color = i.puntuacion >= 60 ? '#28a745' : '#dc3545';
    
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
        <div>
          <p style="margin:0; font-weight:600;">${i.usuarios.primer_nombre} ${i.usuarios.primer_apellido}</p>
          <p style="margin:5px 0 0; font-size:12px; color:#888;">Cédula: ${i.usuarios.cedula}</p>
        </div>
        <div style="text-align:center;">
          <p style="margin:0; font-size:28px; font-weight:700; color:${color};">${pct}%</p>
          <p style="margin:5px 0 0; font-size:14px; font-weight:600; color:${color};">${estado}</p>
        </div>
        <div style="display:flex; gap:5px;">
          <button class="btn btn-info btn-ver-detalle" data-id="${i.id}">📋 Detalle</button>
          <button class="btn btn-warning btn-rehabilitar" data-id="${i.id}">🔄 Rehabilitar</button>
        </div>
      </div>
    `;
    lista.appendChild(card);
    
    card.querySelector('.btn-ver-detalle').addEventListener('click', () => verDetalleIntento(i.id, pruebaIdActual));
    card.querySelector('.btn-rehabilitar').addEventListener('click', async () => {
      if (confirm('¿Rehabilitar esta prueba?')) {
        await supabaseClient.from('intentos_pruebas').delete().eq('id', i.id);
        
        // 🆕 REGISTRAR LOG DE REHABILITAR INTENTO
        if (typeof registrarLog === 'function') {
          const { data: pruebaData } = await supabaseClient.from('pruebas').select('titulo').eq('id', pruebaIdActual).single();
          await registrarLog({
            accion: 'Rehabilitar intento de prueba',
            modulo: 'Pruebas',
            descripcion: `Intento rehabilitado para ${i.usuarios.primer_nombre} ${i.usuarios.primer_apellido} en prueba: ${pruebaData?.titulo || 'ID ' + pruebaIdActual}`,
            detalles: { 
              intento_id: i.id,
              usuario_id: i.usuario_id,
              usuario_cedula: i.usuarios.cedula,
              prueba_id: pruebaIdActual,
              puntuacion_anterior: i.puntuacion
            }
          });
        }
        
        alert('Prueba rehabilitada');
        verResultados(pruebaIdActual);
      }
    });
  });
}

function seleccionarTodosUsuarios() {
  const checkboxes = document.querySelectorAll('.checkbox-usuario:not(:checked)');
  checkboxes.forEach(async (cb) => {
    cb.checked = true;
    const uid = cb.dataset.uid;
    const usuario = todosLosUsuarios.find(u => u.id === uid);
    if (usuario && !usuario.asignado) {
      const { error } = await supabaseClient.from('pruebas_usuarios').insert({ prueba_id: pruebaIdActual, usuario_id: uid });
      if (!error) usuario.asignado = true;
    }
  });
  alert(`${checkboxes.length} usuarios habilitados`);
}

function deseleccionarTodosUsuarios() {
  const checkboxes = document.querySelectorAll('.checkbox-usuario:checked');
  checkboxes.forEach(async (cb) => {
    cb.checked = false;
    const uid = cb.dataset.uid;
    const usuario = todosLosUsuarios.find(u => u.id === uid);
    if (usuario && usuario.asignado) {
      const { error } = await supabaseClient.from('pruebas_usuarios').delete().eq('prueba_id', pruebaIdActual).eq('usuario_id', uid);
      if (!error) usuario.asignado = false;
    }
  });
  alert(`${checkboxes.length} usuarios deshabilitados`);
}

// ============================================
// 5. CRUD PRUEBAS
// ============================================

async function cargarPruebasAdmin() {
  const lista = document.getElementById('listaPruebasAdmin');
  lista.innerHTML = '<p style="text-align:center; color:#888;">Cargando...</p>';
  
  const { data: pruebas, error } = await supabaseClient.from('pruebas').select('*').order('fecha_creacion', { ascending: false });
  
  if (error || !pruebas) {
    lista.innerHTML = '<p style="text-align:center; color:#c33;">Error al cargar pruebas</p>';
    return;
  }
  
  lista.innerHTML = '';
  pruebas.forEach(prueba => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <div>
          <h3 style="color:#4a0404; margin:0;">${prueba.titulo}</h3>
          <p style="color:#666; font-size:14px; margin:5px 0;">${prueba.descripcion || 'Sin descripción'}</p>
        </div>
        <span style="padding:4px 12px; background:${prueba.activa ? '#28a745' : '#dc3545'}; color:white; border-radius:12px; font-size:12px;">
          ${prueba.activa ? 'Activa' : 'Inactiva'}
        </span>
      </div>
      <div style="font-size:13px; color:#888; margin-bottom:15px;">
        <p><strong>Inicio:</strong> ${new Date(prueba.fecha_inicio).toLocaleString()}</p>
        <p><strong>Fin:</strong> ${new Date(prueba.fecha_fin).toLocaleString()}</p>
        <p><strong>Tiempo:</strong> ${prueba.tiempo_limite > 0 ? prueba.tiempo_limite + ' min' : 'Sin límite'}</p>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px;">
        <button class="btn btn-info btn-gestionar" data-id="${prueba.id}">📝 Preguntas</button>
        <button class="btn btn-success btn-asignar" data-id="${prueba.id}">👥 Asignar</button>
        <button class="btn btn-primary btn-resultados" data-id="${prueba.id}">📊 Resultados</button>
        <button class="btn btn-warning btn-editar-prueba" data-id="${prueba.id}">✏️ Editar</button>
        <button class="btn btn-danger btn-eliminar-prueba" data-id="${prueba.id}" data-titulo="${prueba.titulo}">🗑️ Eliminar</button>
      </div>
    `;
    lista.appendChild(card);
    
    card.querySelector('.btn-gestionar').addEventListener('click', () => gestionarPreguntas(prueba.id));
    card.querySelector('.btn-asignar').addEventListener('click', () => asignarUsuarios(prueba.id));
    card.querySelector('.btn-resultados').addEventListener('click', () => verResultados(prueba.id));
    card.querySelector('.btn-editar-prueba').addEventListener('click', () => abrirModalPrueba(prueba.id));
    card.querySelector('.btn-eliminar-prueba').addEventListener('click', () => eliminarPrueba(prueba.id, prueba.titulo));
  });
}

function abrirModalPrueba(pruebaId = null) {
  const modal = document.getElementById('modalPrueba');
  const tituloModal = document.getElementById('modalPruebaTitulo');
  
  if (pruebaId) {
    supabaseClient.from('pruebas').select('*').eq('id', pruebaId).single().then(({ data }) => {
      if (!data) return;
      tituloModal.textContent = 'Editar Prueba';
      document.getElementById('pruebaTitulo').value = data.titulo;
      document.getElementById('pruebaDescripcion').value = data.descripcion || '';
      document.getElementById('pruebaInicio').value = new Date(data.fecha_inicio).toISOString().slice(0, 16);
      document.getElementById('pruebaFin').value = new Date(data.fecha_fin).toISOString().slice(0, 16);
      document.getElementById('pruebaTiempo').value = data.tiempo_limite || 0;
      document.getElementById('pruebaActiva').checked = data.activa;
      modal.dataset.editId = pruebaId;
      modal.style.display = 'flex';
    });
  } else {
    tituloModal.textContent = 'Crear Nueva Prueba';
    document.getElementById('pruebaTitulo').value = '';
    document.getElementById('pruebaDescripcion').value = '';
    document.getElementById('pruebaInicio').value = '';
    document.getElementById('pruebaFin').value = '';
    document.getElementById('pruebaTiempo').value = 0;
    document.getElementById('pruebaActiva').checked = true;
    delete modal.dataset.editId;
    modal.style.display = 'flex';
  }
}

async function guardarPrueba() {
  const titulo = document.getElementById('pruebaTitulo').value.trim();
  const descripcion = document.getElementById('pruebaDescripcion').value.trim();
  const fechaInicio = document.getElementById('pruebaInicio').value;
  const fechaFin = document.getElementById('pruebaFin').value;
  const tiempoLimite = parseInt(document.getElementById('pruebaTiempo').value);
  const activa = document.getElementById('pruebaActiva').checked;
  
  if (!titulo || !fechaInicio || !fechaFin) {
    alert('Por favor completa todos los campos obligatorios');
    return;
  }
  
  if (new Date(fechaInicio) >= new Date(fechaFin)) {
    alert('La fecha de inicio debe ser anterior a la fecha de fin');
    return;
  }
  
  const modal = document.getElementById('modalPrueba');
  const editId = modal.dataset.editId;
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  
  let error;
  if (editId) {
    ({ error } = await supabaseClient.from('pruebas').update({
      titulo, descripcion,
      fecha_inicio: new Date(fechaInicio).toISOString(),
      fecha_fin: new Date(fechaFin).toISOString(),
      tiempo_limite: tiempoLimite, activa
    }).eq('id', editId));
  } else {
    ({ error } = await supabaseClient.from('pruebas').insert({
      titulo, descripcion,
      fecha_inicio: new Date(fechaInicio).toISOString(),
      fecha_fin: new Date(fechaFin).toISOString(),
      tiempo_limite: tiempoLimite, activa,
      creada_por: usuario.id
    }));
  }
  
  if (error) {
    alert('Error: ' + error.message);
  } else {
    // 🆕 REGISTRAR LOG DE CREAR/EDITAR PRUEBA
    if (typeof registrarLog === 'function') {
      await registrarLog({
        accion: editId ? 'Editar prueba' : 'Crear prueba',
        modulo: 'Pruebas',
        descripcion: `${editId ? 'Prueba modificada' : 'Prueba creada'}: ${titulo}`,
        detalles: { 
          titulo: titulo,
          descripcion: descripcion,
          tiempo_limite: tiempoLimite,
          activa: activa,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        }
      });
    }
    
    modal.style.display = 'none';
    alert(editId ? 'Prueba actualizada' : 'Prueba creada correctamente');
    cargarPruebasAdmin();
  }
}

async function eliminarPrueba(id, titulo) {
  if (!confirm(`¿Eliminar "${titulo}"? Esta acción no se puede deshacer.`)) return;
  
  await supabaseClient.from('intentos_pruebas').delete().eq('prueba_id', id);
  await supabaseClient.from('pruebas_usuarios').delete().eq('prueba_id', id);
  await supabaseClient.from('preguntas').delete().eq('prueba_id', id);
  const { error } = await supabaseClient.from('pruebas').delete().eq('id', id);
  
  if (error) {
    alert('Error: ' + error.message);
  } else {
    // 🆕 REGISTRAR LOG DE ELIMINAR PRUEBA
    if (typeof registrarLog === 'function') {
      await registrarLog({
        accion: 'Eliminar prueba',
        modulo: 'Pruebas',
        descripcion: `Prueba eliminada: ${titulo}`,
        detalles: { 
          id: id,
          titulo: titulo
        }
      });
    }
    
    alert('Prueba eliminada correctamente');
    cargarPruebasAdmin();
  }
}

// ============================================
// 6. GESTIÓN DE PREGUNTAS
// ============================================

async function gestionarPreguntas(pruebaId) {
  paginaPreguntasActual = 1;
  pruebaIdActual = pruebaId;
  const { data: prueba } = await supabaseClient.from('pruebas').select('*').eq('id', pruebaId).single();
  document.getElementById('tituloGestionPreguntas').textContent = `Gestionar Preguntas - ${prueba.titulo}`;
  document.getElementById('modalGestionPreguntas').style.display = 'flex';
  cargarPreguntas(pruebaId);
}

async function cargarPreguntas(pruebaId) {
  const { data: preguntas } = await supabaseClient.from('preguntas').select('*').eq('prueba_id', pruebaId).order('orden');
  const lista = document.getElementById('listaPreguntas');
  const total = preguntas.length;
  const totalPaginas = Math.ceil(total / preguntasPorPagina);
  const inicio = (paginaPreguntasActual - 1) * preguntasPorPagina;
  const fin = Math.min(inicio + preguntasPorPagina, total);
  const pagina = preguntas.slice(inicio, fin);
  
  document.getElementById('contadorPreguntas').textContent = `Total: ${total} | Mostrando ${total > 0 ? inicio + 1 : 0}-${fin} de ${total}`;
  lista.innerHTML = '';
  
  pagina.forEach((p, i) => {
    const numeroReal = inicio + i + 1;
    const card = document.createElement('div');
    card.style.cssText = 'background:#f9f9f9; border:1px solid #e0e0e0; border-radius:6px; padding:15px; margin-bottom:10px;';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <p style="font-weight:600; margin:0 0 5px;">Pregunta ${numeroReal}:</p>
          <p style="margin:0;">${p.pregunta}</p>
          <p style="font-size:12px; color:#888; margin:5px 0 0;">Tipo: ${p.tipo} | Puntos: ${p.puntos}${p.evaluacion_manual ? ' | ⚠️ Manual' : ''}</p>
        </div>
        <div style="display:flex; gap:5px;">
          <button class="btn-editar-pregunta btn btn-info" style="padding:5px 10px; font-size:12px;">✏️</button>
          <button class="btn-eliminar-pregunta btn btn-danger" style="padding:5px 10px; font-size:12px;">🗑️</button>
        </div>
      </div>
    `;
    lista.appendChild(card);
    
    card.querySelector('.btn-editar-pregunta').addEventListener('click', () => abrirModalPregunta(p.id, pruebaId));
    card.querySelector('.btn-eliminar-pregunta').addEventListener('click', async () => {
      if (confirm('¿Eliminar esta pregunta?')) {
        await supabaseClient.from('preguntas').delete().eq('id', p.id);
        
        // 🆕 REGISTRAR LOG DE ELIMINAR PREGUNTA
        if (typeof registrarLog === 'function') {
          const { data: pruebaData } = await supabaseClient.from('pruebas').select('titulo').eq('id', pruebaId).single();
          await registrarLog({
            accion: 'Eliminar pregunta',
            modulo: 'Pruebas',
            descripcion: `Pregunta eliminada de: ${pruebaData?.titulo || 'Prueba ID ' + pruebaId}`,
            detalles: { 
              pregunta_id: p.id,
              prueba_id: pruebaId,
              pregunta_texto: p.pregunta.substring(0, 100)
            }
          });
        }
        
        cargarPreguntas(pruebaId);
      }
    });
  });
  
  renderizarPaginacion(totalPaginas, pruebaId);
  document.getElementById('btnAgregarPregunta').onclick = () => abrirModalPregunta(null, pruebaId);
}

function renderizarPaginacion(totalPaginas, pruebaId) {
  const div = document.getElementById('paginacionPreguntas');
  div.innerHTML = '';
  if (totalPaginas <= 1) return;
  
  const crearBoton = (texto, disabled, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = texto;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  };
  
  div.appendChild(crearBoton('←', paginaPreguntasActual === 1, () => { paginaPreguntasActual--; cargarPreguntas(pruebaId); }));
  
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === paginaPreguntasActual) {
      const span = document.createElement('span');
      span.textContent = i;
      span.style.cssText = 'padding:8px 12px; background:#6b0f0f; color:white; border-radius:4px; font-weight:600;';
      div.appendChild(span);
    } else {
      div.appendChild(crearBoton(i, false, () => { paginaPreguntasActual = i; cargarPreguntas(pruebaId); }));
    }
  }
  
  div.appendChild(crearBoton('→', paginaPreguntasActual === totalPaginas, () => { paginaPreguntasActual++; cargarPreguntas(pruebaId); }));
}

function abrirModalPregunta(preguntaId, pruebaId) {
  const modal = document.getElementById('modalPregunta');
  const titulo = document.getElementById('tituloPregunta');
  
  document.getElementById('opcionesList').innerHTML = '';
  
  if (preguntaId) {
    supabaseClient.from('preguntas').select('*').eq('id', preguntaId).single().then(({ data }) => {
      if (!data) return;
      titulo.textContent = 'Editar Pregunta';
      document.getElementById('preguntaTexto').value = data.pregunta;
      document.getElementById('preguntaTipo').value = data.tipo;
      document.getElementById('preguntaTipo').dispatchEvent(new Event('change'));
      document.getElementById('preguntaPuntos').value = data.puntos;
      
      if (data.tipo === 'verdadero_falso') {
        document.getElementById('respuestaCorrectaVF').value = data.respuesta_correcta || 'verdadero';
      } else if (data.tipo === 'texto_libre') {
        document.getElementById('respuestasValidas').value = (data.respuestas_validas || []).join('\n');
        document.getElementById('palabrasClave').value = (data.palabras_clave || []).join(', ');
        document.getElementById('evaluacionManual').checked = data.evaluacion_manual || false;
      } else if (data.tipo === 'opcion_multiple') {
        (data.opciones || []).forEach((op) => {
          agregarOpcionWithData(op.texto, op.correcta);
        });
      }
      
      modal.dataset.editId = preguntaId;
      modal.dataset.pruebaId = pruebaId;
      modal.style.display = 'flex';
    });
  } else {
    titulo.textContent = 'Agregar Pregunta';
    document.getElementById('preguntaTexto').value = '';
    document.getElementById('preguntaTipo').value = 'verdadero_falso';
    document.getElementById('preguntaTipo').dispatchEvent(new Event('change'));
    document.getElementById('preguntaPuntos').value = 1;
    document.getElementById('respuestasValidas').value = '';
    document.getElementById('palabrasClave').value = '';
    document.getElementById('evaluacionManual').checked = false;
    delete modal.dataset.editId;
    modal.dataset.pruebaId = pruebaId;
    modal.style.display = 'flex';
  }
}

function agregarOpcion() {
  agregarOpcionWithData('', false);
}

function agregarOpcionWithData(texto, correcta) {
  const lista = document.getElementById('opcionesList');
  const index = lista.children.length;
  
  const div = document.createElement('div');
  div.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; align-items:center;';
  div.innerHTML = `
    <input type="radio" name="opcionCorrecta" value="${index}" ${correcta ? 'checked' : ''} style="width:20px; height:20px;">
    <input type="text" value="${texto}" placeholder="Opción ${index + 1}" class="form-control" style="flex:1;">
    <button class="btn-eliminar-opcion btn btn-danger" style="padding:5px 10px; font-size:12px;">🗑️</button>
  `;
  lista.appendChild(div);
  
  div.querySelector('.btn-eliminar-opcion').addEventListener('click', () => div.remove());
}

async function guardarPregunta() {
  const preguntaTexto = document.getElementById('preguntaTexto').value.trim();
  const tipo = document.getElementById('preguntaTipo').value;
  const puntos = parseInt(document.getElementById('preguntaPuntos').value);
  const modal = document.getElementById('modalPregunta');
  const editId = modal.dataset.editId;
  const pruebaId = modal.dataset.pruebaId;
  
  if (!preguntaTexto) {
    alert('Por favor escribe la pregunta');
    return;
  }
  
  let respuestaCorrecta = null;
  let opcionesJSON = null;
  let respuestasValidas = null;
  let palabrasClave = null;
  let evaluacionManual = false;
  
  if (tipo === 'verdadero_falso') {
    respuestaCorrecta = document.getElementById('respuestaCorrectaVF').value;
  } else if (tipo === 'texto_libre') {
    const respuestasValidasTexto = document.getElementById('respuestasValidas').value.trim();
    const palabrasClaveTexto = document.getElementById('palabrasClave').value.trim();
    evaluacionManual = document.getElementById('evaluacionManual').checked;
    
    if (!evaluacionManual && !respuestasValidasTexto && !palabrasClaveTexto) {
      alert('Debes proporcionar respuestas válidas, palabras clave, o marcar evaluación manual');
      return;
    }
    
    if (respuestasValidasTexto) {
      respuestasValidas = respuestasValidasTexto.split('\n').map(r => r.trim()).filter(r => r);
    }
    if (palabrasClaveTexto) {
      palabrasClave = palabrasClaveTexto.split(',').map(p => p.trim().toLowerCase()).filter(p => p);
    }
  } else if (tipo === 'opcion_multiple') {
    const opcionesDivs = document.querySelectorAll('#opcionesList > div');
    if (opcionesDivs.length < 2) {
      alert('Debe haber al menos 2 opciones');
      return;
    }
    
    opcionesJSON = [];
    let tieneCorrecta = false;
    let errorTexto = false;
    
    opcionesDivs.forEach((div) => {
      const radio = div.querySelector('input[type="radio"]');
      const texto = div.querySelector('input[type="text"]').value.trim();
      
      if (!texto) {
        errorTexto = true;
        return;
      }
      
      const esCorrecta = radio.checked;
      if (esCorrecta) tieneCorrecta = true;
      
      opcionesJSON.push({ texto, correcta: esCorrecta });
    });
    
    if (errorTexto) {
      alert('Todas las opciones deben tener texto');
      return;
    }
    
    if (!tieneCorrecta) {
      alert('Debe seleccionar una opción correcta');
      return;
    }
  }
  
  const datosPregunta = {
    pregunta: preguntaTexto,
    tipo: tipo,
    opciones: opcionesJSON,
    respuesta_correcta: respuestaCorrecta,
    respuestas_validas: respuestasValidas,
    palabras_clave: palabrasClave,
    evaluacion_manual: evaluacionManual,
    puntos: puntos
  };
  
  let error;
  if (editId) {
    ({ error } = await supabaseClient.from('preguntas').update(datosPregunta).eq('id', editId));
  } else {
    const { data: preguntas } = await supabaseClient.from('preguntas').select('orden').eq('prueba_id', pruebaId);
    datosPregunta.prueba_id = pruebaId;
    datosPregunta.orden = preguntas.length;
    ({ error } = await supabaseClient.from('preguntas').insert(datosPregunta));
  }
  
  if (error) {
    alert('Error: ' + error.message);
  } else {
    // 🆕 REGISTRAR LOG DE CREAR/EDITAR PREGUNTA
    if (typeof registrarLog === 'function') {
      const { data: pruebaData } = await supabaseClient.from('pruebas').select('titulo').eq('id', pruebaId).single();
      await registrarLog({
        accion: editId ? 'Editar pregunta' : 'Crear pregunta',
        modulo: 'Pruebas',
        descripcion: `${editId ? 'Pregunta modificada' : 'Pregunta creada'} en prueba: ${pruebaData?.titulo || 'ID ' + pruebaId}`,
        detalles: { 
          prueba_id: pruebaId,
          tipo: tipo,
          puntos: puntos,
          pregunta: preguntaTexto.substring(0, 100)
        }
      });
    }
    
    modal.style.display = 'none';
    cargarPreguntas(pruebaId);
  }
}

// ============================================
// 7. ASIGNAR USUARIOS
// ============================================

async function asignarUsuarios(pruebaId) {
  pruebaIdActual = pruebaId;
  const { data: usuarios } = await supabaseClient.from('usuarios').select('*').order('primer_nombre');
  const { data: asignaciones } = await supabaseClient.from('pruebas_usuarios').select('*').eq('prueba_id', pruebaId);
  
  todosLosUsuarios = usuarios.map(u => ({
    ...u,
    asignado: asignaciones.some(a => a.usuario_id === u.id)
  }));
  
  document.getElementById('modalAsignarUsuarios').style.display = 'flex';
  document.getElementById('buscarUsuario').value = '';
  filtrarUsuarios('');
}

// ============================================
// 8. RESULTADOS
// ============================================

async function verResultados(pruebaId) {
  pruebaIdActual = pruebaId;
  const { data: prueba } = await supabaseClient.from('pruebas').select('*').eq('id', pruebaId).single();
  document.getElementById('tituloResultados').textContent = `Resultados - ${prueba.titulo}`;
  document.getElementById('modalResultados').style.display = 'flex';
  document.getElementById('buscarResultado').value = '';
  
  const { data: intentos } = await supabaseClient
    .from('intentos_pruebas')
    .select('*, usuarios:usuario_id(id, primer_nombre, primer_apellido, cedula)')
    .eq('prueba_id', pruebaId)
    .eq('estado', 'completado')
    .order('fecha_fin', { ascending: false });
  
  todosLosIntentos = intentos || [];
  filtrarResultados('');
}

// ============================================
// 9. VER DETALLE CON IMPRESIÓN
// ============================================

async function verDetalleIntento(intentoId, pruebaId) {
  const { data: intento } = await supabaseClient
    .from('intentos_pruebas')
    .select('*, usuarios:usuario_id(id, primer_nombre, primer_apellido, cedula, jerarquia)')
    .eq('id', intentoId)
    .single();
  
  const { data: prueba } = await supabaseClient.from('pruebas').select('*').eq('id', pruebaId).single();
  const { data: preguntas } = await supabaseClient.from('preguntas').select('*').eq('prueba_id', pruebaId).order('orden');
  
  const usuario = intento.usuarios;
  const respuestas = intento.respuestas || {};
  const porcentaje = intento.total_preguntas > 0 ? ((intento.respuestas_correctas / intento.total_preguntas) * 100).toFixed(1) : 0;
  const estado = intento.puntuacion >= 60 ? 'APROBADO' : 'REPROBADO';
  const color = intento.puntuacion >= 60 ? '#28a745' : '#dc3545';
  const fechaCompletado = intento.fecha_fin ? new Date(intento.fecha_fin).toLocaleString() : '';
  
  let preguntasHTML = '';
  preguntas.forEach((pregunta, index) => {
    const respuestaUsuario = respuestas[pregunta.id];
    let respuestaUsuarioTexto = 'Sin responder';
    let esCorrecta = false;
    
    if (respuestaUsuario !== undefined && respuestaUsuario !== null && respuestaUsuario !== '') {
      if (pregunta.tipo === 'verdadero_falso') {
        respuestaUsuarioTexto = respuestaUsuario === 'verdadero' ? 'Verdadero' : 'Falso';
        esCorrecta = respuestaUsuario === pregunta.respuesta_correcta;
      } else if (pregunta.tipo === 'opcion_multiple') {
        const idx = parseInt(respuestaUsuario);
        if (pregunta.opciones && pregunta.opciones[idx]) {
          respuestaUsuarioTexto = pregunta.opciones[idx].texto;
          esCorrecta = pregunta.opciones[idx].correcta;
        }
      } else if (pregunta.tipo === 'texto_libre') {
        respuestaUsuarioTexto = respuestaUsuario;
        const evaluacion = evaluarTextoLibre(respuestaUsuario, pregunta);
        esCorrecta = evaluacion.correcta;
        if (evaluacion.manual) respuestaUsuarioTexto += ' (Requiere evaluación manual)';
      }
    }
    
    const colorRespuesta = respuestaUsuarioTexto === 'Sin responder' ? '#888' : (esCorrecta ? '#28a745' : '#dc3545');
    const icono = respuestaUsuarioTexto === 'Sin responder' ? '⚪' : (esCorrecta ? '✅' : '❌');
    
    let respuestaCorrectaTexto = 'N/A';
    if (pregunta.tipo === 'verdadero_falso') {
      respuestaCorrectaTexto = pregunta.respuesta_correcta === 'verdadero' ? 'Verdadero' : 'Falso';
    } else if (pregunta.tipo === 'opcion_multiple') {
      const opCorrecta = pregunta.opciones?.find(o => o.correcta);
      respuestaCorrectaTexto = opCorrecta ? opCorrecta.texto : 'N/A';
    } else if (pregunta.tipo === 'texto_libre') {
      if (pregunta.respuestas_validas && pregunta.respuestas_validas.length > 0) {
        respuestaCorrectaTexto = pregunta.respuestas_validas.join(' / ');
      } else if (pregunta.palabras_clave && pregunta.palabras_clave.length > 0) {
        respuestaCorrectaTexto = 'Debe contener: ' + pregunta.palabras_clave.join(', ');
      } else if (pregunta.evaluacion_manual) {
        respuestaCorrectaTexto = 'Evaluación manual requerida';
      }
    }
    
    preguntasHTML += `
      <div style="border:1px solid #e0e0e0; border-radius:6px; padding:15px; margin-bottom:10px; background:#fafafa; page-break-inside:avoid;">
        <p style="margin:0 0 10px; font-weight:600; color:#4a0404;">Pregunta ${index + 1} (${pregunta.puntos} puntos):</p>
        <p style="margin:0 0 10px; line-height:1.5;">${pregunta.pregunta}</p>
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px; background:white; border-radius:4px; border-left:4px solid ${colorRespuesta};">
          <div>
            <p style="margin:0; font-size:13px; color:#666;"><strong>Respuesta del usuario:</strong></p>
            <p style="margin:5px 0 0; color:${colorRespuesta}; font-weight:600;">${icono} ${respuestaUsuarioTexto}</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0; font-size:13px; color:#666;"><strong>Respuesta correcta:</strong></p>
            <p style="margin:5px 0 0; color:#28a745; font-weight:600;">${respuestaCorrectaTexto}</p>
          </div>
        </div>
      </div>
    `;
  });
  
  const printArea = document.getElementById('printArea');
  printArea.innerHTML = `
    <div style="text-align:center; border-bottom:3px solid #6b0f0f; padding-bottom:15px; margin-bottom:20px;">
      <img src="../img/logo1.png" alt="Logo" style="max-width:100px; height:auto; margin-bottom:10px;">
      <h1 style="color:#4a0404; margin:0; font-size:22px;">Programa de Supervisión Intensiva</h1>
      <p style="margin:5px 0; color:#666; font-size:14px;">ICAP - Cuerpo de Policía Nacional Bolivariana</p>
    </div>
    
    <div style="text-align:center; margin-bottom:25px; padding:15px; background:#f9f9f9; border-radius:8px;">
      <h2 style="color:#4a0404; margin:0 0 10px;">RESULTADO DE PRUEBA</h2>
      <p style="margin:0; font-size:18px; font-weight:600;">${prueba.titulo}</p>
    </div>
    
    <div style="background:#f9f9f9; border-radius:8px; padding:15px; margin-bottom:20px;">
      <h3 style="color:#4a0404; margin:0 0 10px; font-size:16px;">Información del Evaluado</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <p style="margin:0;"><strong>Nombre:</strong> ${usuario.primer_nombre} ${usuario.primer_apellido}</p>
        <p style="margin:0;"><strong>Cédula:</strong> ${usuario.cedula}</p>
        <p style="margin:0;"><strong>Jerarquía:</strong> ${usuario.jerarquia || 'N/A'}</p>
        <p style="margin:0;"><strong>Fecha:</strong> ${fechaCompletado}</p>
      </div>
    </div>
    
    <div style="text-align:center; padding:25px; border:3px solid ${color}; border-radius:8px; margin-bottom:25px; background:${color}10;">
      <p style="margin:0 0 10px; font-size:18px; color:#666;">Calificación Final</p>
      <p style="margin:0 0 10px; font-size:56px; font-weight:700; color:${color};">${porcentaje}%</p>
      <p style="margin:0; font-size:28px; font-weight:700; color:${color};">${estado}</p>
      <p style="margin:10px 0 0; font-size:14px; color:#666;">Respuestas correctas: ${intento.respuestas_correctas} de ${intento.total_preguntas}</p>
    </div>
    
    <h3 style="color:#4a0404; margin:0 0 15px; border-bottom:2px solid #6b0f0f; padding-bottom:10px;">Detalle de Respuestas</h3>
    ${preguntasHTML}
    
    <div style="margin-top:40px; padding-top:20px; border-top:2px solid #6b0f0f; text-align:center; font-size:12px; color:#888;">
      <p style="margin:0;">Documento generado el ${new Date().toLocaleString()}</p>
      <p style="margin:5px 0 0;">© Desarrollado por OTIC ZULIA</p>
    </div>
  `;
  
  document.getElementById('modalDetalle').style.display = 'flex';
}

// ============================================
// 10. CARGAR PRUEBAS (USUARIO)
// ============================================

async function cargarPruebasUsuario() {
  const lista = document.getElementById('listaPruebasUsuario');
  lista.innerHTML = '<p style="text-align:center; color:#888;">Cargando pruebas...</p>';
  
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const ahora = new Date();
  
  const { data: pruebas } = await supabaseClient
    .from('pruebas')
    .select('*')
    .eq('activa', true)
    .lte('fecha_inicio', ahora.toISOString())
    .gte('fecha_fin', ahora.toISOString())
    .order('fecha_inicio', { ascending: false });
  
  if (!pruebas || pruebas.length === 0) {
    lista.innerHTML = '<p style="text-align:center; color:#888;">No hay pruebas disponibles</p>';
    return;
  }
  
  let pruebasFiltradas = pruebas;
  if (usuario.nivel_acceso !== 'administrador') {
    const { data: asignaciones } = await supabaseClient
      .from('pruebas_usuarios')
      .select('prueba_id')
      .eq('usuario_id', usuario.id)
      .eq('habilitado', true);
    
    const pruebasAsignadas = asignaciones.map(a => a.prueba_id);
    pruebasFiltradas = pruebas.filter(p => pruebasAsignadas.includes(p.id));
  }
  
  if (pruebasFiltradas.length === 0) {
    lista.innerHTML = '<p style="text-align:center; color:#888;">No tienes pruebas asignadas</p>';
    return;
  }
  
  lista.innerHTML = '';
  
  for (const p of pruebasFiltradas) {
    const { data: intentoCompletado } = await supabaseClient
      .from('intentos_pruebas')
      .select('*')
      .eq('prueba_id', p.id)
      .eq('usuario_id', usuario.id)
      .eq('estado', 'completado')
      .maybeSingle();
    
    const card = document.createElement('div');
    card.className = 'card';
    
    if (intentoCompletado) {
      const pct = intentoCompletado.total_preguntas > 0 ? ((intentoCompletado.respuestas_correctas / intentoCompletado.total_preguntas) * 100).toFixed(1) : 0;
      const estadoTxt = intentoCompletado.puntuacion >= 60 ? 'Aprobado' : 'Reprobado';
      const color = intentoCompletado.puntuacion >= 60 ? '#28a745' : '#dc3545';
      const icono = intentoCompletado.puntuacion >= 60 ? '✅' : '❌';
      
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
          <span style="font-size:48px;">${icono}</span>
          <div>
            <h3 style="color:#4a0404; margin:0 0 5px; font-size:20px;">${p.titulo}</h3>
            <p style="color:#666; margin:0; font-size:14px;">${p.descripcion || 'Sin descripción'}</p>
          </div>
        </div>
        <div style="background:${color}15; border:2px solid ${color}; border-radius:8px; padding:20px; text-align:center;">
          <p style="margin:0 0 10px; font-size:14px; color:#666; font-weight:600;">PRUEBA COMPLETADA</p>
          <p style="margin:0 0 5px; font-size:48px; font-weight:700; color:${color};">${pct}%</p>
          <p style="margin:0 0 10px; font-size:20px; font-weight:600; color:${color};">${estadoTxt}</p>
          <p style="margin:0; font-size:13px; color:#888;">Respuestas correctas: ${intentoCompletado.respuestas_correctas} de ${intentoCompletado.total_preguntas}</p>
          <p style="margin:10px 0 0; font-size:12px; color:#999;">Si necesitas realizar esta prueba nuevamente, contacta al administrador.</p>
        </div>
      `;
    } else {
      card.innerHTML = `
        <h3 style="color:#4a0404; margin:0 0 10px;">${p.titulo}</h3>
        <p style="color:#666; margin-bottom:15px;">${p.descripcion || 'Sin descripción'}</p>
        <div style="font-size:13px; color:#888; margin-bottom:15px; padding:10px; background:#f9f9f9; border-radius:6px;">
          <p style="margin:0;"><strong>Disponible hasta:</strong> ${new Date(p.fecha_fin).toLocaleString()}</p>
          ${p.tiempo_limite > 0 ? `<p style="margin:5px 0 0;"><strong>Tiempo límite:</strong> ${p.tiempo_limite} minutos</p>` : ''}
        </div>
        <button class="btn btn-primary btn-iniciar" style="width:100%; padding:15px; font-size:16px;">📝 Iniciar Prueba</button>
      `;
      card.querySelector('.btn-iniciar').addEventListener('click', () => iniciarPrueba(p.id));
    }
    
    lista.appendChild(card);
  }
}

// ============================================
// 11. INICIAR Y REALIZAR PRUEBA
// ============================================

async function iniciarPrueba(pruebaId) {
  if (!confirm('¿Iniciar esta prueba? Una vez iniciada, no podrás pausarla.')) return;
  
  const { data: prueba } = await supabaseClient.from('pruebas').select('*').eq('id', pruebaId).single();
  const { data: preguntas } = await supabaseClient.from('preguntas').select('*').eq('prueba_id', pruebaId).order('orden');
  
  if (!preguntas || preguntas.length === 0) {
    alert('Esta prueba no tiene preguntas');
    return;
  }
  
  pruebaActual = prueba;
  preguntasActuales = preguntas;
  respuestasUsuario = {};
  
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const { data: intento } = await supabaseClient.from('intentos_pruebas')
    .insert({ prueba_id: pruebaId, usuario_id: usuario.id, estado: 'en_progreso', total_preguntas: preguntas.length })
    .select().single();
  
  // 🆕 REGISTRAR LOG DE INICIAR PRUEBA
  if (typeof registrarLog === 'function') {
    await registrarLog({
      accion: 'Iniciar prueba',
      modulo: 'Pruebas',
      descripcion: `Usuario ${usuario.nombre} ${usuario.apellido} inició prueba: ${prueba.titulo}`,
      detalles: { 
        prueba_id: pruebaId,
        prueba_titulo: prueba.titulo,
        usuario_id: usuario.id,
        usuario_cedula: usuario.cedula,
        total_preguntas: preguntas.length,
        tiempo_limite: prueba.tiempo_limite
      }
    });
  }
  
  document.getElementById('tituloPruebaUsuario').textContent = prueba.titulo;
  document.getElementById('modalPruebaUsuario').style.display = 'flex';
  
  const container = document.getElementById('preguntasContainer');
  container.innerHTML = '';
  
  preguntas.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <p style="font-weight:600; margin-bottom:10px; font-size:16px;">Pregunta ${i + 1} (${p.puntos} puntos):</p>
      <p style="margin:0 0 10px; font-size:15px; line-height:1.6;">${p.pregunta}</p>
    `;
    
    let opcionesHTML = '';
    
    if (p.tipo === 'verdadero_falso') {
      opcionesHTML = `
        <div style="margin-top:10px;">
          <label style="display:block; margin-bottom:10px; cursor:pointer;">
            <input type="radio" name="q_${p.id}" value="verdadero" style="width:20px; height:20px; margin-right:10px;">
            <span style="font-size:16px;">Verdadero</span>
          </label>
          <label style="display:block; cursor:pointer;">
            <input type="radio" name="q_${p.id}" value="falso" style="width:20px; height:20px; margin-right:10px;">
            <span style="font-size:16px;">Falso</span>
          </label>
        </div>
      `;
    } else if (p.tipo === 'opcion_multiple') {
      opcionesHTML = '<div style="margin-top:10px;">';
      (p.opciones || []).forEach((op, idx) => {
        opcionesHTML += `
          <label style="display:block; margin-bottom:10px; cursor:pointer;">
            <input type="radio" name="q_${p.id}" value="${idx}" style="width:20px; height:20px; margin-right:10px;">
            <span style="font-size:16px;">${op.texto}</span>
          </label>
        `;
      });
      opcionesHTML += '</div>';
    } else if (p.tipo === 'texto_libre') {
      opcionesHTML = `<textarea name="q_${p.id}" class="form-control" rows="3" style="margin-top:10px;" placeholder="Escribe tu respuesta aquí..."></textarea>`;
    }
    
    div.innerHTML += opcionesHTML;
    container.appendChild(div);
    
    div.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener('change', (e) => {
        respuestasUsuario[p.id] = e.target.value;
      });
    });
    
    const textarea = div.querySelector('textarea');
    if (textarea) {
      textarea.addEventListener('input', (e) => {
        respuestasUsuario[p.id] = e.target.value;
      });
    }
  });
  
  if (prueba.tiempo_limite > 0) {
    tiempoRestante = prueba.tiempo_limite * 60;
    actualizarTimer();
    intervaloTiempo = setInterval(() => {
      tiempoRestante--;
      actualizarTimer();
      if (tiempoRestante <= 0) {
        clearInterval(intervaloTiempo);
        enviarPrueba();
      }
    }, 1000);
  }
  
  function actualizarTimer() {
    const min = Math.floor(tiempoRestante / 60);
    const sec = tiempoRestante % 60;
    document.getElementById('timer').textContent = `${min}:${sec.toString().padStart(2, '0')}`;
  }
}

async function enviarPrueba() {
  if (!confirm('¿Enviar la prueba? No podrás cambiar tus respuestas.')) return;
  
  if (intervaloTiempo) clearInterval(intervaloTiempo);
  
  let correctas = 0;
  let totalPuntos = 0;
  let puntosObtenidos = 0;
  
  preguntasActuales.forEach(p => {
    totalPuntos += p.puntos;
    const resp = document.querySelector(`input[name="q_${p.id}"]:checked`)?.value || 
                 document.querySelector(`textarea[name="q_${p.id}"]`)?.value;
    respuestasUsuario[p.id] = resp;
    
    let esCorrecta = false;
    
    if (p.tipo === 'verdadero_falso') {
      esCorrecta = resp === p.respuesta_correcta;
    } else if (p.tipo === 'opcion_multiple') {
      const idx = parseInt(resp);
      esCorrecta = p.opciones && p.opciones[idx] && p.opciones[idx].correcta;
    } else if (p.tipo === 'texto_libre') {
      const ev = evaluarTextoLibre(resp, p);
      esCorrecta = ev.correcta;
    }
    
    if (esCorrecta) {
      correctas++;
      puntosObtenidos += p.puntos;
    }
  });
  
  const pct = totalPuntos > 0 ? (puntosObtenidos / totalPuntos) * 100 : 0;
  
  // 🆕 DECLARAR resultado ANTES de usarlo
  const resultado = pct >= 60 ? 'APROBADO' : 'REPROBADO';
  
  await supabaseClient.from('intentos_pruebas')
    .update({
      fecha_fin: new Date().toISOString(),
      puntuacion: pct,
      respuestas_correctas: correctas,
      estado: 'completado',
      respuestas: respuestasUsuario
    })
    .eq('prueba_id', pruebaActual.id);
  
  // 🆕 REGISTRAR LOG DE COMPLETAR PRUEBA
  if (typeof registrarLog === 'function') {
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    await registrarLog({
      accion: 'Completar prueba',
      modulo: 'Pruebas',
      descripcion: `Usuario ${usuario.nombre} ${usuario.apellido} completó prueba: ${pruebaActual.titulo} - ${resultado}`,
      detalles: { 
        prueba_id: pruebaActual.id,
        prueba_titulo: pruebaActual.titulo,
        usuario_id: usuario.id,
        usuario_cedula: usuario.cedula,
        puntuacion: pct,
        respuestas_correctas: correctas,
        total_preguntas: preguntasActuales.length,
        resultado: resultado
      }
    });
  }
  
  document.getElementById('modalPruebaUsuario').style.display = 'none';
  
  const icono = pct >= 60 ? '🎉' : '😔';
  
  alert(`${icono} ${resultado}\n\nPuntuación: ${pct.toFixed(1)}%\nRespuestas correctas: ${correctas} de ${preguntasActuales.length}`);
  
  cargarPruebasUsuario();
}
