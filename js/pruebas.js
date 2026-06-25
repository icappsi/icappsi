// ============================================
// SISTEMA DE PRUEBAS - VERSIÓN COMPLETA
// ============================================

let pruebaActual = null;
let preguntasActuales = [];
let respuestasUsuario = {};
let tiempoRestante = 0;
let intervaloTiempo = null;

// Variables de paginación para preguntas
let paginaPreguntasActual = 1;
const preguntasPorPagina = 10;

// ============================================
// 1. INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  
  if (usuario && usuario.nivel_acceso === 'administrador') {
    document.getElementById('adminPruebasSection').style.display = 'block';
    cargarPruebasAdmin();
    document.getElementById('btnNuevaPrueba').addEventListener('click', crearNuevaPrueba);
  }
  
  cargarPruebasUsuario();
});

// ============================================
// 2. CREAR NUEVA PRUEBA (ADMIN)
// ============================================

async function crearNuevaPrueba() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h2 style="color: #4a0404; margin-bottom: 20px;">Crear Nueva Prueba</h2>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Título:</label>
        <input type="text" id="nuevaPruebaTitulo" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Descripción:</label>
        <textarea id="nuevaPruebaDescripcion" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"></textarea>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha y Hora de Inicio:</label>
          <input type="datetime-local" id="nuevaPruebaInicio" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha y Hora de Fin:</label>
          <input type="datetime-local" id="nuevaPruebaFin" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tiempo Límite (minutos, 0 = sin límite):</label>
        <input type="number" id="nuevaPruebaTiempo" value="0" min="0" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
      </div>
      
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button id="btnGuardarPrueba" style="flex: 1; padding: 12px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Crear Prueba
        </button>
        <button id="btnCancelarPrueba" style="flex: 1; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('btnCancelarPrueba').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  document.getElementById('btnGuardarPrueba').addEventListener('click', async () => {
    const titulo = document.getElementById('nuevaPruebaTitulo').value.trim();
    const descripcion = document.getElementById('nuevaPruebaDescripcion').value.trim();
    const fechaInicio = document.getElementById('nuevaPruebaInicio').value;
    const fechaFin = document.getElementById('nuevaPruebaFin').value;
    const tiempoLimite = parseInt(document.getElementById('nuevaPruebaTiempo').value);
    
    if (!titulo || !fechaInicio || !fechaFin) {
      await showAlert('Campos Requeridos', 'Por favor completa todos los campos obligatorios', 'warning');
      return;
    }
    
    if (new Date(fechaInicio) >= new Date(fechaFin)) {
      await showAlert('Error de Fecha', 'La fecha de inicio debe ser anterior a la fecha de fin', 'error');
      return;
    }
    
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    
    try {
      const { error } = await supabaseClient
        .from('pruebas')
        .insert({
          titulo,
          descripcion,
          fecha_inicio: new Date(fechaInicio).toISOString(),
          fecha_fin: new Date(fechaFin).toISOString(),
          tiempo_limite: tiempoLimite,
          creada_por: usuario.id
        });
      
      if (error) throw error;
      
      document.body.removeChild(modal);
      await showAlert('¡Éxito!', 'Prueba creada correctamente. Ahora puedes agregar preguntas.', 'success');
      cargarPruebasAdmin();
      
    } catch (error) {
      console.error('Error:', error);
      await showAlert('Error', 'Error al crear la prueba: ' + error.message, 'error');
    }
  });
}

// ============================================
// 3. EDITAR PRUEBA (ADMIN)
// ============================================

