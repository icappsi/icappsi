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
