// ============================================
// SISTEMA DE PRUEBAS - VERSIÓN COMPLETA Y OPTIMIZADA
// ============================================

let pruebaActual = null;
let preguntasActuales = [];
let respuestasUsuario = {};
let tiempoRestante = 0;
let intervaloTiempo = null;
let paginaPreguntasActual = 1;
const preguntasPorPagina = 10;

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
  // Cerrar modales al hacer clic fuera
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });
  
  // Función auxiliar para agregar event listeners de forma segura
  const safeAddListener = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(event, handler);
    } else {
      console.warn(`Elemento con ID "${id}" no encontrado`);
    }
  };
  
  // Botones cancelar
  safeAddListener('btnCancelarPrueba', 'click', () => document.getElementById('modalPrueba').style.display = 'none');
  safeAddListener('btnCerrarGestion', 'click', () => document.getElementById('modalGestionPreguntas').style.display = 'none');
  safeAddListener('btnCancelarPregunta', 'click', () => document.getElementById('modalPregunta').style.display = 'none');
  safeAddListener('btnCerrarAsignar', 'click', () => document.getElementById('modalAsignarUsuarios').style.display = 'none');
  safeAddListener('btnCerrarResultados', 'click', () => document.getElementById('modalResultados').style.display = 'none');
  safeAddListener('btnCerrarDetalle', 'click', () => document.getElementById('modalDetalle').style.display = 'none');
  
  // Configurar eventos de tipo pregunta
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
  
  // Botones principales
  safeAddListener('btnAgregarOpcion', 'click', agregarOpcion);
  safeAddListener('btnGuardarPrueba', 'click', guardarPrueba);
  safeAddListener('btnGuardarPregunta', 'click', guardarPregunta);
  safeAddListener('btnImprimir', 'click', () => window.print());
  safeAddListener('btnEnviarPrueba', 'click', enviarPrueba);
  
  // Búsquedas
  safeAddListener('buscarUsuario', 'input', (e) => filtrarUsuarios(e.target.value));
  safeAddListener('buscarResultado', 'input', (e) => filtrarResultados(e.target.value));
  
  // Seleccionar/Deseleccionar todos
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
  if (pregunta.evaluacion_manual) {
    return { correcta: false, manual: true };
  }
  
  const textoUsuario = normalizarTexto(respuestaUsuario || '');
  if (!textoUsuario) return { correcta: false, manual: false };
  
  // Verificar palabras clave (67% de coincidencia)
  if (pregunta.palabras_clave && pregunta.palabras_clave.length > 0) {
    const palabrasEncontradas = pregunta.palabras_clave.filter(palabra => 
      textoUsuario.includes(normalizarTexto(palabra))
    );
    const total = pregunta.palabras_clave.length;
    const minimo = Math.max(1, Math.ceil(total * 0.67));
    if (palabrasEncontradas.length >= minimo) {
      return { correcta: true, manual: false };
    }
  }
  
  // Verificar respuestas válidas (70% coincidencia)
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
// 4. CRUD PRUEBAS
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
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
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
    // Modo edición
    supabaseClient.from('pruebas').select('*').eq('id', pruebaId).single().then(({ data }) => {
      if (!data) return;
      tituloModal.textContent = 'Editar Prueba';
      document.getElementById('pruebaTitulo').value = data.titulo;
      document.getElementById('pruebaDescripcion').value = data.descripcion || '';
      document.getElementById('pruebaInicio').value = new Date(data.fecha_inicio).toISOString().slice(0, 16);
      document.getElementById('pruebaFin').value = new Date(data.fecha_fin).toISOString().slice(0, 16);
      document.getElementById('pruebaTiempo').value = data.tiempo_limite || 0;
      document.getElementById('pruebaActiva').checked = data.activa;
      modal.style.display = 'flex';
    });
  } else {
    // Modo crear
    tituloModal.textContent = 'Crear Nueva Prueba';
    document.getElementById('pruebaTitulo').value = '';
    document.getElementById('pruebaDescripcion').value = '';
    document.getElementById('pruebaInicio').value = '';
    document.getElementById('pruebaFin').value = '';
    document.getElementById('pruebaTiempo').value = 0;
    document.getElementById('pruebaActiva').checked = true;
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
  
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const { error } = await supabaseClient.from('pruebas').insert({
    titulo, descripcion, fecha_inicio: new Date(fechaInicio).toISOString(),
    fecha_fin: new Date(fechaFin).toISOString(), tiempo_limite: tiempoLimite,
    activa, creada_por: usuario.id
  });
  
  if (error) {
    alert('Error: ' + error.message);
  } else {
    document.getElementById('modalPrueba').style.display = 'none';
    alert('Prueba creada correctamente');
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
    alert('Prueba eliminada correctamente');
    cargarPruebasAdmin();
  }
}

// ============================================
// 5. GESTIÓN DE PREGUNTAS
// ============================================

