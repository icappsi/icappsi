// Mostrar/ocultar campos según el tipo de material
document.getElementById('materialTipo').addEventListener('change', function() {
  const tipo = this.value;
  const archivoField = document.getElementById('archivoField');
  const contenidoField = document.getElementById('contenidoField');
  const archivoInput = document.getElementById('materialArchivo');
  
  if (tipo === 'blog') {
    archivoField.style.display = 'none';
    contenidoField.style.display = 'block';
  } else {
    archivoField.style.display = 'block';
    contenidoField.style.display = 'none';
    
    // Configurar accept según el tipo
    if (tipo === 'imagen') {
      archivoInput.accept = 'image/*';
    } else if (tipo === 'video') {
      archivoInput.accept = 'video/*';
    } else {
      archivoInput.accept = '*/*';
    }
  }
});

// Subir material
document.getElementById('btnSubirMaterial').addEventListener('click', async () => {
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  if (!usuario || usuario.nivel_acceso !== 'administrador') {
    await showAlert('Acceso Denegado', 'Solo los administradores pueden subir material', 'error');
    return;
  }
  
  const tipo = document.getElementById('materialTipo').value;
  const titulo = document.getElementById('materialTitulo').value.trim();
  const descripcion = document.getElementById('materialDescripcion').value.trim();
  const archivo = document.getElementById('materialArchivo').files[0];
  const contenido = document.getElementById('materialContenido').value.trim();
  
  if (!titulo) {
    await showAlert('Campo Requerido', 'Por favor ingresa un título', 'warning');
    return;
  }
  
  if ((tipo === 'documento' || tipo === 'video' || tipo === 'imagen') && !archivo) {
    await showAlert('Campo Requerido', 'Por favor selecciona un archivo', 'warning');
    return;
  }
  
  if (tipo === 'blog' && !contenido) {
    await showAlert('Campo Requerido', 'Por favor ingresa el contenido del blog', 'warning');
    return;
  }
  
  const btnSubir = document.getElementById('btnSubirMaterial');
  btnSubir.disabled = true;
  btnSubir.textContent = 'Publicando...';
  
  try {
    let archivoUrl = null;
    
    // Si es documento, video o imagen, subir el archivo primero
    if (tipo === 'documento' || tipo === 'video' || tipo === 'imagen') {
      const fileName = `${Date.now()}_${archivo.name}`;
      
      btnSubir.textContent = 'Subiendo archivo...';
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('material-apoyo')
        .upload(fileName, archivo, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Error subiendo archivo:', uploadError);
        throw new Error('Error al subir el archivo: ' + uploadError.message);
      }
      
      // ✅ CONFIRMACIÓN VISUAL DE SUBIDA EXITOSA
      btnSubir.textContent = '✅ Archivo subido correctamente';
      btnSubir.style.background = '#28a745';
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: urlData } = supabaseClient.storage
        .from('material-apoyo')
        .getPublicUrl(fileName);
      
      archivoUrl = urlData.publicUrl;
    }
    
    // Guardar en la base de datos
    btnSubir.textContent = 'Guardando en base de datos...';
    btnSubir.style.background = '#6b0f0f';
    
    const { error: dbError } = await supabaseClient
      .from('material_apoyo')
      .insert({
        tipo: tipo,
        titulo: titulo,
        descripcion: descripcion,
        contenido: tipo === 'blog' ? contenido : null,
        archivo_url: archivoUrl,
        creado_por: usuario.id
      });
    
    if (dbError) throw dbError;
    
    // ✅ CONFIRMACIÓN FINAL EXITOSA
    btnSubir.textContent = '✅ ¡Material publicado exitosamente!';
    btnSubir.style.background = '#28a745';
    
    // Limpiar formulario
    document.getElementById('materialTitulo').value = '';
    document.getElementById('materialDescripcion').value = '';
    document.getElementById('materialArchivo').value = '';
    document.getElementById('materialContenido').value = '';
    
    // Mostrar modal de éxito
    setTimeout(async () => {
      await showAlert('¡Éxito!', 'El material se ha publicado correctamente', 'success');
      cargarMateriales();
      btnSubir.disabled = false;
      btnSubir.textContent = 'Publicar Material';
      btnSubir.style.background = '#6b0f0f';
    }, 1500);
    
  } catch (error) {
    console.error('Error:', error);
    await showAlert('Error', 'Error al publicar el material: ' + error.message, 'error');
    btnSubir.disabled = false;
    btnSubir.textContent = 'Publicar Material';
    btnSubir.style.background = '#6b0f0f';
  }
});

// Variables de paginación
let paginaActual = 1;
const materialesPorPagina = 10;
let todosLosMateriales = [];

