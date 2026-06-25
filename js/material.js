// Mostrar/ocultar campos según el tipo de material
document.getElementById('materialTipo').addEventListener('change', function() {
  const tipo = this.value;
  const archivoField = document.getElementById('archivoField');
  const contenidoField = document.getElementById('contenidoField');
  
  if (tipo === 'blog') {
    archivoField.style.display = 'none';
    contenidoField.style.display = 'block';
  } else {
    archivoField.style.display = 'block';
    contenidoField.style.display = 'none';
  }
});

// Subir material
document.getElementById('btnSubirMaterial').addEventListener('click', async () => {
  const tipo = document.getElementById('materialTipo').value;
  const titulo = document.getElementById('materialTitulo').value.trim();
  const descripcion = document.getElementById('materialDescripcion').value.trim();
  const archivo = document.getElementById('materialArchivo').files[0];
  const contenido = document.getElementById('materialContenido').value.trim();
  
  if (!titulo) {
    alert('Por favor ingresa un título');
    return;
  }
  
  if ((tipo === 'documento' || tipo === 'video') && !archivo) {
    alert('Por favor selecciona un archivo');
    return;
  }
  
  if (tipo === 'blog' && !contenido) {
    alert('Por favor ingresa el contenido del blog');
    return;
  }
  
  const btnSubir = document.getElementById('btnSubirMaterial');
  btnSubir.disabled = true;
  btnSubir.textContent = 'Publicando...';
  
  try {
    let archivoUrl = null;
    
    // Si es documento o video, subir el archivo primero
    if (tipo === 'documento' || tipo === 'video') {
      const fileName = `${Date.now()}_${archivo.name}`;
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('material-apoyo')
        .upload(fileName, archivo);
      
      if (uploadError) throw uploadError;
      
      // Obtener URL pública del archivo
      const { data: urlData } = supabaseClient.storage
        .from('material-apoyo')
        .getPublicUrl(fileName);
      
      archivoUrl = urlData.publicUrl;
    }
    
    // Guardar en la base de datos
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    
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
    
    // Limpiar formulario
    document.getElementById('materialTitulo').value = '';
    document.getElementById('materialDescripcion').value = '';
    document.getElementById('materialArchivo').value = '';
    document.getElementById('materialContenido').value = '';
    
    alert('Material publicado exitosamente');
    cargarMateriales(); // Recargar la lista
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al publicar el material: ' + error.message);
  } finally {
    btnSubir.disabled = false;
    btnSubir.textContent = 'Publicar Material';
  }
});

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
    
    materialList.innerHTML = '';
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    const esAdmin = usuario && usuario.nivel_acceso === 'administrador';
    
    materiales.forEach((material, index) => {
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
      }
      
      let contentHTML = '';
      
      if (material.tipo === 'blog') {
        // Para blogs, mostrar contenido con paginación
        const contenidoCompleto = material.contenido || '';
        const palabras = contenidoCompleto.split(' ');
        const palabrasPorPagina = 200;
        const totalPaginas = Math.ceil(palabras.length / palabrasPorPagina);
        
        contentHTML = `
          <div class="blog-content" data-id="${material.id}" data-pagina="1" data-total="${totalPaginas}">
            <div class="blog-text">${getPaginaContenido(contenidoCompleto, 1, palabrasPorPagina)}</div>
            ${totalPaginas > 1 ? `
              <div class="pagination" style="margin-top: 15px; text-align: center;">
                <button class="btn-prev" disabled style="padding: 8px 15px; margin: 0 5px; background: #6b0f0f; color: white; border: none; border-radius: 4px; cursor: pointer;">Anterior</button>
                <span style="margin: 0 10px;">Página 1 de ${totalPaginas}</span>
                <button class="btn-next" style="padding: 8px 15px; margin: 0 5px; background: #6b0f0f; color: white; border: none; border-radius: 4px; cursor: pointer;">Siguiente</button>
              </div>
            ` : ''}
          </div>
        `;
      } else {
        // Para documentos/videos, mostrar enlace
        contentHTML = `
          <a href="${material.archivo_url}" target="_blank" style="display: inline-block; padding: 10px 20px; background: #6b0f0f; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px;">
            Ver ${tipoTexto}
          </a>
        `;
      }
      
      // Botones de acción solo para administradores
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
      
      // Agregar event listeners para paginación si es blog
      if (material.tipo === 'blog') {
        const blogContent = card.querySelector('.blog-content');
        const btnPrev = card.querySelector('.btn-prev');
        const btnNext = card.querySelector('.btn-next');
        
        if (btnPrev && btnNext) {
          btnPrev.addEventListener('click', () => cambiarPagina(blogContent, -1));
          btnNext.addEventListener('click', () => cambiarPagina(blogContent, 1));
        }
      }
      
      // Agregar event listeners para botones de editar/eliminar
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
    
  } catch (error) {
    console.error('Error cargando materiales:', error);
    materialList.innerHTML = '<p style="text-align: center; color: #c33; padding: 40px;">Error al cargar los materiales.</p>';
  }
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
  
  // Obtener el contenido completo del material
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
      
      // Actualizar botones
      const btnPrev = blogContent.querySelector('.btn-prev');
      const btnNext = blogContent.querySelector('.btn-next');
      const pageInfo = blogContent.querySelector('.pagination span');
      
      btnPrev.disabled = nuevaPagina === 1;
      btnNext.disabled = nuevaPagina === totalPaginas;
      pageInfo.textContent = `Página ${nuevaPagina} de ${totalPaginas}`;
    });
}

