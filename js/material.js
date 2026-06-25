// ============================================
// MATERIAL DE APOYO - ARCHIVO COMPLETO
// ============================================

// --- VARIABLES GLOBALES ---
let paginaActual = 1;
const materialesPorPagina = 10;
let todosLosMateriales = [];

// ============================================
// 1. CONTROL DE CAMPOS SEGÚN TIPO DE MATERIAL
// ============================================

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
    } else if (tipo === 'presentacion') {
      archivoInput.accept = '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else {
      archivoInput.accept = '*/*';
    }
  }
});

// ============================================
// 2. EDITOR DE TEXTO ENRIQUECIDO
// ============================================

// Event listeners para botones del editor
document.querySelectorAll('.editor-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    const command = this.dataset.command;
    document.execCommand(command, false, null);
    document.getElementById('blogEditor').focus();
  });
});

// Aplicar color
document.getElementById('applyColor').addEventListener('click', function(e) {
  e.preventDefault();
  const color = document.getElementById('colorPicker').value;
  document.execCommand('foreColor', false, color);
  document.getElementById('blogEditor').focus();
});

// ============================================
// 3. SUBIR MATERIAL CON CONFIRMACIÓN VISUAL
// ============================================

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
  const contenido = document.getElementById('blogEditor').innerHTML.trim();
  
  if (!titulo) {
    await showAlert('Campo Requerido', 'Por favor ingresa un título', 'warning');
    return;
  }
  
  if ((tipo === 'documento' || tipo === 'video' || tipo === 'imagen' || tipo === 'presentacion') && !archivo) {
    await showAlert('Campo Requerido', 'Por favor selecciona un archivo', 'warning');
    return;
  }
  
  if (tipo === 'blog' && (!contenido || contenido === '<div>Escribe aquí el contenido del blog...</div>')) {
    await showAlert('Campo Requerido', 'Por favor ingresa el contenido del blog', 'warning');
    return;
  }
  
  const btnSubir = document.getElementById('btnSubirMaterial');
  btnSubir.disabled = true;
  btnSubir.textContent = 'Publicando...';
  
  try {
    let archivoUrl = null;
    
    // Si es documento, video, imagen o presentacion, subir el archivo
    if (tipo === 'documento' || tipo === 'video' || tipo === 'imagen' || tipo === 'presentacion') {
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
      
      // Confirmación visual de subida exitosa
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
    
    // Confirmación final exitosa
    btnSubir.textContent = '✅ ¡Material publicado exitosamente!';
    btnSubir.style.background = '#28a745';
    
    // Limpiar formulario
    document.getElementById('materialTitulo').value = '';
    document.getElementById('materialDescripcion').value = '';
    document.getElementById('materialArchivo').value = '';
    document.getElementById('blogEditor').innerHTML = 'Escribe aquí el contenido del blog...';
    
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

// ============================================
// 4. CARGAR MATERIALES
// ============================================

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

// ============================================
// 5. RENDERIZAR MATERIALES CON PAGINACIÓN
// ============================================

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
    } else if (material.tipo === 'presentacion') {
      icon = '📊';
      tipoTexto = 'Presentación';
    }
    
    let contentHTML = '';
    
    // --- BLOG CON PAGINACIÓN VISUAL ---
    if (material.tipo === 'blog') {
      const contenidoCompleto = material.contenido || '';
      
      contentHTML = `
        <div class="blog-paginated" data-id="${material.id}" style="position: relative;">
          <div class="blog-page-container" style="
            max-height: 600px;
            overflow: hidden;
            position: relative;
            background: #fafafa;
            border-radius: 6px;
            border-left: 4px solid #6b0f0f;
            padding: 15px;
          ">
            <div class="blog-content-full" style="line-height: 1.8; text-align: justify;">
              ${contenidoCompleto}
            </div>
          </div>
          
          <div class="blog-pagination-controls" style="
            margin-top: 15px;
            text-align: center;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
          ">
            <button class="blog-btn-prev" disabled style="
              padding: 8px 15px;
              background: #ccc;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: not-allowed;
              font-weight: 600;
            ">← Anterior</button>
            
            <span class="blog-page-info" style="
              padding: 8px 15px;
              background: white;
              border: 2px solid #6b0f0f;
              border-radius: 4px;
              font-weight: 600;
              color: #4a0404;
            ">Página 1 de 1</span>
            
            <button class="blog-btn-next" style="
              padding: 8px 15px;
              background: #6b0f0f;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 600;
            ">Siguiente →</button>
          </div>
        </div>
      `;
    }
    
    // --- VIDEO CON REPRODUCTOR EMBEBIDO ---
    else if (material.tipo === 'video') {
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
    }
    
    // --- IMAGEN COMPLETA ---
    else if (material.tipo === 'imagen') {
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
    }
    
    // --- PRESENTACIÓN POWERPOINT ---
    else if (material.tipo === 'presentacion') {
      contentHTML = `
        <div style="margin-top: 15px; padding: 25px; background: linear-gradient(135deg, #f9f9f9 0%, #e9e9e9 100%); border-radius: 8px; text-align: center; border: 2px dashed #6b0f0f;">
          <p style="font-size: 64px; margin-bottom: 15px;">📊</p>
          <p style="color: #4a0404; font-size: 16px; font-weight: 600; margin-bottom: 10px;">Presentación de PowerPoint</p>
          <p style="color: #666; margin-bottom: 20px; font-size: 14px;">Haz clic para descargar y visualizar la presentación</p>
          <a href="${material.archivo_url}" download style="display: inline-block; padding: 14px 30px; background: #6b0f0f; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 10px rgba(107, 15, 15, 0.3);">
            ⬇️ Descargar Presentación
          </a>
        </div>
      `;
    }
    
    // --- DOCUMENTO (PDF u OTRO) ---
    else if (material.tipo === 'documento') {
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
    
    // --- BOTONES DE ACCIÓN (SOLO ADMIN) ---
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
    
    // Inicializar paginación visual para blogs
    if (material.tipo === 'blog') {
      const blogPaginated = card.querySelector('.blog-paginated');
      if (blogPaginated) {
        inicializarPaginacionBlog(blogPaginated);
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
  
  // --- CONTROLES DE PAGINACIÓN DE LISTA ---
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
  
  // Contador de materiales
  const contadorDiv = document.createElement('div');
  contadorDiv.style.cssText = 'text-align: center; color: #666; margin-top: 15px; font-size: 14px;';
  contadorDiv.textContent = `Mostrando ${inicio + 1} - ${Math.min(fin, todosLosMateriales.length)} de ${todosLosMateriales.length} materiales`;
  materialList.appendChild(contadorDiv);
}

// ============================================
// 6. PAGINACIÓN VISUAL PARA BLOGS
// ============================================

function inicializarPaginacionBlog(blogElement) {
  const container = blogElement.querySelector('.blog-page-container');
  const content = blogElement.querySelector('.blog-content-full');
  const btnPrev = blogElement.querySelector('.blog-btn-prev');
  const btnNext = blogElement.querySelector('.blog-btn-next');
  const pageInfo = blogElement.querySelector('.blog-page-info');
  
  const alturaPagina = 600; // Aproximadamente 30 líneas
  let paginaActual = 0;
  let totalPaginas = 1;
  
  function calcularPaginas() {
    const alturaTotal = content.scrollHeight;
    totalPaginas = Math.ceil(alturaTotal / alturaPagina);
    
    if (totalPaginas < 1) totalPaginas = 1;
    
    actualizarControles();
  }
  
  function actualizarControles() {
    pageInfo.textContent = `Página ${paginaActual + 1} de ${totalPaginas}`;
    
    btnPrev.disabled = paginaActual === 0;
    btnPrev.style.background = paginaActual === 0 ? '#ccc' : '#6b0f0f';
    btnPrev.style.cursor = paginaActual === 0 ? 'not-allowed' : 'pointer';
    
    btnNext.disabled = paginaActual === totalPaginas - 1;
    btnNext.style.background = paginaActual === totalPaginas - 1 ? '#ccc' : '#6b0f0f';
    btnNext.style.cursor = paginaActual === totalPaginas - 1 ? 'not-allowed' : 'pointer';
    
    // Ocultar controles si solo hay una página
    if (totalPaginas === 1) {
      blogElement.querySelector('.blog-pagination-controls').style.display = 'none';
    } else {
      blogElement.querySelector('.blog-pagination-controls').style.display = 'flex';
    }
  }
  
  function irAPagina(pagina) {
    if (pagina < 0 || pagina >= totalPaginas) return;
    
    paginaActual = pagina;
    const offset = pagina * alturaPagina;
    content.style.transform = `translateY(-${offset}px)`;
    content.style.transition = 'transform 0.3s ease';
    
    actualizarControles();
  }
  
  btnPrev.addEventListener('click', () => {
    if (paginaActual > 0) {
      irAPagina(paginaActual - 1);
    }
  });
  
  btnNext.addEventListener('click', () => {
    if (paginaActual < totalPaginas - 1) {
      irAPagina(paginaActual + 1);
    }
  });
  
  setTimeout(() => {
    calcularPaginas();
  }, 100);
}

// ============================================
// 7. ELIMINAR MATERIAL CON MODAL
// ============================================

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
    
    if (material.archivo_url && (material.tipo === 'documento' || material.tipo === 'video' || material.tipo === 'imagen' || material.tipo === 'presentacion')) {
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

// ============================================
// 8. EDITAR MATERIAL CON MODAL
// ============================================

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
      <div style="background: white; border-radius: 12px; padding: 30px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto;">
        <h2 style="color: #4a0404; margin-bottom: 20px;">Editar Material</h2>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo:</label>
          <select id="editTipo" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            <option value="documento" ${material.tipo === 'documento' ? 'selected' : ''}>Documento</option>
            <option value="video" ${material.tipo === 'video' ? 'selected' : ''}>Video</option>
            <option value="imagen" ${material.tipo === 'imagen' ? 'selected' : ''}>Imagen</option>
            <option value="presentacion" ${material.tipo === 'presentacion' ? 'selected' : ''}>Presentación</option>
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
          <textarea id="editContenido" rows="15" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit;">${material.contenido || ''}</textarea>
          <p style="font-size: 11px; color: #888; margin-top: 5px;">Nota: El contenido HTML se edita directamente aquí</p>
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

// ============================================
// 9. GUARDAR EDICIÓN
// ============================================

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
    
    if (archivo && (tipo === 'documento' || tipo === 'video' || tipo === 'imagen' || tipo === 'presentacion')) {
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
      archivo_url: (tipo === 'documento' || tipo === 'video' || tipo === 'imagen' || tipo === 'presentacion') ? archivoUrl : null
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

// ============================================
// 10. INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  if (usuario && usuario.nivel_acceso === 'administrador') {
    document.getElementById('uploadSection').style.display = 'block';
  }
  
  cargarMateriales();
});