async function editarPrueba(pruebaId) {
  const { data: prueba, error } = await supabaseClient
    .from('pruebas')
    .select('*')
    .eq('id', pruebaId)
    .single();
  
  if (error) {
    await showAlert('Error', 'Error al cargar la prueba', 'error');
    return;
  }
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
  
  const fechaInicioLocal = new Date(prueba.fecha_inicio).toISOString().slice(0, 16);
  const fechaFinLocal = new Date(prueba.fecha_fin).toISOString().slice(0, 16);
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h2 style="color: #4a0404; margin-bottom: 20px;">Editar Prueba</h2>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Título:</label>
        <input type="text" id="editPruebaTitulo" value="${prueba.titulo}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Descripción:</label>
        <textarea id="editPruebaDescripcion" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">${prueba.descripcion || ''}</textarea>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha y Hora de Inicio:</label>
          <input type="datetime-local" id="editPruebaInicio" value="${fechaInicioLocal}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha y Hora de Fin:</label>
          <input type="datetime-local" id="editPruebaFin" value="${fechaFinLocal}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tiempo Límite (minutos, 0 = sin límite):</label>
        <input type="number" id="editPruebaTiempo" value="${prueba.tiempo_limite || 0}" min="0" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" id="editPruebaActiva" ${prueba.activa ? 'checked' : ''} style="width: 20px; height: 20px;">
          <span style="font-weight: 600;">Prueba Activa</span>
        </label>
      </div>
      
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button id="btnGuardarEditPrueba" style="flex: 1; padding: 12px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Guardar Cambios
        </button>
        <button id="btnCancelarEditPrueba" style="flex: 1; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('btnCancelarEditPrueba').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  document.getElementById('btnGuardarEditPrueba').addEventListener('click', async () => {
    const titulo = document.getElementById('editPruebaTitulo').value.trim();
    const descripcion = document.getElementById('editPruebaDescripcion').value.trim();
    const fechaInicio = document.getElementById('editPruebaInicio').value;
    const fechaFin = document.getElementById('editPruebaFin').value;
    const tiempoLimite = parseInt(document.getElementById('editPruebaTiempo').value);
    const activa = document.getElementById('editPruebaActiva').checked;
    
    if (!titulo || !fechaInicio || !fechaFin) {
      await showAlert('Campos Requeridos', 'Por favor completa todos los campos obligatorios', 'warning');
      return;
    }
    
    if (new Date(fechaInicio) >= new Date(fechaFin)) {
      await showAlert('Error de Fecha', 'La fecha de inicio debe ser anterior a la fecha de fin', 'error');
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('pruebas')
        .update({
          titulo,
          descripcion,
          fecha_inicio: new Date(fechaInicio).toISOString(),
          fecha_fin: new Date(fechaFin).toISOString(),
          tiempo_limite: tiempoLimite,
          activa
        })
        .eq('id', pruebaId);
      
      if (error) throw error;
      
      document.body.removeChild(modal);
      await showAlert('¡Actualizado!', 'La prueba se ha actualizado correctamente', 'success');
      cargarPruebasAdmin();
      
    } catch (error) {
      console.error('Error:', error);
      await showAlert('Error', 'Error al actualizar la prueba: ' + error.message, 'error');
    }
  });
}

// ============================================
// 4. ELIMINAR PRUEBA (ADMIN)
// ============================================

async function eliminarPrueba(pruebaId, titulo) {
  const confirmado = await showConfirm(
    'Eliminar Prueba',
    `¿Estás seguro de eliminar la prueba "<strong>${titulo}</strong>"?<br><br>Esta acción eliminará también todas las preguntas, asignaciones e intentos. No se puede deshacer.`
  );
  
  if (!confirmado) return;
  
  try {
    await supabaseClient.from('intentos_pruebas').delete().eq('prueba_id', pruebaId);
    await supabaseClient.from('pruebas_usuarios').delete().eq('prueba_id', pruebaId);
    await supabaseClient.from('preguntas').delete().eq('prueba_id', pruebaId);
    
    const { error } = await supabaseClient.from('pruebas').delete().eq('id', pruebaId);
    
    if (error) throw error;
    
    await showAlert('¡Eliminado!', 'La prueba se ha eliminado correctamente', 'success');
    cargarPruebasAdmin();
    
  } catch (error) {
    console.error('Error:', error);
    await showAlert('Error', 'Error al eliminar la prueba: ' + error.message, 'error');
  }
}

// ============================================
// 5. CARGAR PRUEBAS (ADMIN)
// ============================================

