// ============================================
// SISTEMA DE PRUEBAS - ARCHIVO COMPLETO
// ============================================

let pruebaActual = null;
let preguntasActuales = [];
let respuestasUsuario = {};
let tiempoRestante = 0;
let intervaloTiempo = null;

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
// 3. CARGAR PRUEBAS (ADMIN)
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
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div>
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
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn-gestionar-preguntas" data-id="${prueba.id}" style="flex: 1; min-width: 150px; padding: 8px 15px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            📝 Gestionar Preguntas
          </button>
          <button class="btn-asignar-usuarios" data-id="${prueba.id}" style="flex: 1; min-width: 150px; padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            👥 Asignar Usuarios
          </button>
          <button class="btn-ver-resultados" data-id="${prueba.id}" style="flex: 1; min-width: 150px; padding: 8px 15px; background: #6b0f0f; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            📊 Ver Resultados
          </button>
        </div>
      `;
      
      listaDiv.appendChild(card);
      
      document.querySelector(`.btn-gestionar-preguntas[data-id="${prueba.id}"]`).addEventListener('click', () => gestionarPreguntas(prueba.id));
      document.querySelector(`.btn-asignar-usuarios[data-id="${prueba.id}"]`).addEventListener('click', () => asignarUsuarios(prueba.id));
      document.querySelector(`.btn-ver-resultados[data-id="${prueba.id}"]`).addEventListener('click', () => verResultados(prueba.id));
    });
    
  } catch (error) {
    console.error('Error:', error);
    listaDiv.innerHTML = '<p style="text-align: center; color: #c33; padding: 40px;">Error al cargar las pruebas.</p>';
  }
}

// ============================================
// 4. GESTIONAR PREGUNTAS (ADMIN)
// ============================================

async function gestionarPreguntas(pruebaId) {
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
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h2 style="color: #4a0404; margin-bottom: 20px;">Gestionar Preguntas - ${prueba.titulo}</h2>
      
      <button id="btnAgregarPregunta" style="width: 100%; padding: 12px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-bottom: 20px;">
        + Agregar Pregunta
      </button>
      
      <div id="listaPreguntas"></div>
      
      <button id="btnCerrarGestion" style="width: 100%; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 20px;">
        Cerrar
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  function renderizarPreguntas() {
    const listaDiv = document.getElementById('listaPreguntas');
    
    if (!preguntas || preguntas.length === 0) {
      listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No hay preguntas aún.</p>';
      return;
    }
    
    listaDiv.innerHTML = '';
    
    preguntas.forEach((pregunta, index) => {
      const card = document.createElement('div');
      card.style.cssText = 'background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin-bottom: 10px;';
      
      let tipoTexto = 'Texto Libre';
      if (pregunta.tipo === 'verdadero_falso') tipoTexto = 'Verdadero/Falso';
      else if (pregunta.tipo === 'opcion_multiple') tipoTexto = 'Opción Múltiple';
      
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div style="flex: 1;">
            <p style="font-weight: 600; margin: 0 0 5px 0;">Pregunta ${index + 1}:</p>
            <p style="margin: 0 0 5px 0;">${pregunta.pregunta}</p>
            <p style="font-size: 12px; color: #888; margin: 0;">Tipo: ${tipoTexto} | Puntos: ${pregunta.puntos}</p>
          </div>
          <button class="btn-eliminar-pregunta" data-id="${pregunta.id}" style="padding: 6px 12px; background: #cc0000; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            🗑️
          </button>
        </div>
      `;
      
      listaDiv.appendChild(card);
      
      card.querySelector('.btn-eliminar-pregunta').addEventListener('click', async () => {
        const confirmado = await showConfirm('Eliminar Pregunta', '¿Estás seguro de eliminar esta pregunta?');
        if (!confirmado) return;
        
        await supabaseClient.from('preguntas').delete().eq('id', pregunta.id);
        preguntas.splice(index, 1);
        renderizarPreguntas();
      });
    });
  }
  
  renderizarPreguntas();
  
  document.getElementById('btnAgregarPregunta').addEventListener('click', () => agregarPregunta(pruebaId, preguntas, renderizarPreguntas));
  
  document.getElementById('btnCerrarGestion').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

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
// 5. ASIGNAR USUARIOS A PRUEBA (ADMIN)
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
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h2 style="color: #4a0404; margin-bottom: 20px;">Asignar Usuarios a Prueba</h2>
      <p style="color: #666; margin-bottom: 20px;">Selecciona los usuarios que pueden realizar esta prueba:</p>
      
      <div id="listaUsuariosAsignar" style="margin-bottom: 20px;"></div>
      
      <button id="btnCerrarAsignar" style="width: 100%; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
        Cerrar
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const listaDiv = document.getElementById('listaUsuariosAsignar');
  
  usuarios.forEach(usuario => {
    const asignado = asignaciones.some(a => a.usuario_id === usuario.id);
    
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 10px;';
    div.innerHTML = `
      <div>
        <p style="margin: 0; font-weight: 600;">${usuario.primer_nombre} ${usuario.primer_apellido}</p>
        <p style="margin: 0; font-size: 12px; color: #888;">Cédula: ${usuario.cedula}</p>
      </div>
      <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
        <input type="checkbox" ${asignado ? 'checked' : ''} data-usuario-id="${usuario.id}" style="width: 20px; height: 20px;">
        <span>Habilitar</span>
      </label>
    `;
    listaDiv.appendChild(div);
    
    div.querySelector('input[type="checkbox"]').addEventListener('change', async (e) => {
      if (e.target.checked) {
        await supabaseClient.from('pruebas_usuarios').insert({
          prueba_id: pruebaId,
          usuario_id: usuario.id
        });
      } else {
        await supabaseClient.from('pruebas_usuarios').delete().eq('prueba_id', pruebaId).eq('usuario_id', usuario.id);
      }
    });
  });
  
  document.getElementById('btnCerrarAsignar').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// ============================================