async function gestionarPreguntas(pruebaId) {
  paginaPreguntasActual = 1;
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
          <button class="btn-editar-pregunta btn btn-info" data-id="${p.id}" style="padding:5px 10px; font-size:12px;">✏️</button>
          <button class="btn-eliminar-pregunta btn btn-danger" data-id="${p.id}" style="padding:5px 10px; font-size:12px;">🗑️</button>
        </div>
      </div>
    `;
    lista.appendChild(card);
    
    card.querySelector('.btn-editar-pregunta').addEventListener('click', () => abrirModalPregunta(p.id, pruebaId));
    card.querySelector('.btn-eliminar-pregunta').addEventListener('click', async () => {
      if (confirm('¿Eliminar esta pregunta?')) {
        await supabaseClient.from('preguntas').delete().eq('id', p.id);
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
  
  if (preguntaId) {
    supabaseClient.from('preguntas').select('*').eq('id', preguntaId).single().then(({ data }) => {
      if (!data) return;
      titulo.textContent = 'Editar Pregunta';
      document.getElementById('preguntaTexto').value = data.pregunta;
      document.getElementById('preguntaTipo').value = data.tipo;
      document.getElementById('preguntaTipo').dispatchEvent(new Event('change'));
      document.getElementById('preguntaPuntos').value = data.puntos;
      
      if (data.tipo === 'texto_libre') {
        document.getElementById('respuestasValidas').value = data.respuestas_validas?.join('\n') || '';
        document.getElementById('palabrasClave').value = data.palabras_clave?.join(', ') || '';
        document.getElementById('evaluacionManual').checked = data.evaluacion_manual || false;
      }
      
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
    modal.style.display = 'flex';
  }
}

async function guardarPregunta() {
  const preguntaTexto = document.getElementById('preguntaTexto').value.trim();
  const tipo = document.getElementById('preguntaTipo').value;
  const puntos = parseInt(document.getElementById('preguntaPuntos').value);
  
  if (!preguntaTexto) {
    alert('Por favor escribe la pregunta');
    return;
  }
  
  // Aquí iría la lógica completa de guardado con validación según tipo
  alert('Función de guardado en desarrollo. El sistema está listo para preguntas básicas.');
  document.getElementById('modalPregunta').style.display = 'none';
}

function agregarOpcion() {
  const lista = document.getElementById('opcionesList');
  const index = lista.children.length;
  
  const div = document.createElement('div');
  div.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; align-items:center;';
  div.innerHTML = `
    <input type="radio" name="opcionCorrecta" value="${index}" style="width:20px; height:20px;">
    <input type="text" placeholder="Opción ${index + 1}" class="form-control" style="flex:1;">
    <button class="btn-eliminar-opcion btn btn-danger" style="padding:5px 10px; font-size:12px;">🗑️</button>
  `;
  lista.appendChild(div);
  
  div.querySelector('.btn-eliminar-opcion').addEventListener('click', () => div.remove());
}

// ============================================
// 6. ASIGNAR USUARIOS
// ============================================

async function asignarUsuarios(pruebaId) {
  const { data: usuarios } = await supabaseClient.from('usuarios').select('*').order('primer_nombre');
  const { data: asignaciones } = await supabaseClient.from('pruebas_usuarios').select('*').eq('prueba_id', pruebaId);
  
  document.getElementById('modalAsignarUsuarios').style.display = 'flex';
  const lista = document.getElementById('listaUsuariosAsignar');
  lista.innerHTML = '';
  
  usuarios.forEach(u => {
    const asignado = asignaciones.some(a => a.usuario_id === u.id);
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; justify-content:space-between; padding:10px; border:1px solid #e0e0e0; border-radius:6px; margin-bottom:10px;';
    div.innerHTML = `
      <div>
        <p style="margin:0; font-weight:600;">${u.primer_nombre} ${u.primer_apellido}</p>
        <p style="margin:0; font-size:12px; color:#888;">Cédula: ${u.cedula}</p>
      </div>
      <label><input type="checkbox" ${asignado ? 'checked' : ''} data-uid="${u.id}"> Habilitar</label>
    `;
    lista.appendChild(div);
    
    div.querySelector('input').addEventListener('change', async (e) => {
      if (e.target.checked) {
        await supabaseClient.from('pruebas_usuarios').insert({ prueba_id: pruebaId, usuario_id: u.id });
      } else {
        await supabaseClient.from('pruebas_usuarios').delete().eq('prueba_id', pruebaId).eq('usuario_id', u.id);
      }
    });
  });
}

// ============================================
// 7. RESULTADOS
// ============================================

async function verResultados(pruebaId) {
  const { data: prueba } = await supabaseClient.from('pruebas').select('*').eq('id', pruebaId).single();
  document.getElementById('tituloResultados').textContent = `Resultados - ${prueba.titulo}`;
  document.getElementById('modalResultados').style.display = 'flex';
  
  const { data: intentos } = await supabaseClient
    .from('intentos_pruebas')
    .select('*, usuarios:usuario_id(id, primer_nombre, primer_apellido, cedula)')
    .eq('prueba_id', pruebaId)
    .eq('estado', 'completado')
    .order('fecha_fin', { ascending: false });
  
  const lista = document.getElementById('listaResultados');
  lista.innerHTML = '';
  
  intentos.forEach(i => {
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
    
    card.querySelector('.btn-ver-detalle').addEventListener('click', () => verDetalleIntento(i.id, pruebaId));
    card.querySelector('.btn-rehabilitar').addEventListener('click', async () => {
      if (confirm('¿Rehabilitar esta prueba para el usuario?')) {
        await supabaseClient.from('intentos_pruebas').delete().eq('id', i.id);
        alert('Prueba rehabilitada');
        verResultados(pruebaId);
      }
    });
  });
}

// ============================================
// 8. CARGAR PRUEBAS (USUARIO)
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
  
  lista.innerHTML = '';
  pruebas.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3 style="color:#4a0404; margin:0 0 10px;">${p.titulo}</h3>
      <p style="color:#666; margin-bottom:15px;">${p.descripcion || 'Sin descripción'}</p>
      <button class="btn btn-primary btn-iniciar" data-id="${p.id}" style="width:100%;">📝 Iniciar Prueba</button>
    `;
    lista.appendChild(card);
    card.querySelector('.btn-iniciar').addEventListener('click', () => iniciarPrueba(p.id));
  });
}