async function cargarPruebasAdmin() {
  const listaDiv = document.getElementById('listaPruebasAdmin');
  listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Cargando pruebas...</p>';
  
  try {
    const { data: pruebas, error } = await supabaseClient
      .from('pruebas')
      .select('*')
      .order('fecha_creacion', { ascending: false });
    
    if (error) throw error;
    
    if (!pruebas || pruebas.length === 0) {
      listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No hay pruebas creadas aún.</p>';
      return;
    }
    
    listaDiv.innerHTML = '';
    
    pruebas.forEach(prueba => {
      const card = document.createElement('div');
      card.style.cssText = 'background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);';
      
      const fechaInicio = new Date(prueba.fecha_inicio).toLocaleString();
      const fechaFin = new Date(prueba.fecha_fin).toLocaleString();
      
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
          <div style="flex: 1; min-width: 200px;">
            <h3 style="color: #4a0404; margin: 0; font-size: 18px;">${prueba.titulo}</h3>
            <p style="color: #666; font-size: 14px; margin: 5px 0;">${prueba.descripcion || 'Sin descripción'}</p>
          </div>
          <span style="padding: 4px 12px; background: ${prueba.activa ? '#28a745' : '#dc3545'}; color: white; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${prueba.activa ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        <div style="font-size: 13px; color: #888; margin-bottom: 15px;">
          <p><strong>Inicio:</strong> ${fechaInicio}</p>
          <p><strong>Fin:</strong> ${fechaFin}</p>
          <p><strong>Tiempo límite:</strong> ${prueba.tiempo_limite > 0 ? prueba.tiempo_limite + ' minutos' : 'Sin límite'}</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
          <button class="btn-gestionar-preguntas" data-id="${prueba.id}" style="padding: 8px 15px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            📝 Preguntas
          </button>
          <button class="btn-asignar-usuarios" data-id="${prueba.id}" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            👥 Asignar
          </button>
          <button class="btn-ver-resultados" data-id="${prueba.id}" style="padding: 8px 15px; background: #6b0f0f; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            📊 Resultados
          </button>
          <button class="btn-editar-prueba" data-id="${prueba.id}" style="padding: 8px 15px; background: #ffc107; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            ✏️ Editar
          </button>
          <button class="btn-eliminar-prueba" data-id="${prueba.id}" data-titulo="${prueba.titulo}" style="padding: 8px 15px; background: #cc0000; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            🗑️ Eliminar
          </button>
        </div>
      `;
      
      listaDiv.appendChild(card);
      
      card.querySelector('.btn-gestionar-preguntas').addEventListener('click', () => gestionarPreguntas(prueba.id));
      card.querySelector('.btn-asignar-usuarios').addEventListener('click', () => asignarUsuarios(prueba.id));
      card.querySelector('.btn-ver-resultados').addEventListener('click', () => verResultados(prueba.id));
      card.querySelector('.btn-editar-prueba').addEventListener('click', () => editarPrueba(prueba.id));
      card.querySelector('.btn-eliminar-prueba').addEventListener('click', () => eliminarPrueba(prueba.id, prueba.titulo));
    });
    
  } catch (error) {
    console.error('Error:', error);
    listaDiv.innerHTML = '<p style="text-align: center; color: #c33; padding: 40px;">Error al cargar las pruebas.</p>';
  }
}

// ============================================
// 6. FUNCIONES AUXILIARES PARA TEXTO LIBRE
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
  
  if (!textoUsuario) {
    return { correcta: false, manual: false };
  }
  
  // Verificar palabras clave
  if (pregunta.palabras_clave && pregunta.palabras_clave.length > 0) {
    const todasLasPalabras = pregunta.palabras_clave.every(palabra => 
      textoUsuario.includes(normalizarTexto(palabra))
    );
    
    if (todasLasPalabras) {
      return { correcta: true, manual: false };
    }
  }
  
  // Verificar respuestas válidas
  if (pregunta.respuestas_validas && pregunta.respuestas_validas.length > 0) {
    const coincide = pregunta.respuestas_validas.some(respuestaValida => {
      const respuestaNormalizada = normalizarTexto(respuestaValida);
      return textoUsuario === respuestaNormalizada || 
             textoUsuario.includes(respuestaNormalizada) ||
             respuestaNormalizada.includes(textoUsuario);
    });
    
    if (coincide) {
      return { correcta: true, manual: false };
    }
  }
  
  return { correcta: false, manual: false };
}

// ============================================
// 7. GESTIONAR PREGUNTAS CON PAGINACIÓN (ADMIN)
// ============================================

async function gestionarPreguntas(pruebaId) {
  paginaPreguntasActual = 1;
  
  const { data: prueba } = await supabaseClient
    .from('pruebas')
    .select('*')
    .eq('id', pruebaId)
    .single();
  
  const { data: preguntas } = await supabaseClient
    .from('preguntas')
    .select('*')
    .eq('prueba_id', pruebaId)
    .order('orden');
  
  const modal = document.createElement('div');
  modal.id = 'modalGestionPreguntas';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h2 style="color: #4a0404; margin-bottom: 20px;">Gestionar Preguntas - ${prueba.titulo}</h2>
      
      <button id="btnAgregarPregunta" style="width: 100%; padding: 12px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-bottom: 20px;">
        + Agregar Pregunta
      </button>
      
      <div id="contadorPreguntas" style="text-align: center; color: #666; margin-bottom: 15px; font-size: 14px;"></div>
      
      <div id="listaPreguntas"></div>
      
      <div id="paginacionPreguntas" style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;"></div>
      
      <button id="btnCerrarGestion" style="width: 100%; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 20px;">
        Cerrar
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  function renderizarPreguntas() {
    const listaDiv = document.getElementById('listaPreguntas');
    const totalPreguntas = preguntas.length;
    const totalPaginas = Math.ceil(totalPreguntas / preguntasPorPagina);
    const inicio = (paginaPreguntasActual - 1) * preguntasPorPagina;
    const fin = Math.min(inicio + preguntasPorPagina, totalPreguntas);
    const preguntasPagina = preguntas.slice(inicio, fin);
    
    document.getElementById('contadorPreguntas').textContent = 
      `Total de preguntas: ${totalPreguntas} | Mostrando ${totalPreguntas > 0 ? inicio + 1 : 0}-${fin} de ${totalPreguntas}`;
    
    if (totalPreguntas === 0) {
      listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No hay preguntas aún.</p>';
      document.getElementById('paginacionPreguntas').innerHTML = '';
      return;
    }
    
    listaDiv.innerHTML = '';
    
    preguntasPagina.forEach((pregunta, index) => {
      const numeroReal = inicio + index + 1;
      const card = document.createElement('div');
      card.style.cssText = 'background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin-bottom: 10px;';
      
      let tipoTexto = 'Texto Libre';
      if (pregunta.tipo === 'verdadero_falso') tipoTexto = 'Verdadero/Falso';
      else if (pregunta.tipo === 'opcion_multiple') tipoTexto = 'Opción Múltiple';
      
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <p style="font-weight: 600; margin: 0 0 5px 0;">Pregunta ${numeroReal}:</p>
            <p style="margin: 0 0 5px 0;">${pregunta.pregunta}</p>
            <p style="font-size: 12px; color: #888; margin: 0;">Tipo: ${tipoTexto} | Puntos: ${pregunta.puntos}${pregunta.evaluacion_manual ? ' | ⚠️ Evaluación Manual' : ''}</p>
          </div>
          <div style="display: flex; gap: 5px;">
            <button class="btn-editar-pregunta" data-id="${pregunta.id}" style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              ✏️
            </button>
            <button class="btn-eliminar-pregunta" data-id="${pregunta.id}" style="padding: 6px 12px; background: #cc0000; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              🗑️
            </button>
          </div>
        </div>
      `;
      
      listaDiv.appendChild(card);
      
      card.querySelector('.btn-editar-pregunta').addEventListener('click', () => editarPregunta(pregunta.id, pruebaId, preguntas, renderizarPreguntas));
      
      card.querySelector('.btn-eliminar-pregunta').addEventListener('click', async () => {
        const confirmado = await showConfirm('Eliminar Pregunta', '¿Estás seguro de eliminar esta pregunta?');
        if (!confirmado) return;
        
        await supabaseClient.from('preguntas').delete().eq('id', pregunta.id);
        const idx = preguntas.findIndex(p => p.id === pregunta.id);
        if (idx !== -1) preguntas.splice(idx, 1);
        
        if (paginaPreguntasActual > 1 && preguntas.length <= (paginaPreguntasActual - 1) * preguntasPorPagina) {
          paginaPreguntasActual--;
        }
        
        renderizarPreguntas();
      });
    });
    
    const paginacionDiv = document.getElementById('paginacionPreguntas');
    if (totalPaginas > 1) {
      let html = `
        <button id="btnPagPregAnterior" ${paginaPreguntasActual === 1 ? 'disabled' : ''} style="padding: 8px 15px; background: ${paginaPreguntasActual === 1 ? '#ccc' : '#6b0f0f'}; color: white; border: none; border-radius: 4px; cursor: ${paginaPreguntasActual === 1 ? 'not-allowed' : 'pointer'}; font-weight: 600;">
          ← Anterior
        </button>
      `;
      
      let inicioPag = Math.max(1, paginaPreguntasActual - 2);
      let finPag = Math.min(totalPaginas, inicioPag + 4);
      if (finPag - inicioPag < 4) inicioPag = Math.max(1, finPag - 4);
      
      for (let i = inicioPag; i <= finPag; i++) {
        html += `
          <button class="btn-num-preg" data-pagina="${i}" style="width: 35px; height: 35px; background: ${i === paginaPreguntasActual ? '#6b0f0f' : 'white'}; color: ${i === paginaPreguntasActual ? 'white' : '#4a0404'}; border: 2px solid #6b0f0f; border-radius: 4px; cursor: pointer; font-weight: 600;">
            ${i}
          </button>
        `;
      }
      
      html += `
        <button id="btnPagPregSiguiente" ${paginaPreguntasActual === totalPaginas ? 'disabled' : ''} style="padding: 8px 15px; background: ${paginaPreguntasActual === totalPaginas ? '#ccc' : '#6b0f0f'}; color: white; border: none; border-radius: 4px; cursor: ${paginaPreguntasActual === totalPaginas ? 'not-allowed' : 'pointer'}; font-weight: 600;">
          Siguiente →
        </button>
      `;
      
      paginacionDiv.innerHTML = html;
      
      document.getElementById('btnPagPregAnterior').addEventListener('click', () => {
        if (paginaPreguntasActual > 1) {
          paginaPreguntasActual--;
          renderizarPreguntas();
        }
      });
      
      document.getElementById('btnPagPregSiguiente').addEventListener('click', () => {
        if (paginaPreguntasActual < totalPaginas) {
          paginaPreguntasActual++;
          renderizarPreguntas();
        }
      });
      
      document.querySelectorAll('.btn-num-preg').forEach(btn => {
        btn.addEventListener('click', () => {
          paginaPreguntasActual = parseInt(btn.dataset.pagina);
          renderizarPreguntas();
        });
      });
    } else {
      paginacionDiv.innerHTML = '';
    }
  }
  
  renderizarPreguntas();
  
  document.getElementById('btnAgregarPregunta').addEventListener('click', async () => {
    await agregarPregunta(pruebaId, preguntas, () => {
      const totalPaginas = Math.ceil(preguntas.length / preguntasPorPagina);
      if (paginaPreguntasActual < totalPaginas) paginaPreguntasActual = totalPaginas;
      renderizarPreguntas();
    });
  });
  
  document.getElementById('btnCerrarGestion').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// ============================================
// 8. EDITAR PREGUNTA (ADMIN)
// ============================================

async function editarPregunta(preguntaId, pruebaId, preguntas, callback) {
  const pregunta = preguntas.find(p => p.id === preguntaId);
  if (!pregunta) return;
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1001; padding: 20px;';
  
  const respuestasValidasTexto = pregunta.respuestas_validas ? pregunta.respuestas_validas.join('\n') : '';
  const palabrasClaveTexto = pregunta.palabras_clave ? pregunta.palabras_clave.join(', ') : '';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h3 style="color: #4a0404; margin-bottom: 20px;">Editar Pregunta</h3>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Pregunta:</label>
        <textarea id="editPreguntaTexto" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">${pregunta.pregunta}</textarea>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo:</label>
        <select id="editPreguntaTipo" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          <option value="verdadero_falso" ${pregunta.tipo === 'verdadero_falso' ? 'selected' : ''}>Verdadero / Falso</option>
          <option value="opcion_multiple" ${pregunta.tipo === 'opcion_multiple' ? 'selected' : ''}>Opción Múltiple</option>
          <option value="texto_libre" ${pregunta.tipo === 'texto_libre' ? 'selected' : ''}>Texto Libre</option>
        </select>
      </div>
      
      <div id="editOpcionesContainer" style="margin-bottom: 15px; display: none;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Opciones:</label>
        <div id="editOpcionesList"></div>
        <button id="editBtnAgregarOpcion" style="margin-top: 10px; padding: 8px 15px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer;">
          + Agregar Opción
        </button>
      </div>
      
      <div id="editRespuestaCorrectaContainer" style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Respuesta Correcta:</label>
        <select id="editRespuestaCorrectaVF" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          <option value="verdadero" ${pregunta.respuesta_correcta === 'verdadero' ? 'selected' : ''}>Verdadero</option>
          <option value="falso" ${pregunta.respuesta_correcta === 'falso' ? 'selected' : ''}>Falso</option>
        </select>
      </div>
      
      <div id="editTextoLibreConfig" style="margin-bottom: 15px; display: none; border: 2px solid #6b0f0f; border-radius: 6px; padding: 15px; background: #fafafa;">
        <h4 style="color: #4a0404; margin: 0 0 10px 0;">Configuración de Evaluación para Texto Libre</h4>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Respuestas Válidas (una por línea):</label>
          <textarea id="editRespuestasValidas" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: monospace;">${respuestasValidasTexto}</textarea>
          <p style="font-size: 11px; color: #888; margin-top: 5px;">Escribe diferentes formas válidas de responder.</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Palabras Clave Obligatorias (separadas por coma):</label>
          <input type="text" id="editPalabrasClave" value="${palabrasClaveTexto}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          <p style="font-size: 11px; color: #888; margin-top: 5px;">La respuesta debe contener TODAS estas palabras.</p>
        </div>
        
        <div>
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="editEvaluacionManual" ${pregunta.evaluacion_manual ? 'checked' : ''} style="width: 20px; height: 20px;">
            <span style="font-weight: 600;">Requiere evaluación manual</span>
          </label>
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Puntos:</label>
        <input type="number" id="editPreguntaPuntos" value="${pregunta.puntos}" min="1" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button id="btnGuardarEditPregunta" style="flex: 1; padding: 12px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Guardar
        </button>
        <button id="btnCancelarEditPregunta" style="flex: 1; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  let opciones = pregunta.opciones || [];
  
  function actualizarVista() {
    const tipo = document.getElementById('editPreguntaTipo').value;
    const opcionesContainer = document.getElementById('editOpcionesContainer');
    const respuestaVF = document.getElementById('editRespuestaCorrectaVF');
    const textoLibreConfig = document.getElementById('editTextoLibreConfig');
    
    if (tipo === 'opcion_multiple') {
      opcionesContainer.style.display = 'block';
      respuestaVF.style.display = 'none';
      textoLibreConfig.style.display = 'none';
      renderizarOpciones();
    } else if (tipo === 'verdadero_falso') {
      opcionesContainer.style.display = 'none';
      respuestaVF.style.display = 'block';
      textoLibreConfig.style.display = 'none';
    } else {
      opcionesContainer.style.display = 'none';
      respuestaVF.style.display = 'none';
      textoLibreConfig.style.display = 'block';
    }
  }
  
  function renderizarOpciones() {
    const listaDiv = document.getElementById('editOpcionesList');
    listaDiv.innerHTML = '';
    
    opciones.forEach((opcion, index) => {
      const div = document.createElement('div');
      div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
      div.innerHTML = `
        <input type="radio" name="editOpcionCorrecta" value="${index}" ${opcion.correcta ? 'checked' : ''} style="width: 20px; height: 20px;">
        <input type="text" value="${opcion.texto}" placeholder="Opción ${index + 1}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <button class="btn-eliminar-opcion" data-index="${index}" style="padding: 6px 12px; background: #cc0000; color: white; border: none; border-radius: 4px; cursor: pointer;">🗑️</button>
      `;
      listaDiv.appendChild(div);
      
      div.querySelector('input[type="radio"]').addEventListener('change', (e) => {
        opciones.forEach((op, i) => op.correcta = i === parseInt(e.target.value));
      });
      
      div.querySelector('input[type="text"]').addEventListener('input', (e) => {
        opciones[index].texto = e.target.value;
      });
      
      div.querySelector('.btn-eliminar-opcion').addEventListener('click', () => {
        opciones.splice(index, 1);
        if (opciones.length > 0 && !opciones.some(op => op.correcta)) {
          opciones[0].correcta = true;
        }
        renderizarOpciones();
      });
    });
  }
  
  document.getElementById('editPreguntaTipo').addEventListener('change', actualizarVista);
  
  document.getElementById('editBtnAgregarOpcion').addEventListener('click', () => {
    opciones.push({ texto: '', correcta: opciones.length === 0 });
    renderizarOpciones();
  });
  
  actualizarVista();
  
  document.getElementById('btnCancelarEditPregunta').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  document.getElementById('btnGuardarEditPregunta').addEventListener('click', async () => {
    const preguntaTexto = document.getElementById('editPreguntaTexto').value.trim();
    const tipo = document.getElementById('editPreguntaTipo').value;
    const puntos = parseInt(document.getElementById('editPreguntaPuntos').value);
    
    if (!preguntaTexto) {
      await showAlert('Campo Requerido', 'Por favor escribe la pregunta', 'warning');
      return;
    }
    
    let respuestaCorrecta = null;
    let opcionesJSON = null;
    let respuestasValidas = null;
    let palabrasClave = null;
    let evaluacionManual = false;
    
    if (tipo === 'verdadero_falso') {
      respuestaCorrecta = document.getElementById('editRespuestaCorrectaVF').value;
    } else if (tipo === 'texto_libre') {
      const respuestasValidasTexto = document.getElementById('editRespuestasValidas').value.trim();
      const palabrasClaveTexto = document.getElementById('editPalabrasClave').value.trim();
      evaluacionManual = document.getElementById('editEvaluacionManual').checked;
      
      if (!evaluacionManual && !respuestasValidasTexto && !palabrasClaveTexto) {
        await showAlert('Campo Requerido', 'Debes proporcionar respuestas válidas o palabras clave, o marcar evaluación manual', 'warning');
        return;
      }
      
      if (respuestasValidasTexto) {
        respuestasValidas = respuestasValidasTexto.split('\n').map(r => r.trim()).filter(r => r);
      }
      
      if (palabrasClaveTexto) {
        palabrasClave = palabrasClaveTexto.split(',').map(p => p.trim().toLowerCase()).filter(p => p);
      }
    } else if (tipo === 'opcion_multiple') {
      if (opciones.length < 2) {
        await showAlert('Error', 'Debe haber al menos 2 opciones', 'warning');
        return;
      }
      if (!opciones.some(op => op.correcta)) {
        await showAlert('Error', 'Debe seleccionar una opción correcta', 'warning');
        return;
      }
      if (opciones.some(op => !op.texto.trim())) {
        await showAlert('Error', 'Todas las opciones deben tener texto', 'warning');
        return;
      }
      opcionesJSON = opciones;
    }
    
    try {
      const { error } = await supabaseClient
        .from('preguntas')
        .update({
          pregunta: preguntaTexto,
          tipo: tipo,
          opciones: opcionesJSON,
          respuesta_correcta: respuestaCorrecta,
          respuestas_validas: respuestasValidas,
          palabras_clave: palabrasClave,
          evaluacion_manual: evaluacionManual,
          puntos: puntos
        })
        .eq('id', preguntaId);
      
      if (error) throw error;
      
      const idx = preguntas.findIndex(p => p.id === preguntaId);
      if (idx !== -1) {
        preguntas[idx] = {
          ...preguntas[idx],
          pregunta: preguntaTexto,
          tipo: tipo,
          opciones: opcionesJSON,
          respuesta_correcta: respuestaCorrecta,
          respuestas_validas: respuestasValidas,
          palabras_clave: palabrasClave,
          evaluacion_manual: evaluacionManual,
          puntos: puntos
        };
      }
      
      document.body.removeChild(modal);
      await showAlert('¡Actualizado!', 'La pregunta se ha actualizado correctamente', 'success');
      callback();
      
    } catch (error) {
      console.error('Error:', error);
      await showAlert('Error', 'Error al guardar la pregunta: ' + error.message, 'error');
    }
  });
}

// ============================================
// 9. AGREGAR PREGUNTA
// ============================================

async function agregarPregunta(pruebaId, preguntas, callback) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1001; padding: 20px;';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h3 style="color: #4a0404; margin-bottom: 20px;">Agregar Pregunta</h3>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Pregunta:</label>
        <textarea id="nuevaPreguntaTexto" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"></textarea>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo:</label>
        <select id="nuevaPreguntaTipo" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          <option value="verdadero_falso">Verdadero / Falso</option>
          <option value="opcion_multiple">Opción Múltiple</option>
          <option value="texto_libre">Texto Libre</option>
        </select>
      </div>
      
      <div id="opcionesContainer" style="margin-bottom: 15px; display: none;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Opciones:</label>
        <div id="opcionesList"></div>
        <button id="btnAgregarOpcion" style="margin-top: 10px; padding: 8px 15px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer;">
          + Agregar Opción
        </button>
      </div>
      
      <div id="respuestaCorrectaContainer" style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Respuesta Correcta:</label>
        <select id="respuestaCorrectaVF" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          <option value="verdadero">Verdadero</option>
          <option value="falso">Falso</option>
        </select>
      </div>
      
      <div id="textoLibreConfig" style="margin-bottom: 15px; display: none; border: 2px solid #6b0f0f; border-radius: 6px; padding: 15px; background: #fafafa;">
        <h4 style="color: #4a0404; margin: 0 0 10px 0;">Configuración de Evaluación para Texto Libre</h4>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Respuestas Válidas (una por línea):</label>
          <textarea id="respuestasValidas" rows="4" placeholder="Ejemplo:&#10;La capital de Venezuela es Caracas&#10;Caracas es la capital&#10;Caracas" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: monospace;"></textarea>
          <p style="font-size: 11px; color: #888; margin-top: 5px;">Escribe diferentes formas válidas de responder.</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Palabras Clave Obligatorias (separadas por coma):</label>
          <input type="text" id="palabrasClave" placeholder="Ejemplo: caracas, capital, venezuela" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          <p style="font-size: 11px; color: #888; margin-top: 5px;">La respuesta debe contener TODAS estas palabras.</p>
        </div>
        
        <div>
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="evaluacionManual" style="width: 20px; height: 20px;">
            <span style="font-weight: 600;">Requiere evaluación manual del administrador</span>
          </label>
          <p style="font-size: 11px; color: #888; margin-top: 5px; margin-left: 30px;">Si se marca, el administrador deberá revisar y calificar esta respuesta manualmente.</p>
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Puntos:</label>
        <input type="number" id="nuevaPreguntaPuntos" value="1" min="1" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button id="btnGuardarPregunta" style="flex: 1; padding: 12px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Guardar
        </button>
        <button id="btnCancelarPregunta" style="flex: 1; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  let opciones = [];
  
  function actualizarVista() {
    const tipo = document.getElementById('nuevaPreguntaTipo').value;
    const opcionesContainer = document.getElementById('opcionesContainer');
    const respuestaVF = document.getElementById('respuestaCorrectaVF');
    const textoLibreConfig = document.getElementById('textoLibreConfig');
    
    if (tipo === 'opcion_multiple') {
      opcionesContainer.style.display = 'block';
      respuestaVF.style.display = 'none';
      textoLibreConfig.style.display = 'none';
    } else if (tipo === 'verdadero_falso') {
      opcionesContainer.style.display = 'none';
      respuestaVF.style.display = 'block';
      textoLibreConfig.style.display = 'none';
    } else {
      opcionesContainer.style.display = 'none';
      respuestaVF.style.display = 'none';
      textoLibreConfig.style.display = 'block';
    }
  }
  
  function renderizarOpciones() {
    const listaDiv = document.getElementById('opcionesList');
    listaDiv.innerHTML = '';
    
    opciones.forEach((opcion, index) => {
      const div = document.createElement('div');
      div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
      div.innerHTML = `
        <input type="radio" name="opcionCorrecta" value="${index}" ${opcion.correcta ? 'checked' : ''} style="width: 20px; height: 20px;">
        <input type="text" value="${opcion.texto}" placeholder="Opción ${index + 1}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <button class="btn-eliminar-opcion" data-index="${index}" style="padding: 6px 12px; background: #cc0000; color: white; border: none; border-radius: 4px; cursor: pointer;">🗑️</button>
      `;
      listaDiv.appendChild(div);
      
      div.querySelector('input[type="radio"]').addEventListener('change', (e) => {
        opciones.forEach((op, i) => op.correcta = i === parseInt(e.target.value));
      });
      
      div.querySelector('input[type="text"]').addEventListener('input', (e) => {
        opciones[index].texto = e.target.value;
      });
      
      div.querySelector('.btn-eliminar-opcion').addEventListener('click', () => {
        opciones.splice(index, 1);
        renderizarOpciones();
      });
    });
  }
  
  document.getElementById('nuevaPreguntaTipo').addEventListener('change', actualizarVista);
  
  document.getElementById('btnAgregarOpcion').addEventListener('click', () => {
    opciones.push({ texto: '', correcta: opciones.length === 0 });
    renderizarOpciones();
  });
  
  actualizarVista();
  
  document.getElementById('btnCancelarPregunta').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  document.getElementById('btnGuardarPregunta').addEventListener('click', async () => {
    const preguntaTexto = document.getElementById('nuevaPreguntaTexto').value.trim();
    const tipo = document.getElementById('nuevaPreguntaTipo').value;
    const puntos = parseInt(document.getElementById('nuevaPreguntaPuntos').value);
    
    if (!preguntaTexto) {
      await showAlert('Campo Requerido', 'Por favor escribe la pregunta', 'warning');
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
        await showAlert('Campo Requerido', 'Debes proporcionar respuestas válidas o palabras clave, o marcar evaluación manual', 'warning');
        return;
      }
      
      if (respuestasValidasTexto) {
        respuestasValidas = respuestasValidasTexto.split('\n').map(r => r.trim()).filter(r => r);
      }
      
      if (palabrasClaveTexto) {
        palabrasClave = palabrasClaveTexto.split(',').map(p => p.trim().toLowerCase()).filter(p => p);
      }
    } else if (tipo === 'opcion_multiple') {
      if (opciones.length < 2) {
        await showAlert('Error', 'Debe haber al menos 2 opciones', 'warning');
        return;
      }
      if (!opciones.some(op => op.correcta)) {
        await showAlert('Error', 'Debe seleccionar una opción correcta', 'warning');
        return;
      }
      if (opciones.some(op => !op.texto.trim())) {
        await showAlert('Error', 'Todas las opciones deben tener texto', 'warning');
        return;
      }
      opcionesJSON = opciones;
    }
    
    try {
      const { error } = await supabaseClient
        .from('preguntas')
        .insert({
          prueba_id: pruebaId,
          pregunta: preguntaTexto,
          tipo: tipo,
          opciones: opcionesJSON,
          respuesta_correcta: respuestaCorrecta,
          respuestas_validas: respuestasValidas,
          palabras_clave: palabrasClave,
          evaluacion_manual: evaluacionManual,
          puntos: puntos,
          orden: preguntas.length
        });
      
      if (error) throw error;
      
      document.body.removeChild(modal);
      const { data: nuevaPregunta } = await supabaseClient
        .from('preguntas')
        .select('*')
        .eq('prueba_id', pruebaId)
        .order('orden', { ascending: false })
        .limit(1)
        .single();
      
      preguntas.push(nuevaPregunta);
      callback();
      
    } catch (error) {
      console.error('Error:', error);
      await showAlert('Error', 'Error al guardar la pregunta: ' + error.message, 'error');
    }
  });
}

// Continuará en el siguiente mensaje...