// 6. VER RESULTADOS (ADMIN)
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
      usuarios:usuario_id (primer_nombre, primer_apellido, cedula)
    `)
    .eq('prueba_id', pruebaId)
    .eq('estado', 'completado');
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h2 style="color: #4a0404; margin-bottom: 20px;">Resultados - ${prueba.titulo}</h2>
      
      <div id="listaResultados"></div>
      
      <button id="btnCerrarResultados" style="width: 100%; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 20px;">
        Cerrar
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const listaDiv = document.getElementById('listaResultados');
  
  if (!intentos || intentos.length === 0) {
    listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No hay resultados aún.</p>';
  } else {
    intentos.forEach(intento => {
      const usuario = intento.usuarios;
      const porcentaje = ((intento.respuestas_correctas / intento.total_preguntas) * 100).toFixed(1);
      const estado = intento.puntuacion >= 60 ? 'Aprobado' : 'Reprobado';
      const color = intento.puntuacion >= 60 ? '#28a745' : '#dc3545';
      
      const div = document.createElement('div');
      div.style.cssText = 'background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin-bottom: 10px;';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0; font-weight: 600;">${usuario.primer_nombre} ${usuario.primer_apellido}</p>
            <p style="margin: 0; font-size: 12px; color: #888;">Cédula: ${usuario.cedula}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${color};">${porcentaje}%</p>
            <p style="margin: 0; font-size: 12px; color: ${color}; font-weight: 600;">${estado}</p>
            <p style="margin: 0; font-size: 11px; color: #888;">${intento.respuestas_correctas}/${intento.total_preguntas} correctas</p>
          </div>
        </div>
      `;
      listaDiv.appendChild(div);
    });
  }
  
  document.getElementById('btnCerrarResultados').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// ============================================
// 7. CARGAR PRUEBAS DISPONIBLES (USUARIO)
// ============================================