// Cargar y mostrar materiales
async function cargarMateriales() {
  const materialList = document.getElementById('materialList');
  materialList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Cargando materiales...</p>';
  
  try {
    const { data: materiales, error } = await supabaseClient
      .from('material_apoyo')
      .select('*')
      .order('fecha_creacion', { ascending: false });
    
    if (error) throw error;
    
    if (!materiales || materiales.length === 0) {
      materialList.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No hay material disponible aún.</p>';
      return;
    }
    
    todosLosMateriales = materiales;
    paginaActual = 1;
    renderizarMaterialesPagina();
    
  } catch (error) {
    console.error('Error cargando materiales:', error);
    materialList.innerHTML = '<p style="text-align: center; color: #c33; padding: 40px;">Error al cargar los materiales.</p>';
  }
}

// Función para renderizar una página específica de materiales
function renderizarMaterialesPagina() {
  const materialList = document.getElementById('materialList');
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const esAdmin = usuario && usuario.nivel_acceso === 'administrador';
  
  const inicio = (paginaActual - 1) * materialesPorPagina;
  const fin = inicio + materialesPorPagina;
  const materialesPagina = todosLosMateriales.slice(inicio, fin);
  const totalPaginas = Math.ceil(todosLosMateriales.length / materialesPorPagina);
  
  materialList.innerHTML = '';
  
  materialesPagina.forEach((material, index) => {
    const card = document.createElement('div');
    card.style.cssText = 'background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);';
    
    let icon = '📄';
    let tipoTexto = 'Documento';
    if (material.tipo === 'video') {
      icon = '🎥';
      tipoTexto = 'Video';
    } else if (material.tipo === 'blog') {
      icon = '📝';
      tipoTexto = 'Blog';
    } else if (material.tipo === 'imagen') {
      icon = '🖼️';
      tipoTexto = 'Imagen';
    }
    
    let contentHTML = '';
    
    if (material.tipo === 'blog') {
      const contenidoCompleto = material.contenido || '';
      const palabras = contenidoCompleto.split(' ');
      const palabrasPorPagina = 200;
      const totalPaginasBlog = Math.ceil(palabras.length / palabrasPorPagina);
      
      contentHTML = `
        <div class="blog-content" data-id="${material.id}" data-pagina="1" data-total="${totalPaginasBlog}">
          <div class="blog-text" style="line-height: 1.6; text-align: justify;">${getPaginaContenido(contenidoCompleto, 1, palabrasPorPagina)}</div>
          ${totalPaginasBlog > 1 ? `
            <div class="pagination" style="margin-top: 15px; text-align: center;">
              <button class="btn-prev" disabled style="padding: 8px 15px; margin: 0 5px; background: #6b0f0f; color: white; border: none; border-radius: 4px; cursor: pointer;">Anterior</button>
              <span style="margin: 0 10px;">Página 1 de ${totalPaginasBlog}</span>
              <button class="btn-next" style="padding: 8px 15px; margin: 0 5px; background: #6b0f0f; color: white; border: none; border-radius: 4px; cursor: pointer;">Siguiente</button>
            </div>
          ` : ''}
        </div>
      `;
    } else if (material.tipo === 'video') {
      contentHTML = `
        <div style="margin-top: 15px; background: #000; border-radius: 8px; overflow: hidden;">
          <video 
            controls 
            preload="metadata"
            style="width: 100%; max-height: 400px; display: block;"
          >
            <source src="${material.archivo_url}" type="video/mp4">
            Tu navegador no soporta la reproducción de videos.
          </video>
        </div>
        <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="${material.archivo_url}" download style="padding: 8px 15px; background: #6b0f0f; color: white; text-decoration: none; border-radius: 6px; font-size: 13px;">
            ⬇️ Descargar Video
          </a>
          <button onclick="window.open('${material.archivo_url}', '_blank')" style="padding: 8px 15px; background: #555; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
            🔗 Abrir en nueva pestaña
          </button>
        </div>
      `;
    } else if (material.tipo === 'imagen') {
      // 🖼️ IMAGEN COMPLETA MOSTRADA DIRECTAMENTE
      contentHTML = `
        <div style="margin-top: 15px; border-radius: 8px; overflow: hidden; background: #f9f9f9;">
          <img 
            src="${material.archivo_url}" 
            alt="${material.titulo}"
            style="width: 100%; height: auto; display: block; cursor: pointer;"
            onclick="window.open('${material.archivo_url}', '_blank')"
          >
        </div>
        <div style="margin-top: 10px;">
          <a href="${material.archivo_url}" download style="display: inline-block; padding: 8px 15px; background: #6b0f0f; color: white; text-decoration: none; border-radius: 6px; font-size: 13px;">
            ⬇️ Descargar Imagen
          </a>
        </div>
      `;
    } else if (material.tipo === 'documento') {
      const esPDF = material.archivo_url.toLowerCase().endsWith('.pdf');
      
      if (esPDF) {
        contentHTML = `
          <div style="margin-top: 15px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <iframe 
              src="${material.archivo_url}" 
              style="width: 100%; height: 500px; border: none;"
              title="Vista previa del documento"
            ></iframe>
          </div>
          <div style="margin-top: 10px;">
            <a href="${material.archivo_url}" download style="display: inline-block; padding: 10px 20px; background: #6b0f0f; color: white; text-decoration: none; border-radius: 6px;">
              ⬇️ Descargar PDF
            </a>
          </div>
        `;
      } else {
        contentHTML = `
          <div style="margin-top: 15px; padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center;">
            <p style="font-size: 48px; margin-bottom: 10px;">📄</p>
            <p style="color: #666; margin-bottom: 15px;">Documento listo para descargar</p>
            <a href="${material.archivo_url}" download style="display: inline-block; padding: 12px 25px; background: #6b0f0f; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              ⬇️ Descargar Documento
            </a>
          </div>
        `;
      }
    }
    
    const actionButtons = esAdmin ? `
      <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn-editar" data-id="${material.id}" style="flex: 1; min-width: 120px; padding: 8px 15px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          ✏️ Editar
        </button>
        <button class="btn-eliminar" data-id="${material.id}" style="flex: 1; min-width: 120px; padding: 8px 15px; background: #cc0000; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          🗑️ Eliminar
        </button>
      </div>
    ` : '';
    
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <span style="font-size: 24px;">${icon}</span>
        <div>
          <h3 style="color: #4a0404; margin: 0; font-size: 18px;">${material.titulo}</h3>
          <span style="font-size: 12px; color: #888;">${tipoTexto} • ${new Date(material.fecha_creacion).toLocaleDateString()}</span>
        </div>
      </div>
      ${material.descripcion ? `<p style="color: #666; margin-bottom: 10px;">${material.descripcion}</p>` : ''}
      ${contentHTML}
      ${actionButtons}
    `;
    
    materialList.appendChild(card);
    
    // Event listeners para paginación de blog
    if (material.tipo === 'blog') {
      const blogContent = card.querySelector('.blog-content');
      const btnPrev = card.querySelector('.btn-prev');
      const btnNext = card.querySelector('.btn-next');
      
      if (btnPrev && btnNext) {
        btnPrev.addEventListener('click', () => cambiarPagina(blogContent, -1));
        btnNext.addEventListener('click', () => cambiarPagina(blogContent, 1));
      }
    }
    
    // Event listeners para botones de editar/eliminar
    if (esAdmin) {
      const btnEditar = card.querySelector('.btn-editar');
      const btnEliminar = card.querySelector('.btn-eliminar');
      
      if (btnEditar) {
        btnEditar.addEventListener('click', () => editarMaterial(material.id));
      }
      
      if (btnEliminar) {
        btnEliminar.addEventListener('click', () => eliminarMaterial(material.id, material.titulo));
      }
    }
  });
  
  // Controles de paginación
  if (totalPaginas > 1) {
    const paginationDiv = document.createElement('div');
    paginationDiv.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 30px; padding: 20px; flex-wrap: wrap;';
    
    paginationDiv.innerHTML = `
      <button id="btnPaginaAnterior" ${paginaActual === 1 ? 'disabled' : ''} style="padding: 10px 20px; background: ${paginaActual === 1 ? '#ccc' : '#6b0f0f'}; color: white; border: none; border-radius: 6px; cursor: ${paginaActual === 1 ? 'not-allowed' : 'pointer'}; font-weight: 600;">
        ← Anterior
      </button>
      
      <div style="display: flex; gap: 5px;">
        ${Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => `
          <button class="btn-numero-pagina" data-pagina="${p}" style="width: 40px; height: 40px; background: ${p === paginaActual ? '#6b0f0f' : 'white'}; color: ${p === paginaActual ? 'white' : '#4a0404'}; border: 2px solid #6b0f0f; border-radius: 6px; cursor: pointer; font-weight: 600;">
            ${p}
          </button>
        `).join('')}
      </div>
      
      <button id="btnPaginaSiguiente" ${paginaActual === totalPaginas ? 'disabled' : ''} style="padding: 10px 20px; background: ${paginaActual === totalPaginas ? '#ccc' : '#6b0f0f'}; color: white; border: none; border-radius: 6px; cursor: ${paginaActual === totalPaginas ? 'not-allowed' : 'pointer'}; font-weight: 600;">
        Siguiente →
      </button>
    `;
    
    materialList.appendChild(paginationDiv);
    
    document.getElementById('btnPaginaAnterior').addEventListener('click', () => {
      if (paginaActual > 1) {
        paginaActual--;
        renderizarMaterialesPagina();
        document.getElementById('sec-material').scrollIntoView({ behavior: 'smooth' });
      }
    });
    
    document.getElementById('btnPaginaSiguiente').addEventListener('click', () => {
      if (paginaActual < totalPaginas) {
        paginaActual++;
        renderizarMaterialesPagina();
        document.getElementById('sec-material').scrollIntoView({ behavior: 'smooth' });
      }
    });
    
    document.querySelectorAll('.btn-numero-pagina').forEach(btn => {
      btn.addEventListener('click', () => {
        const nuevaPagina = parseInt(btn.dataset.pagina);
        if (nuevaPagina !== paginaActual) {
          paginaActual = nuevaPagina;
          renderizarMaterialesPagina();
          document.getElementById('sec-material').scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
  
  const contadorDiv = document.createElement('div');
  contadorDiv.style.cssText = 'text-align: center; color: #666; margin-top: 15px; font-size: 14px;';
  contadorDiv.textContent = `Mostrando ${inicio + 1} - ${Math.min(fin, todosLosMateriales.length)} de ${todosLosMateriales.length} materiales`;
  materialList.appendChild(contadorDiv);
}

// Función para obtener el contenido de una página específica
function getPaginaContenido(texto, pagina, palabrasPorPagina) {
  const palabras = texto.split(' ');
  const inicio = (pagina - 1) * palabrasPorPagina;
  const fin = inicio + palabrasPorPagina;
  return palabras.slice(inicio, fin).join(' ');
}

// Función para cambiar de página en el blog
function cambiarPagina(blogContent, direccion) {
  const paginaActual = parseInt(blogContent.dataset.pagina);
  const totalPaginas = parseInt(blogContent.dataset.total);
  const nuevaPagina = paginaActual + direccion;
  
  if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
  
  const materialId = blogContent.dataset.id;
  supabaseClient
    .from('material_apoyo')
    .select('contenido')
    .eq('id', materialId)
    .single()
    .then(({ data }) => {
      const palabrasPorPagina = 200;
      const blogText = blogContent.querySelector('.blog-text');
      blogText.textContent = getPaginaContenido(data.contenido, nuevaPagina, palabrasPorPagina);
      
      blogContent.dataset.pagina = nuevaPagina;
      
      const btnPrev = blogContent.querySelector('.btn-prev');
      const btnNext = blogContent.querySelector('.btn-next');
      const pageInfo = blogContent.querySelector('.pagination span');
      
      btnPrev.disabled = nuevaPagina === 1;
      btnNext.disabled = nuevaPagina === totalPaginas;
      pageInfo.textContent = `Página ${nuevaPagina} de ${totalPaginas}`;
    });
}

// Función para eliminar material (con modal personalizado)
async function eliminarMaterial(id, titulo) {
  const confirmado = await showConfirm(
    'Confirmar Eliminación',
    `¿Estás seguro de que deseas eliminar "<strong>${titulo}</strong>"?<br><br>Esta acción no se puede deshacer.`
  );
  
  if (!confirmado) return;
  
  try {
    const { data: material, error: fetchError } = await supabaseClient
      .from('material_apoyo')
      .select('archivo_url, tipo')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (material.archivo_url && (material.tipo === 'documento' || material.tipo === 'video' || material.tipo === 'imagen')) {
      const urlParts = material.archivo_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error: storageError } = await supabaseClient.storage
        .from('material-apoyo')
        .remove([fileName]);
      
      if (storageError) {
        console.warn('Error eliminando archivo del storage:', storageError);
      }
    }
    
    const { error: deleteError } = await supabaseClient
      .from('material_apoyo')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    await showAlert('¡Eliminado!', 'El material se ha eliminado correctamente', 'success');
    cargarMateriales();
    
  } catch (error) {
    console.error('Error:', error);
    await showAlert('Error', 'Error al eliminar el material: ' + error.message, 'error');
  }
}

// Función para editar material
async function editarMaterial(id) {
  try {
    const { data: material, error } = await supabaseClient
      .from('material_apoyo')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
        <h2 style="color: #4a0404; margin-bottom: 20px;">Editar Material</h2>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo:</label>
          <select id="editTipo" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            <option value="documento" ${material.tipo === 'documento' ? 'selected' : ''}>Documento</option>
            <option value="video" ${material.tipo === 'video' ? 'selected' : ''}>Video</option>
            <option value="imagen" ${material.tipo === 'imagen' ? 'selected' : ''}>Imagen</option>
            <option value="blog" ${material.tipo === 'blog' ? 'selected' : ''}>Blog</option>
          </select>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Título:</label>
          <input type="text" id="editTitulo" value="${material.titulo}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Descripción:</label>
          <textarea id="editDescripcion" rows="2" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">${material.descripcion || ''}</textarea>
        </div>
        
        <div id="editArchivoField" style="margin-bottom: 15px; ${material.tipo === 'blog' ? 'display: none;' : ''}">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Archivo (dejar vacío para mantener el actual):</label>
          <input type="file" id="editArchivo" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
          ${material.archivo_url ? `<p style="font-size: 12px; color: #666; margin-top: 5px;">Archivo actual: <a href="${material.archivo_url}" target="_blank">Ver archivo</a></p>` : ''}
        </div>
        
        <div id="editContenidoField" style="margin-bottom: 15px; ${material.tipo === 'blog' ? '' : 'display: none;'}">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Contenido del Blog:</label>
          <textarea id="editContenido" rows="10" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit;">${material.contenido || ''}</textarea>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button id="btnGuardarEdicion" style="flex: 1; padding: 12px; background: #6b0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            Guardar Cambios
          </button>
          <button id="btnCancelarEdicion" style="flex: 1; padding: 12px; background: #888; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            Cancelar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('editTipo').addEventListener('change', function() {
      const tipo = this.value;
      const archivoField = document.getElementById('editArchivoField');
      const contenidoField = document.getElementById('editContenidoField');
      
      if (tipo === 'blog') {
        archivoField.style.display = 'none';
        contenidoField.style.display = 'block';
      } else {
        archivoField.style.display = 'block';
        contenidoField.style.display = 'none';
      }
    });
    
    document.getElementById('btnCancelarEdicion').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('btnGuardarEdicion').addEventListener('click', async () => {
      await guardarEdicion(id, material);
      document.body.removeChild(modal);
    });
    
  } catch (error) {
    console.error('Error:', error);
    await showAlert('Error', 'Error al cargar el material para editar: ' + error.message, 'error');
  }
}

// Función para guardar los cambios de edición
async function guardarEdicion(id, materialOriginal) {
  const tipo = document.getElementById('editTipo').value;
  const titulo = document.getElementById('editTitulo').value.trim();
  const descripcion = document.getElementById('editDescripcion').value.trim();
  const archivo = document.getElementById('editArchivo').files[0];
  const contenido = document.getElementById('editContenido').value.trim();
  
  if (!titulo) {
    await showAlert('Campo Requerido', 'Por favor ingresa un título', 'warning');
    return;
  }
  
  if (tipo === 'blog' && !contenido) {
    await showAlert('Campo Requerido', 'Por favor ingresa el contenido del blog', 'warning');
    return;
  }
  
  const btnGuardar = document.getElementById('btnGuardarEdicion');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  
  try {
    let archivoUrl = materialOriginal.archivo_url;
    
    if (archivo && (tipo === 'documento' || tipo === 'video' || tipo === 'imagen')) {
      if (materialOriginal.archivo_url) {
        const urlParts = materialOriginal.archivo_url.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        
        await supabaseClient.storage
          .from('material-apoyo')
          .remove([oldFileName]);
      }
      
      const fileName = `${Date.now()}_${archivo.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('material-apoyo')
        .upload(fileName, archivo);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabaseClient.storage
        .from('material-apoyo')
        .getPublicUrl(fileName);
      
      archivoUrl = urlData.publicUrl;
    }
    
    const updateData = {
      tipo: tipo,
      titulo: titulo,
      descripcion: descripcion,
      contenido: tipo === 'blog' ? contenido : null,
      archivo_url: (tipo === 'documento' || tipo === 'video' || tipo === 'imagen') ? archivoUrl : null
    };
    
    const { error: updateError } = await supabaseClient
      .from('material_apoyo')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    await showAlert('¡Actualizado!', 'El material se ha actualizado correctamente', 'success');
    cargarMateriales();
    
  } catch (error) {
    console.error('Error:', error);
    await showAlert('Error', 'Error al actualizar el material: ' + error.message, 'error');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar Cambios';
  }
}

// Inicializar cuando el dashboard esté listo
document.addEventListener('DOMContentLoaded', () => {
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  if (usuario && usuario.nivel_acceso === 'administrador') {
    document.getElementById('uploadSection').style.display = 'block';
  }
  
  cargarMateriales();
});