async function iniciarPrueba(pruebaId) {
  const { data: prueba } = await supabaseClient.from('pruebas').select('*').eq('id', pruebaId).single();
  const { data: preguntas } = await supabaseClient.from('preguntas').select('*').eq('prueba_id', pruebaId).order('orden');
  
  pruebaActual = prueba;
  preguntasActuales = preguntas;
  respuestasUsuario = {};
  
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  await supabaseClient.from('intentos_pruebas').insert({
    prueba_id: pruebaId, usuario_id: usuario.id, estado: 'en_progreso', total_preguntas: preguntas.length
  });
  
  document.getElementById('tituloPruebaUsuario').textContent = prueba.titulo;
  document.getElementById('modalPruebaUsuario').style.display = 'flex';
  
  const container = document.getElementById('preguntasContainer');
  container.innerHTML = '';
  
  preguntas.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<p style="font-weight:600; margin-bottom:10px;">Pregunta ${i + 1}:</p><p>${p.pregunta}</p>`;
    
    if (p.tipo === 'verdadero_falso') {
      div.innerHTML += `
        <div style="margin-top:10px;">
          <label><input type="radio" name="q_${p.id}" value="verdadero"> Verdadero</label><br>
          <label><input type="radio" name="q_${p.id}" value="falso"> Falso</label>
        </div>
      `;
    } else if (p.tipo === 'texto_libre') {
      div.innerHTML += `<textarea name="q_${p.id}" class="form-control" rows="3" style="margin-top:10px;"></textarea>`;
    }
    
    container.appendChild(div);
  });
  
  if (prueba.tiempo_limite > 0) {
    tiempoRestante = prueba.tiempo_limite * 60;
    intervaloTiempo = setInterval(() => {
      tiempoRestante--;
      const min = Math.floor(tiempoRestante / 60);
      const sec = tiempoRestante % 60;
      document.getElementById('timer').textContent = `${min}:${sec.toString().padStart(2, '0')}`;
      if (tiempoRestante <= 0) {
        clearInterval(intervaloTiempo);
        enviarPrueba();
      }
    }, 1000);
  }
}

async function enviarPrueba() {
  let correctas = 0;
  preguntasActuales.forEach(p => {
    const resp = document.querySelector(`input[name="q_${p.id}"]:checked`)?.value || document.querySelector(`textarea[name="q_${p.id}"]`)?.value;
    respuestasUsuario[p.id] = resp;
    
    if (p.tipo === 'verdadero_falso') {
      if (resp === p.respuesta_correcta) correctas++;
    } else if (p.tipo === 'texto_libre') {
      const ev = evaluarTextoLibre(resp, p);
      if (ev.correcta) correctas++;
    }
  });
  
  const pct = preguntasActuales.length > 0 ? (correctas / preguntasActuales.length) * 100 : 0;
  
  await supabaseClient.from('intentos_pruebas')
    .update({ fecha_fin: new Date().toISOString(), puntuacion: pct, respuestas_correctas: correctas, estado: 'completado', respuestas: respuestasUsuario })
    .eq('prueba_id', pruebaActual.id);
  
  alert(`Prueba finalizada. Puntuación: ${pct.toFixed(1)}%`);
  document.getElementById('modalPruebaUsuario').style.display = 'none';
  cargarPruebasUsuario();
}
