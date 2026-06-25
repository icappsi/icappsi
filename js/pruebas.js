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
  
  // Formatear fechas para datetime-local
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
    // Eliminar intentos
    await supabaseClient.from('intentos_pruebas').delete().eq('prueba_id', pruebaId);
    
    // Eliminar asignaciones
    await supabaseClient.from('pruebas_usuarios').delete().eq('prueba_id', pruebaId);
    
    // Eliminar preguntas
    await supabaseClient.from('preguntas').delete().eq('prueba_id', pruebaId);
    
    // Eliminar la prueba
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
// 6. GESTIONAR PREGUNTAS CON PAGINACIÓN (ADMIN)
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
            <p style="font-size: 12px; color: #888; margin: 0;">Tipo: ${tipoTexto} | Puntos: ${pregunta.puntos}</p>
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
        
        // Ajustar página si es necesario
        if (paginaPreguntasActual > 1 && preguntas.length <= (paginaPreguntasActual - 1) * preguntasPorPagina) {
          paginaPreguntasActual--;
        }
        
        renderizarPreguntas();
      });
    });
    
    // Renderizar paginación
    const paginacionDiv = document.getElementById('paginacionPreguntas');
    if (totalPaginas > 1) {
      let html = `
        <button id="btnPagPregAnterior" ${paginaPreguntasActual === 1 ? 'disabled' : ''} style="padding: 8px 15px; background: ${paginaPreguntasActual === 1 ? '#ccc' : '#6b0f0f'}; color: white; border: none; border-radius: 4px; cursor: ${paginaPreguntasActual === 1 ? 'not-allowed' : 'pointer'}; font-weight: 600;">
          ← Anterior
        </button>
      `;
      
      // Mostrar números de página (máximo 5 visibles)
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
      // Si estamos en la última página, ir a ella para ver la nueva pregunta
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
// 7. EDITAR PREGUNTA (ADMIN)
// ============================================

async function editarPregunta(preguntaId, pruebaId, preguntas, callback) {
  const pregunta = preguntas.find(p => p.id === preguntaId);
  if (!pregunta) return;
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1001; padding: 20px;';
  
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
        <input type="text" id="editRespuestaCorrectaTexto" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; display: none;" value="${pregunta.respuesta_correcta || ''}" placeholder="Escribe la respuesta correcta">
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
    const respuestaTexto = document.getElementById('editRespuestaCorrectaTexto');
    
    if (tipo === 'opcion_multiple') {
      opcionesContainer.style.display = 'block';
      respuestaVF.style.display = 'none';
      respuestaTexto.style.display = 'none';
      renderizarOpciones();
    } else if (tipo === 'verdadero_falso') {
      opcionesContainer.style.display = 'none';
      respuestaVF.style.display = 'block';
      respuestaTexto.style.display = 'none';
    } else {
      opcionesContainer.style.display = 'none';
      respuestaVF.style.display = 'none';
      respuestaTexto.style.display = 'block';
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
        // Asegurar que haya al menos una correcta
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
    
    if (tipo === 'verdadero_falso') {
      respuestaCorrecta = document.getElementById('editRespuestaCorrectaVF').value;
    } else if (tipo === 'texto_libre') {
      respuestaCorrecta = document.getElementById('editRespuestaCorrectaTexto').value.trim();
      if (!respuestaCorrecta) {
        await showAlert('Campo Requerido', 'Por favor escribe la respuesta correcta', 'warning');
        return;
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
          puntos: puntos
        })
        .eq('id', preguntaId);
      
      if (error) throw error;
      
      // Actualizar el array de preguntas
      const idx = preguntas.findIndex(p => p.id === preguntaId);
      if (idx !== -1) {
        preguntas[idx] = {
          ...preguntas[idx],
          pregunta: preguntaTexto,
          tipo: tipo,
          opciones: opcionesJSON,
          respuesta_correcta: respuestaCorrecta,
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
// 8. AGREGAR PREGUNTA
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
        <input type="text" id="respuestaCorrectaTexto" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; display: none;" placeholder="Escribe la respuesta correcta">
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
    const respuestaTexto = document.getElementById('respuestaCorrectaTexto');
    
    if (tipo === 'opcion_multiple') {
      opcionesContainer.style.display = 'block';
      respuestaVF.style.display = 'none';
      respuestaTexto.style.display = 'none';
    } else if (tipo === 'verdadero_falso') {
      opcionesContainer.style.display = 'none';
      respuestaVF.style.display = 'block';
      respuestaTexto.style.display = 'none';
    } else {
      opcionesContainer.style.display = 'none';
      respuestaVF.style.display = 'none';
      respuestaTexto.style.display = 'block';
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
    
    if (tipo === 'verdadero_falso') {
      respuestaCorrecta = document.getElementById('respuestaCorrectaVF').value;
    } else if (tipo === 'texto_libre') {
      respuestaCorrecta = document.getElementById('respuestaCorrectaTexto').value.trim();
      if (!respuestaCorrecta) {
        await showAlert('Campo Requerido', 'Por favor escribe la respuesta correcta', 'warning');
        return;
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

// ============================================
// 9. ASIGNAR USUARIOS CON BÚSQUEDA Y SELECCIONAR TODOS
// ============================================

async function asignarUsuarios(pruebaId) {
  const { data: usuarios } = await supabaseClient
    .from('usuarios')
    .select('*')
    .order('primer_nombre');
  
  const { data: asignaciones } = await supabaseClient
    .from('pruebas_usuarios')
    .select('*')
    .eq('prueba_id', pruebaId);
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h2 style="color: #4a0404; margin-bottom: 20px;">Asignar Usuarios a Prueba</h2>
      
      <!-- Barra de búsqueda y selección -->
      <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
        <input type="text" id="buscarUsuario" placeholder="🔍 Buscar por cédula, nombre o apellido..." style="flex: 1; min-width: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        <button id="btnSeleccionarTodos" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          ✅ Seleccionar Todos
        </button>
        <button id="btnDeseleccionarTodos" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          ❌ Deseleccionar
        </button>
      </div>
      
      <div id="contadorAsignados" style="text-align: center; color: #666; margin-bottom: 15px; font-size: 14px;"></div>
      
      <div id="listaUsuariosAsignar" style="margin-bottom: 20px;"></div>
      
      <button id="btnCerrarAsignar" style="width: 100%; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
        Cerrar
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const listaDiv = document.getElementById('listaUsuariosAsignar');
  
  function renderizarUsuarios(filtro = '') {
    listaDiv.innerHTML = '';
    const filtroLower = filtro.toLowerCase().trim();
    
    const usuariosFiltrados = usuarios.filter(u => {
      if (!filtroLower) return true;
      const nombreCompleto = `${u.cedula} ${u.primer_nombre} ${u.primer_apellido}`.toLowerCase();
      return nombreCompleto.includes(filtroLower);
    });
    
    document.getElementById('contadorAsignados').textContent = 
      `Mostrando ${usuariosFiltrados.length} de ${usuarios.length} usuarios`;
    
    if (usuariosFiltrados.length === 0) {
      listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No se encontraron usuarios.</p>';
      return;
    }
    
    usuariosFiltrados.forEach(usuario => {
      const asignado = asignaciones.some(a => a.usuario_id === usuario.id);
      
      const div = document.createElement('div');
      div.className = 'usuario-item';
      div.dataset.usuarioId = usuario.id;
      div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 10px;';
      div.innerHTML = `
        <div>
          <p style="margin: 0; font-weight: 600;">${usuario.primer_nombre} ${usuario.primer_apellido}</p>
          <p style="margin: 0; font-size: 12px; color: #888;">Cédula: ${usuario.cedula} | ${usuario.jerarquia || 'Sin jerarquía'}</p>
        </div>
        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
          <input type="checkbox" class="checkbox-usuario" ${asignado ? 'checked' : ''} data-usuario-id="${usuario.id}" style="width: 20px; height: 20px;">
          <span>Habilitar</span>
        </label>
      `;
      listaDiv.appendChild(div);
      
      div.querySelector('.checkbox-usuario').addEventListener('change', async (e) => {
        if (e.target.checked) {
          const { error } = await supabaseClient.from('pruebas_usuarios').insert({
            prueba_id: pruebaId,
            usuario_id: usuario.id
          });
          if (!error) {
            asignaciones.push({ prueba_id: pruebaId, usuario_id: usuario.id });
          }
        } else {
          const { error } = await supabaseClient.from('pruebas_usuarios').delete()
            .eq('prueba_id', pruebaId).eq('usuario_id', usuario.id);
          if (!error) {
            const idx = asignaciones.findIndex(a => a.usuario_id === usuario.id);
            if (idx !== -1) asignaciones.splice(idx, 1);
          }
        }
      });
    });
  }
  
  renderizarUsuarios();
  
  // Búsqueda en tiempo real
  document.getElementById('buscarUsuario').addEventListener('input', (e) => {
    renderizarUsuarios(e.target.value);
  });
  
  // Seleccionar todos (solo los visibles filtrados)
  document.getElementById('btnSeleccionarTodos').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.checkbox-usuario:not(:checked)');
    for (const checkbox of checkboxes) {
      checkbox.checked = true;
      const usuarioId = checkbox.dataset.usuarioId;
      const yaAsignado = asignaciones.some(a => a.usuario_id === usuarioId);
      if (!yaAsignado) {
        const { error } = await supabaseClient.from('pruebas_usuarios').insert({
          prueba_id: pruebaId,
          usuario_id: usuarioId
        });
        if (!error) {
          asignaciones.push({ prueba_id: pruebaId, usuario_id: usuarioId });
        }
      }
    }
    await showAlert('¡Seleccionados!', 'Todos los usuarios visibles han sido habilitados', 'success');
  });
  
  // Deseleccionar todos
  document.getElementById('btnDeseleccionarTodos').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.checkbox-usuario:checked');
    for (const checkbox of checkboxes) {
      checkbox.checked = false;
      const usuarioId = checkbox.dataset.usuarioId;
      const { error } = await supabaseClient.from('pruebas_usuarios').delete()
        .eq('prueba_id', pruebaId).eq('usuario_id', usuarioId);
      if (!error) {
        const idx = asignaciones.findIndex(a => a.usuario_id === usuarioId);
        if (idx !== -1) asignaciones.splice(idx, 1);
      }
    }
    await showAlert('¡Deseleccionados!', 'Todos los usuarios visibles han sido deshabilitados', 'info');
  });
  
  document.getElementById('btnCerrarAsignar').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// ============================================
// 10. VER RESULTADOS CON BÚSQUEDA E IMPRESIÓN
// ============================================

async function verResultados(pruebaId) {
  const { data: prueba } = await supabaseClient
    .from('pruebas')
    .select('*')
    .eq('id', pruebaId)
    .single();
  
  const { data: intentos } = await supabaseClient
    .from('intentos_pruebas')
    .select(`
      *,
      usuarios:usuario_id (id, primer_nombre, primer_apellido, cedula, jerarquia)
    `)
    .eq('prueba_id', pruebaId)
    .eq('estado', 'completado')
    .order('fecha_fin', { ascending: false });
  
  const modal = document.createElement('div');
  modal.id = 'modalResultados';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 1000px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h2 style="color: #4a0404; margin-bottom: 20px;">Resultados - ${prueba.titulo}</h2>
      
      <div style="margin-bottom: 15px;">
        <input type="text" id="buscarResultado" placeholder="🔍 Buscar por cédula, nombre o apellido..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
      </div>
      
      <div id="contadorResultados" style="text-align: center; color: #666; margin-bottom: 15px; font-size: 14px;"></div>
      
      <div id="listaResultados"></div>
      
      <button id="btnCerrarResultados" style="width: 100%; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 20px;">
        Cerrar
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  function renderizarResultados(filtro = '') {
    const listaDiv = document.getElementById('listaResultados');
    const filtroLower = filtro.toLowerCase().trim();
    
    const intentosFiltrados = intentos.filter(i => {
      if (!filtroLower) return true;
      const usuario = i.usuarios;
      const textoCompleto = `${usuario.cedula} ${usuario.primer_nombre} ${usuario.primer_apellido}`.toLowerCase();
      return textoCompleto.includes(filtroLower);
    });
    
    document.getElementById('contadorResultados').textContent = 
      `Mostrando ${intentosFiltrados.length} de ${intentos.length} resultados`;
    
    if (intentosFiltrados.length === 0) {
      listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No hay resultados.</p>';
      return;
    }
    
    listaDiv.innerHTML = '';
    
    intentosFiltrados.forEach(intento => {
      const usuario = intento.usuarios;
      const porcentaje = intento.total_preguntas > 0 ? ((intento.respuestas_correctas / intento.total_preguntas) * 100).toFixed(1) : 0;
      const estado = intento.puntuacion >= 60 ? 'Aprobado' : 'Reprobado';
      const color = intento.puntuacion >= 60 ? '#28a745' : '#dc3545';
      const fechaCompletado = intento.fecha_fin ? new Date(intento.fecha_fin).toLocaleString() : 'En progreso';
      
      const div = document.createElement('div');
      div.style.cssText = 'background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin-bottom: 10px;';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
          <div style="flex: 1; min-width: 200px;">
            <p style="margin: 0; font-weight: 600; font-size: 16px;">${usuario.primer_nombre} ${usuario.primer_apellido}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #888;">Cédula: ${usuario.cedula}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #888;">Completado: ${fechaCompletado}</p>
          </div>
          <div style="text-align: center; min-width: 120px;">
            <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${color};">${porcentaje}%</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; color: ${color};">${estado}</p>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #888;">${intento.respuestas_correctas}/${intento.total_preguntas} correctas</p>
          </div>
          <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            <button class="btn-ver-detalle" data-intento-id="${intento.id}" style="padding: 10px 15px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
              📋 Ver Detalle
            </button>
            <button class="btn-rehabilitar" data-intento-id="${intento.id}" data-usuario-id="${usuario.id}" style="padding: 10px 15px; background: #ffc107; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
              🔄 Rehabilitar
            </button>
          </div>
        </div>
      `;
      listaDiv.appendChild(div);
      
      div.querySelector('.btn-ver-detalle').addEventListener('click', () => verDetalleIntento(intento.id, pruebaId));
      
      div.querySelector('.btn-rehabilitar').addEventListener('click', async () => {
        const confirmado = await showConfirm(
          'Rehabilitar Prueba',
          `¿Estás seguro de habilitar esta prueba nuevamente para <strong>${usuario.primer_nombre} ${usuario.primer_apellido}</strong>?`
        );
        
        if (!confirmado) return;
        
        try {
          const { error } = await supabaseClient
            .from('intentos_pruebas')
            .delete()
            .eq('id', intento.id);
          
          if (error) throw error;
          
          await showAlert('¡Rehabilitado!', 'La prueba ha sido rehabilitada exitosamente', 'success');
          
          document.body.removeChild(modal);
          verResultados(pruebaId);
          
        } catch (error) {
          console.error('Error:', error);
          await showAlert('Error', 'Error al rehabilitar: ' + error.message, 'error');
        }
      });
    });
  }
  
  renderizarResultados();
  
  document.getElementById('buscarResultado').addEventListener('input', (e) => {
    renderizarResultados(e.target.value);
  });
  
  document.getElementById('btnCerrarResultados').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// ============================================
// 11. VER DETALLE DE INTENTO CON IMPRESIÓN
// ============================================

async function verDetalleIntento(intentoId, pruebaId) {
  const { data: intento } = await supabaseClient
    .from('intentos_pruebas')
    .select(`
      *,
      usuarios:usuario_id (id, primer_nombre, primer_apellido, cedula, jerarquia)
    `)
    .eq('id', intentoId)
    .single();
  
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
  
  const usuario = intento.usuarios;
  const respuestas = intento.respuestas || {};
  const porcentaje = intento.total_preguntas > 0 ? ((intento.respuestas_correctas / intento.total_preguntas) * 100).toFixed(1) : 0;
  const estado = intento.puntuacion >= 60 ? 'APROBADO' : 'REPROBADO';
  const color = intento.puntuacion >= 60 ? '#28a745' : '#dc3545';
  const fechaCompletado = intento.fecha_fin ? new Date(intento.fecha_fin).toLocaleString() : '';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1001; padding: 20px;';
  
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
        esCorrecta = respuestaUsuario.toLowerCase().trim() === (pregunta.respuesta_correcta || '').toLowerCase().trim();
      }
    }
    
    const colorRespuesta = respuestaUsuarioTexto === 'Sin responder' ? '#888' : (esCorrecta ? '#28a745' : '#dc3545');
    const icono = respuestaUsuarioTexto === 'Sin responder' ? '⚪' : (esCorrecta ? '✅' : '❌');
    
    preguntasHTML += `
      <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin-bottom: 10px; background: #fafafa; page-break-inside: avoid;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #4a0404;">
          Pregunta ${index + 1} (${pregunta.puntos} puntos):
        </p>
        <p style="margin: 0 0 10px 0; line-height: 1.5;">${pregunta.pregunta}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid ${colorRespuesta};">
          <div>
            <p style="margin: 0; font-size: 13px; color: #666;"><strong>Respuesta del usuario:</strong></p>
            <p style="margin: 5px 0 0 0; color: ${colorRespuesta}; font-weight: 600;">${icono} ${respuestaUsuarioTexto}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 13px; color: #666;"><strong>Respuesta correcta:</strong></p>
            <p style="margin: 5px 0 0 0; color: #28a745; font-weight: 600;">
              ${pregunta.tipo === 'verdadero_falso' ? (pregunta.respuesta_correcta === 'verdadero' ? 'Verdadero' : 'Falso') : 
                (pregunta.tipo === 'opcion_multiple' ? (pregunta.opciones?.find(o => o.correcta)?.texto || 'N/A') : 
                pregunta.respuesta_correcta || 'N/A')}
            </p>
          </div>
        </div>
      </div>
    `;
  });
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
        <h2 style="color: #4a0404; margin: 0;">Detalle de Respuestas</h2>
        <button id="btnImprimir" style="padding: 10px 20px; background: #6b0f0f; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          🖨️ Imprimir
        </button>
      </div>
      
      <div class="print-area">
        <!-- Membrete con logo -->
        <div style="text-align: center; border-bottom: 3px solid #6b0f0f; padding-bottom: 15px; margin-bottom: 20px;">
          <img src="img/logo1.png" alt="Logo" style="max-width: 100px; height: auto; margin-bottom: 10px;">
          <h1 style="color: #4a0404; margin: 0; font-size: 22px;">Programa de Supervisión Intensiva</h1>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">ICAP - Cuerpo de Policía Nacional Bolivariana</p>
        </div>
        
        <!-- Título del reporte -->
        <div style="text-align: center; margin-bottom: 25px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
          <h2 style="color: #4a0404; margin: 0 0 10px 0;">RESULTADO DE PRUEBA</h2>
          <p style="margin: 0; font-size: 18px; font-weight: 600;">${prueba.titulo}</p>
        </div>
        
        <!-- Información del usuario -->
        <div style="background: #f9f9f9; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <h3 style="color: #4a0404; margin: 0 0 10px 0; font-size: 16px;">Información del Evaluado</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <p style="margin: 0;"><strong>Nombre:</strong> ${usuario.primer_nombre} ${usuario.primer_apellido}</p>
            <p style="margin: 0;"><strong>Cédula:</strong> ${usuario.cedula}</p>
            <p style="margin: 0;"><strong>Jerarquía:</strong> ${usuario.jerarquia || 'N/A'}</p>
            <p style="margin: 0;"><strong>Fecha:</strong> ${fechaCompletado}</p>
          </div>
        </div>
        
        <!-- Resultado destacado -->
        <div style="text-align: center; padding: 25px; border: 3px solid ${color}; border-radius: 8px; margin-bottom: 25px; background: ${color}10;">
          <p style="margin: 0 0 10px 0; font-size: 18px; color: #666;">Calificación Final</p>
          <p style="margin: 0 0 10px 0; font-size: 56px; font-weight: 700; color: ${color};">${porcentaje}%</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${color};">${estado}</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
            Respuestas correctas: ${intento.respuestas_correctas} de ${intento.total_preguntas}
          </p>
        </div>
        
        <!-- Detalle de preguntas -->
        <h3 style="color: #4a0404; margin: 0 0 15px 0; border-bottom: 2px solid #6b0f0f; padding-bottom: 10px;">Detalle de Respuestas</h3>
        ${preguntasHTML}
        
        <!-- Pie de página -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #6b0f0f; text-align: center; font-size: 12px; color: #888;">
          <p style="margin: 0;">Documento generado el ${new Date().toLocaleString()}</p>
          <p style="margin: 5px 0 0 0;">© Desarrollado por OTIC ZULIA</p>
        </div>
      </div>
      
      <button id="btnCerrarDetalle" class="no-print" style="width: 100%; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 20px;">
        Cerrar
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('btnImprimir').addEventListener('click', () => {
    window.print();
  });
  
  document.getElementById('btnCerrarDetalle').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// ============================================
// 12. CARGAR PRUEBAS (USUARIO)
// ============================================

async function cargarPruebasUsuario() {
  const listaDiv = document.getElementById('listaPruebasUsuario');
  listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Cargando pruebas disponibles...</p>';
  
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const ahora = new Date();
  
  try {
    const { data: pruebas, error } = await supabaseClient
      .from('pruebas')
      .select('*')
      .eq('activa', true)
      .lte('fecha_inicio', ahora.toISOString())
      .gte('fecha_fin', ahora.toISOString())
      .order('fecha_inicio', { ascending: false });
    
    if (error) throw error;
    
    if (!pruebas || pruebas.length === 0) {
      listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No hay pruebas disponibles en este momento.</p>';
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
      listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No tienes pruebas asignadas.</p>';
      return;
    }
    
    listaDiv.innerHTML = '';
    
    for (const prueba of pruebasFiltradas) {
      const { data: intentoCompletado } = await supabaseClient
        .from('intentos_pruebas')
        .select('*')
        .eq('prueba_id', prueba.id)
        .eq('usuario_id', usuario.id)
        .eq('estado', 'completado')
        .maybeSingle();
      
      const { data: intentoEnProgreso } = await supabaseClient
        .from('intentos_pruebas')
        .select('*')
        .eq('prueba_id', prueba.id)
        .eq('usuario_id', usuario.id)
        .eq('estado', 'en_progreso')
        .maybeSingle();
      
      const card = document.createElement('div');
      card.style.cssText = 'background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);';
      
      const fechaFin = new Date(prueba.fecha_fin).toLocaleString();
      
      if (intentoCompletado) {
        const porcentaje = intentoCompletado.total_preguntas > 0 ? ((intentoCompletado.respuestas_correctas / intentoCompletado.total_preguntas) * 100).toFixed(1) : 0;
        const estado = intentoCompletado.puntuacion >= 60 ? 'Aprobado' : 'Reprobado';
        const color = intentoCompletado.puntuacion >= 60 ? '#28a745' : '#dc3545';
        const icono = intentoCompletado.puntuacion >= 60 ? '✅' : '❌';
        
        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <span style="font-size: 48px;">${icono}</span>
            <div style="flex: 1;">
              <h3 style="color: #4a0404; margin: 0 0 5px 0; font-size: 20px;">${prueba.titulo}</h3>
              <p style="color: #666; margin: 0; font-size: 14px;">${prueba.descripcion || 'Sin descripción'}</p>
            </div>
          </div>
          
          <div style="background: ${color}15; border: 2px solid ${color}; border-radius: 8px; padding: 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: 600;">PRUEBA COMPLETADA</p>
            <p style="margin: 0 0 5px 0; font-size: 48px; font-weight: 700; color: ${color};">${porcentaje}%</p>
            <p style="margin: 0 0 10px 0; font-size: 20px; font-weight: 600; color: ${color};">${estado}</p>
            <p style="margin: 0; font-size: 13px; color: #888;">
              Respuestas correctas: ${intentoCompletado.respuestas_correctas} de ${intentoCompletado.total_preguntas}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
              Si necesitas realizar esta prueba nuevamente, contacta al administrador.
            </p>
          </div>
        `;
      } else if (intentoEnProgreso) {
        card.innerHTML = `
          <h3 style="color: #4a0404; margin: 0 0 10px 0;">${prueba.titulo}</h3>
          <p style="color: #666; margin-bottom: 15px;">${prueba.descripcion || 'Sin descripción'}</p>
          <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; text-align: center;">
            <p style="margin: 0; color: #856404; font-weight: 600;">⚠️ Tienes una prueba en progreso</p>
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #856404;">
              Contacta al administrador para reiniciar la prueba.
            </p>
          </div>
        `;
      } else {
        card.innerHTML = `
          <h3 style="color: #4a0404; margin: 0 0 10px 0;">${prueba.titulo}</h3>
          <p style="color: #666; margin-bottom: 15px;">${prueba.descripcion || 'Sin descripción'}</p>
          <div style="font-size: 13px; color: #888; margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 6px;">
            <p style="margin: 0;"><strong>Disponible hasta:</strong> ${fechaFin}</p>
            ${prueba.tiempo_limite > 0 ? `<p style="margin: 5px 0 0 0;"><strong>Tiempo límite:</strong> ${prueba.tiempo_limite} minutos</p>` : ''}
          </div>
          <button class="btn-iniciar-prueba" data-id="${prueba.id}" style="width: 100%; padding: 15px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 16px; transition: all 0.3s;">
            📝 Iniciar Prueba
          </button>
        `;
        
        card.querySelector('.btn-iniciar-prueba').addEventListener('click', () => iniciarPrueba(prueba.id));
      }
      
      listaDiv.appendChild(card);
    }
    
  } catch (error) {
    console.error('Error:', error);
    listaDiv.innerHTML = '<p style="text-align: center; color: #c33; padding: 40px;">Error al cargar las pruebas.</p>';
  }
}

// ============================================
// 13. INICIAR Y REALIZAR PRUEBA
// ============================================

async function iniciarPrueba(pruebaId) {
  const confirmado = await showConfirm('Iniciar Prueba', '¿Estás seguro de iniciar esta prueba? Una vez iniciada, no podrás pausarla.');
  if (!confirmado) return;
  
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
  
  if (!preguntas || preguntas.length === 0) {
    await showAlert('Error', 'Esta prueba no tiene preguntas', 'error');
    return;
  }
  
  pruebaActual = prueba;
  preguntasActuales = preguntas;
  respuestasUsuario = {};
  
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  
  const { data: intento } = await supabaseClient
    .from('intentos_pruebas')
    .insert({
      prueba_id: pruebaId,
      usuario_id: usuario.id,
      estado: 'en_progreso',
      total_preguntas: preguntas.length
    })
    .select()
    .single();
  
  mostrarPrueba(prueba, preguntas, intento.id);
}

function mostrarPrueba(prueba, preguntas, intentoId) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: #4a0404; margin: 0;">${prueba.titulo}</h2>
        <div id="timer" style="font-size: 24px; font-weight: 700; color: #6b0f0f;"></div>
      </div>
      
      <div id="preguntasContainer"></div>
      
      <button id="btnEnviarPrueba" style="width: 100%; padding: 15px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 20px; font-size: 16px;">
        Enviar Prueba
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const preguntasDiv = document.getElementById('preguntasContainer');
  
  preguntas.forEach((pregunta, index) => {
    const div = document.createElement('div');
    div.style.cssText = 'background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin-bottom: 15px;';
    
    let opcionesHTML = '';
    
    if (pregunta.tipo === 'verdadero_falso') {
      opcionesHTML = `
        <div style="margin-top: 10px;">
          <label style="display: block; margin-bottom: 10px; cursor: pointer;">
            <input type="radio" name="pregunta_${pregunta.id}" value="verdadero" style="width: 20px; height: 20px; margin-right: 10px;">
            <span style="font-size: 16px;">Verdadero</span>
          </label>
          <label style="display: block; cursor: pointer;">
            <input type="radio" name="pregunta_${pregunta.id}" value="falso" style="width: 20px; height: 20px; margin-right: 10px;">
            <span style="font-size: 16px;">Falso</span>
          </label>
        </div>
      `;
    } else if (pregunta.tipo === 'opcion_multiple') {
      opcionesHTML = '<div style="margin-top: 10px;">';
      pregunta.opciones.forEach((opcion, i) => {
        opcionesHTML += `
          <label style="display: block; margin-bottom: 10px; cursor: pointer;">
            <input type="radio" name="pregunta_${pregunta.id}" value="${i}" style="width: 20px; height: 20px; margin-right: 10px;">
            <span style="font-size: 16px;">${opcion.texto}</span>
          </label>
        `;
      });
      opcionesHTML += '</div>';
    } else if (pregunta.tipo === 'texto_libre') {
      opcionesHTML = `
        <div style="margin-top: 10px;">
          <textarea name="pregunta_${pregunta.id}" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 14px;" placeholder="Escribe tu respuesta aquí..."></textarea>
        </div>
      `;
    }
    
    div.innerHTML = `
      <p style="font-weight: 600; margin: 0 0 10px 0; font-size: 16px;">Pregunta ${index + 1} (${pregunta.puntos} puntos):</p>
      <p style="margin: 0 0 10px 0; font-size: 15px; line-height: 1.6;">${pregunta.pregunta}</p>
      ${opcionesHTML}
    `;
    
    preguntasDiv.appendChild(div);
    
    div.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener('change', (e) => {
        respuestasUsuario[pregunta.id] = e.target.value;
      });
    });
    
    const textarea = div.querySelector('textarea');
    if (textarea) {
      textarea.addEventListener('input', (e) => {
        respuestasUsuario[pregunta.id] = e.target.value;
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
        enviarPrueba(intentoId);
      }
    }, 1000);
  }
  
  function actualizarTimer() {
    const minutos = Math.floor(tiempoRestante / 60);
    const segundos = tiempoRestante % 60;
    document.getElementById('timer').textContent = `${minutos}:${segundos.toString().padStart(2, '0')}`;
  }
  
  document.getElementById('btnEnviarPrueba').addEventListener('click', async () => {
    const confirmado = await showConfirm('Enviar Prueba', '¿Estás seguro de enviar la prueba? No podrás cambiar tus respuestas.');
    if (!confirmado) return;
    
    if (intervaloTiempo) clearInterval(intervaloTiempo);
    enviarPrueba(intentoId);
  });
}

async function enviarPrueba(intentoId) {
  let respuestasCorrectas = 0;
  let totalPuntos = 0;
  let puntosObtenidos = 0;
  
  preguntasActuales.forEach(pregunta => {
    totalPuntos += pregunta.puntos;
    const respuestaUsuario = respuestasUsuario[pregunta.id];
    
    let esCorrecta = false;
    
    if (pregunta.tipo === 'verdadero_falso') {
      esCorrecta = respuestaUsuario === pregunta.respuesta_correcta;
    } else if (pregunta.tipo === 'opcion_multiple') {
      const opcionSeleccionada = pregunta.opciones[parseInt(respuestaUsuario)];
      esCorrecta = opcionSeleccionada && opcionSeleccionada.correcta;
    } else if (pregunta.tipo === 'texto_libre') {
      esCorrecta = respuestaUsuario && respuestaUsuario.toLowerCase().trim() === pregunta.respuesta_correcta.toLowerCase().trim();
    }
    
    if (esCorrecta) {
      respuestasCorrectas++;
      puntosObtenidos += pregunta.puntos;
    }
  });
  
  const puntuacion = totalPuntos > 0 ? (puntosObtenidos / totalPuntos) * 100 : 0;
  
  try {
    await supabaseClient
      .from('intentos_pruebas')
      .update({
        fecha_fin: new Date().toISOString(),
        puntuacion: puntuacion,
        respuestas_correctas: respuestasCorrectas,
        estado: 'completado',
        respuestas: respuestasUsuario
      })
      .eq('id', intentoId);
    
    const modals = document.querySelectorAll('[style*="position: fixed"]');
    modals.forEach(m => {
      if (m.querySelector('#preguntasContainer')) {
        document.body.removeChild(m);
      }
    });
    
    const resultado = puntuacion >= 60 ? 'APROBADO' : 'REPROBADO';
    const icono = puntuacion >= 60 ? '🎉' : '😔';
    
    const modalResultado = document.createElement('div');
    modalResultado.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 20px;';
    
    modalResultado.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 40px; max-width: 500px; width: 100%; text-align: center;">
        <div style="font-size: 80px; margin-bottom: 20px;">${icono}</div>
        <h2 style="color: ${puntuacion >= 60 ? '#28a745' : '#dc3545'}; margin: 0 0 20px 0; font-size: 32px;">${resultado}</h2>
        
        <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 48px; font-weight: 700; color: ${puntuacion >= 60 ? '#28a745' : '#dc3545'};">${puntuacion.toFixed(1)}%</p>
          <p style="margin: 0; font-size: 16px; color: #666;">Puntuación Obtenida</p>
        </div>
        
        <div style="text-align: left; background: #f9f9f9; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 5px 0; font-size: 14px;"><strong>Respuestas correctas:</strong> ${respuestasCorrectas} de ${preguntasActuales.length}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Puntos obtenidos:</strong> ${puntosObtenidos} de ${totalPuntos}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Estado:</strong> <span style="color: ${puntuacion >= 60 ? '#28a745' : '#dc3545'}; font-weight: 600;">${resultado}</span></p>
        </div>
        
        <p style="font-size: 13px; color: #888; margin-bottom: 20px;">
          ${puntuacion >= 60 ? '¡Felicitaciones! Has aprobado esta prueba.' : 'No alcanzaste el 60% requerido. Contacta al administrador si necesitas realizarla nuevamente.'}
        </p>
        
        <button id="btnCerrarResultado" style="width: 100%; padding: 15px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 16px;">
          Aceptar
        </button>
      </div>
    `;
    
    document.body.appendChild(modalResultado);
    
    document.getElementById('btnCerrarResultado').addEventListener('click', () => {
      document.body.removeChild(modalResultado);
      cargarPruebasUsuario();
    });
    
  } catch (error) {
    console.error('Error:', error);
    await showAlert('Error', 'Error al enviar la prueba: ' + error.message, 'error');
  }
}