// Función para eliminar material
async function eliminarMaterial(id, titulo) {
  if (!confirm(`¿Estás seguro de que deseas eliminar "${titulo}"? Esta acción no se puede deshacer.`)) {
    return;
  }
  
  try {
    // Primero obtener el material para saber si tiene archivo
    const { data: material, error: fetchError } = await supabaseClient
      .from('material_apoyo')
      .select('archivo_url, tipo')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Si tiene archivo, eliminarlo del storage
    if (material.archivo_url && (material.tipo === 'documento' || material.tipo === 'video')) {
      // Extraer el nombre del archivo de la URL
      const urlParts = material.archivo_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error: storageError } = await supabaseClient.storage
        .from('material-apoyo')
        .remove([fileName]);
      
      if (storageError) {
        console.warn('Error eliminando archivo del storage:', storageError);
        // Continuar aunque falle la eliminación del archivo
      }
    }
    
    // Eliminar el registro de la base de datos
    const { error: deleteError } = await supabaseClient
      .from('material_apoyo')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    alert('Material eliminado exitosamente');
    cargarMateriales(); // Recargar la lista
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al eliminar el material: ' + error.message);
  }
}

// Función para editar material
async function editarMaterial(id) {
  try {
    // Obtener los datos actuales del material
    const { data: material, error } = await supabaseClient
      .from('material_apoyo')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Crear modal de edición
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
    
    // Event listener para cambiar campos según tipo
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
    
    // Event listener para cancelar
    document.getElementById('btnCancelarEdicion').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Event listener para guardar
    document.getElementById('btnGuardarEdicion').addEventListener('click', async () => {
      await guardarEdicion(id, material);
      document.body.removeChild(modal);
    });
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar el material para editar: ' + error.message);
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
    alert('Por favor ingresa un título');
    return;
  }
  
  if (tipo === 'blog' && !contenido) {
    alert('Por favor ingresa el contenido del blog');
    return;
  }
  
  const btnGuardar = document.getElementById('btnGuardarEdicion');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  
  try {
    let archivoUrl = materialOriginal.archivo_url; // Mantener el archivo actual por defecto
    
    // Si se seleccionó un nuevo archivo y el tipo es documento/video
    if (archivo && (tipo === 'documento' || tipo === 'video')) {
      // Eliminar el archivo anterior si existe
      if (materialOriginal.archivo_url) {
        const urlParts = materialOriginal.archivo_url.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        
        await supabaseClient.storage
          .from('material-apoyo')
          .remove([oldFileName]);
      }
      
      // Subir el nuevo archivo
      const fileName = `${Date.now()}_${archivo.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('material-apoyo')
        .upload(fileName, archivo);
      
      if (uploadError) throw uploadError;
      
      // Obtener URL pública del nuevo archivo
      const { data: urlData } = supabaseClient.storage
        .from('material-apoyo')
        .getPublicUrl(fileName);
      
      archivoUrl = urlData.publicUrl;
    }
    
    // Actualizar en la base de datos
    const updateData = {
      tipo: tipo,
      titulo: titulo,
      descripcion: descripcion,
      contenido: tipo === 'blog' ? contenido : null,
      archivo_url: (tipo === 'documento' || tipo === 'video') ? archivoUrl : null
    };
    
    const { error: updateError } = await supabaseClient
      .from('material_apoyo')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    alert('Material actualizado exitosamente');
    cargarMateriales(); // Recargar la lista
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al actualizar el material: ' + error.message);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar Cambios';
  }
}

// Inicializar cuando el dashboard esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Mostrar sección de subida solo para administradores
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  if (usuario && usuario.nivel_acceso === 'administrador') {
    document.getElementById('uploadSection').style.display = 'block';
  }
  
  // Cargar materiales
  cargarMateriales();
});