async function cargarPruebasUsuario() {
  const listaDiv = document.getElementById('listaPruebasUsuario');
  listaDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Cargando pruebas disponibles...</p>';
  
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const ahora = new Date();
  
  try {
    // Obtener pruebas activas y en el rango de tiempo
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
    
    // Filtrar solo las pruebas asignadas al usuario (si es usuario normal)
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
      // Verificar si el usuario ya completó esta prueba
      const { data: intento } = await supabaseClient
        .from('intentos_pruebas')
        .select('*')
        .eq('prueba_id', prueba.id)
        .eq('usuario_id', usuario.id)
        .eq('estado', 'completado')
        .single();
      
      const card = document.createElement('div');
      card.style.cssText = 'background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);';
      
      const fechaFin = new Date(prueba.fecha_fin).toLocaleString();
      
      if (intento) {
        const porcentaje = ((intento.respuestas_correctas / intento.total_preguntas) * 100).toFixed(1);
        const estado = intento.puntuacion >= 60 ? 'Aprobado' : 'Reprobado';
        const color = intento.puntuacion >= 60 ? '#28a745' : '#dc3545';
        
        card.innerHTML = `
          <h3 style="color: #4a0404; margin: 0 0 10px 0;">${prueba.titulo}</h3>
          <p style="color: #666; margin-bottom: 15px;">${prueba.descripcion || 'Sin descripción'}</p>
          <div style="background: ${color}15; border: 2px solid ${color}; border-radius: 8px; padding: 15px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666;">Ya completaste esta prueba</p>
            <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: 700; color: ${color};">${porcentaje}%</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: ${color};">${estado}</p>
          </div>
        `;
      } else {
        card.innerHTML = `
          <h3 style="color: #4a0404; margin: 0 0 10px 0;">${prueba.titulo}</h3>
          <p style="color: #666; margin-bottom: 15px;">${prueba.descripcion || 'Sin descripción'}</p>
          <p style="font-size: 13px; color: #888; margin-bottom: 15px;">Disponible hasta: ${fechaFin}</p>
          ${prueba.tiempo_limite > 0 ? `<p style="font-size: 13px; color: #888; margin-bottom: 15px;">Tiempo límite: ${prueba.tiempo_limite} minutos</p>` : ''}
          <button class="btn-iniciar-prueba" data-id="${prueba.id}" style="width: 100%; padding: 12px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            Iniciar Prueba
          </button>
        `;
      }
      
      listaDiv.appendChild(card);
      
      const btnIniciar = card.querySelector('.btn-iniciar-prueba');
      if (btnIniciar) {
        btnIniciar.addEventListener('click', () => iniciarPrueba(prueba.id));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    listaDiv.innerHTML = '<p style="text-align: center; color: #c33; padding: 40px;">Error al cargar las pruebas.</p>';
  }
}

// ============================================
// 8. INICIAR Y REALIZAR PRUEBA
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
  
  // Crear intento
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
    
    // Guardar respuesta cuando cambie
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
  
  // Timer
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
  
  document.getElementById('btnEnviarPrueba').addEventListener('click', () => {
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
      // Comparación simple (puede mejorarse con palabras clave)
      esCorrecta = respuestaUsuario && respuestaUsuario.toLowerCase().trim() === pregunta.respuesta_correcta.toLowerCase().trim();
    }
    
    if (esCorrecta) {
      respuestasCorrectas++;
      puntosObtenidos += pregunta.puntos;
    }
  });
  
  const puntuacion = (puntosObtenidos / totalPuntos) * 100;
  const estado = puntuacion >= 60 ? 'aprobado' : 'reprobado';
  
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
    
    // Cerrar modal
    document.querySelectorAll('.modal-overlay').forEach(m => document.body.removeChild(m));
    
    const resultado = puntuacion >= 60 ? 'Aprobado' : 'Reprobado';
    const color = puntuacion >= 60 ? 'success' : 'error';
    
    await showAlert(`Prueba ${resultado}`, `Tu puntuación: ${puntuacion.toFixed(1)}%<br>Respuestas correctas: ${respuestasCorrectas}/${preguntasActuales.length}`, color);
    
    cargarPruebasUsuario();
    
  } catch (error) {
    console.error('Error:', error);
    await showAlert('Error', 'Error al enviar la prueba: ' + error.message, 'error');
  }
}

