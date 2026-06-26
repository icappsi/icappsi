// ============================================
// GESTIÓN DE USUARIOS - COMPLETO
// ============================================

let todosLosUsuarios = [];
let usuariosFiltrados = [];
let paginaActual = 1;
const usuariosPorPagina = 10;
let usuarioEditandoId = null;
let usuarioEliminandoId = null;
let fotoUrlActual = null;

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
  if (usuario.nivel_acceso !== 'administrador') {
    alert('Acceso denegado. Solo administradores pueden gestionar usuarios.');
    window.location.href = '../index.html';
    return;
  }
  
  configurarEventos();
  cargarUsuarios();
});

// ============================================
// 2. CONFIGURACIÓN DE EVENTOS
// ============================================

function configurarEventos() {
  document.getElementById('buscarUsuario').addEventListener('input', (e) => {
    filtrarUsuarios(e.target.value);
  });
  
  document.getElementById('btnNuevoUsuario').addEventListener('click', () => {
    abrirModalUsuario();
  });
  
  document.getElementById('btnRefrescar').addEventListener('click', () => {
    cargarUsuarios();
  });
  
  document.getElementById('btnGuardarUsuario').addEventListener('click', guardarUsuario);
  
  document.getElementById('btnCancelarUsuario').addEventListener('click', () => {
    document.getElementById('modalUsuario').style.display = 'none';
  });
  
  document.getElementById('btnConfirmarEliminar').addEventListener('click', confirmarEliminar);
  
  document.getElementById('btnCancelarEliminar').addEventListener('click', () => {
    document.getElementById('modalEliminar').style.display = 'none';
  });
  
  // Cerrar modales al hacer clic fuera
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });
  
  // Preview de foto
  document.getElementById('usuarioFoto').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById('fotoPreview').src = event.target.result;
        document.getElementById('fotoPreviewContainer').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
}

// ============================================
// 3. CARGAR USUARIOS
// ============================================

async function cargarUsuarios() {
  const tbody = document.getElementById('tablaUsuariosBody');
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:#888;">Cargando usuarios...</td></tr>';
  
  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .order('creado_en', { ascending: false });
    
    if (error) throw error;
    
    todosLosUsuarios = data || [];
    actualizarEstadisticas();
    filtrarUsuarios(document.getElementById('buscarUsuario').value);
    
  } catch (error) {
    console.error('Error:', error);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#c33;">Error al cargar usuarios: ${error.message}</td></tr>`;
  }
}

function actualizarEstadisticas() {
  document.getElementById('statTotal').textContent = todosLosUsuarios.length;
  document.getElementById('statAdmins').textContent = todosLosUsuarios.filter(u => u.nivel_acceso === 'administrador').length;
  document.getElementById('statUsuarios').textContent = todosLosUsuarios.filter(u => u.nivel_acceso === 'usuario').length;
}

// ============================================
// 4. FILTRAR Y RENDERIZAR
// ============================================

function filtrarUsuarios(filtro) {
  const filtroLower = filtro.toLowerCase().trim();
  
  usuariosFiltrados = todosLosUsuarios.filter(u => {
    if (!filtroLower) return true;
    const texto = `${u.cedula} ${u.primer_nombre} ${u.primer_apellido} ${u.numero_expediente || ''}`.toLowerCase();
    return texto.includes(filtroLower);
  });
  
  paginaActual = 1;
  renderizarTabla();
}

function renderizarTabla() {
  const tbody = document.getElementById('tablaUsuariosBody');
  const total = usuariosFiltrados.length;
  const totalPaginas = Math.ceil(total / usuariosPorPagina);
  const inicio = (paginaActual - 1) * usuariosPorPagina;
  const fin = Math.min(inicio + usuariosPorPagina, total);
  const pagina = usuariosFiltrados.slice(inicio, fin);
  
  document.getElementById('contadorUsuarios').textContent = 
    `Mostrando ${total > 0 ? inicio + 1 : 0} - ${fin} de ${total} usuarios`;
  
  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:#888;">No se encontraron usuarios</td></tr>';
    document.getElementById('paginacionUsuarios').innerHTML = '';
    return;
  }
  
  tbody.innerHTML = '';
  
  pagina.forEach(u => {
    const tr = document.createElement('tr');
    const fechaCreacion = u.creado_en ? new Date(u.creado_en).toLocaleString('es-VE') : 'N/A';
    const badgeNivel = u.nivel_acceso === 'administrador' 
      ? '<span class="badge badge-admin">Admin</span>' 
      : '<span class="badge badge-usuario">Usuario</span>';
    
    const fotoHTML = u.foto_url 
      ? `<img src="${u.foto_url}" class="foto-mini" alt="Foto">`
      : `<div class="foto-mini" style="display:flex; align-items:center; justify-content:center; font-size:16px;">👤</div>`;
    
    const causaCorta = u.causa_sancion 
      ? (u.causa_sancion.length > 30 ? u.causa_sancion.substring(0, 30) + '...' : u.causa_sancion)
      : '<span style="color:#888;">-</span>';
    
    const expediente = u.numero_expediente || '<span style="color:#888;">-</span>';
    
    tr.innerHTML = `
      <td>${fotoHTML}</td>
      <td><strong>${u.cedula}</strong></td>
      <td>${u.primer_nombre} ${u.primer_apellido}</td>
      <td>${u.jerarquia || '<span style="color:#888;">-</span>'}</td>
      <td>${badgeNivel}</td>
      <td>${expediente}</td>
      <td title="${u.causa_sancion || ''}">${causaCorta}</td>
      <td style="font-size: 12px; color: #666;">${fechaCreacion}</td>
      <td>
        <div style="display: flex; gap: 5px;">
          <button class="btn btn-info btn-editar" data-id="${u.id}" style="padding: 6px 10px; font-size: 12px;">✏️</button>
          <button class="btn btn-danger btn-eliminar" data-id="${u.id}" data-nombre="${u.primer_nombre} ${u.primer_apellido}" style="padding: 6px 10px; font-size: 12px;">🗑️</button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
    
    tr.querySelector('.btn-editar').addEventListener('click', () => abrirModalUsuario(u.id));
    tr.querySelector('.btn-eliminar').addEventListener('click', () => {
      usuarioEliminandoId = u.id;
      document.getElementById('mensajeEliminar').innerHTML = `
        ¿Estás seguro de eliminar al usuario <strong>${u.primer_nombre} ${u.primer_apellido}</strong> (Cédula: ${u.cedula})?<br><br>
        <span style="color:#dc3545;">⚠️ Esta acción no se puede deshacer.</span>
      `;
      document.getElementById('modalEliminar').style.display = 'flex';
    });
  });
  
  renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(totalPaginas) {
  const div = document.getElementById('paginacionUsuarios');
  div.innerHTML = '';
  
  if (totalPaginas <= 1) return;
  
  // Botón anterior
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
  
  // Números de página
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
  
  // Botón siguiente
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

// ============================================
// 5. CREAR/EDITAR USUARIO
// ============================================

function abrirModalUsuario(usuarioId = null) {
  const modal = document.getElementById('modalUsuario');
  const titulo = document.getElementById('modalUsuarioTitulo');
  
  // Limpiar formulario
  document.getElementById('usuarioCedula').value = '';
  document.getElementById('usuarioExpediente').value = '';
  document.getElementById('usuarioNombre').value = '';
  document.getElementById('usuarioApellido').value = '';
  document.getElementById('usuarioJerarquia').value = '';
  document.getElementById('usuarioNivel').value = 'usuario';
  document.getElementById('usuarioCausaSancion').value = '';
  document.getElementById('usuarioFoto').value = '';
  document.getElementById('fotoPreviewContainer').style.display = 'none';
  fotoUrlActual = null;
  
  if (usuarioId) {
    // Modo edición
    const usuario = todosLosUsuarios.find(u => u.id === usuarioId);
    if (!usuario) return;
    
    usuarioEditandoId = usuarioId;
    titulo.textContent = 'Editar Usuario';
    
    document.getElementById('usuarioCedula').value = usuario.cedula || '';
    document.getElementById('usuarioExpediente').value = usuario.numero_expediente || '';
    document.getElementById('usuarioNombre').value = usuario.primer_nombre || '';
    document.getElementById('usuarioApellido').value = usuario.primer_apellido || '';
    document.getElementById('usuarioJerarquia').value = usuario.jerarquia || '';
    document.getElementById('usuarioNivel').value = usuario.nivel_acceso || 'usuario';
    document.getElementById('usuarioCausaSancion').value = usuario.causa_sancion || '';
    
    if (usuario.foto_url) {
      fotoUrlActual = usuario.foto_url;
      document.getElementById('fotoPreview').src = usuario.foto_url;
      document.getElementById('fotoPreviewContainer').style.display = 'block';
    }
    
    // La cédula no se puede cambiar al editar
    document.getElementById('usuarioCedula').disabled = true;
    document.getElementById('usuarioCedula').style.background = '#f0f0f0';
    
  } else {
    // Modo crear
    usuarioEditandoId = null;
    titulo.textContent = 'Nuevo Usuario';
    document.getElementById('usuarioCedula').disabled = false;
    document.getElementById('usuarioCedula').style.background = 'white';
  }
  
  modal.style.display = 'flex';
}

async function guardarUsuario() {
  const cedula = document.getElementById('usuarioCedula').value.trim();
  const expediente = document.getElementById('usuarioExpediente').value.trim();
  const nombre = document.getElementById('usuarioNombre').value.trim();
  const apellido = document.getElementById('usuarioApellido').value.trim();
  const jerarquia = document.getElementById('usuarioJerarquia').value.trim();
  const nivel = document.getElementById('usuarioNivel').value;
  const causaSancion = document.getElementById('usuarioCausaSancion').value.trim();
  const fotoFile = document.getElementById('usuarioFoto').files[0];
  
  // Validaciones
  if (!cedula || !nombre || !apellido) {
    alert('Por favor completa los campos obligatorios: Cédula, Nombre y Apellido');
    return;
  }
  
  // Validar que la cédula sea numérica
  if (!/^\d+$/.test(cedula)) {
    alert('La cédula debe contener solo números');
    return;
  }
  
  const btnGuardar = document.getElementById('btnGuardarUsuario');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  
  try {
    let fotoUrl = fotoUrlActual;
    
    // Si hay nueva foto, subirla
    if (fotoFile) {
      const fileName = `usuario_${cedula}_${Date.now()}_${fotoFile.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('fotos-usuarios')
        .upload(fileName, fotoFile, { upsert: true });
      
      if (uploadError) {
        console.error('Error subiendo foto:', uploadError);
        throw new Error('Error al subir la foto: ' + uploadError.message);
      }
      
      const { data: urlData } = supabaseClient.storage
        .from('fotos-usuarios')
        .getPublicUrl(fileName);
      
      fotoUrl = urlData.publicUrl;
    }
    
    const datosUsuario = {
      cedula: cedula,
      primer_nombre: nombre,
      primer_apellido: apellido,
      jerarquia: jerarquia || null,
      nivel_acceso: nivel,
      numero_expediente: expediente || null,
      causa_sancion: causaSancion || null,
      foto_url: fotoUrl
    };
    
    let error;
    
    if (usuarioEditandoId) {
      // Actualizar
      ({ error } = await supabaseClient
        .from('usuarios')
        .update(datosUsuario)
        .eq('id', usuarioEditandoId));
    } else {
      // Verificar que no exista la cédula
      const { data: existente } = await supabaseClient
        .from('usuarios')
        .select('id')
        .eq('cedula', cedula)
        .maybeSingle();
      
      if (existente) {
        alert('Ya existe un usuario con esa cédula');
        btnGuardar.disabled = false;
        btnGuardar.textContent = '💾 Guardar';
        return;
      }
      
      // Crear
      ({ error } = await supabaseClient
        .from('usuarios')
        .insert(datosUsuario));
    }
    
    if (error) throw error;
    
    document.getElementById('modalUsuario').style.display = 'none';
    alert(usuarioEditandoId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
    cargarUsuarios();
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
  }
}

// ============================================
// 6. ELIMINAR USUARIO
// ============================================

async function confirmarEliminar() {
  if (!usuarioEliminandoId) return;
  
  const btnConfirmar = document.getElementById('btnConfirmarEliminar');
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Eliminando...';
  
  try {
    // Eliminar foto del storage si existe
    const usuario = todosLosUsuarios.find(u => u.id === usuarioEliminandoId);
    if (usuario && usuario.foto_url) {
      try {
        const urlParts = usuario.foto_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await supabaseClient.storage.from('fotos-usuarios').remove([fileName]);
      } catch (e) {
        console.warn('No se pudo eliminar la foto:', e);
      }
    }
    
    // Eliminar usuario
    const { error } = await supabaseClient
      .from('usuarios')
      .delete()
      .eq('id', usuarioEliminandoId);
    
    if (error) throw error;
    
    document.getElementById('modalEliminar').style.display = 'none';
    alert('Usuario eliminado correctamente');
    cargarUsuarios();
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al eliminar: ' + error.message);
  } finally {
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = '🗑️ Sí, Eliminar';
    usuarioEliminandoId = null;
  }
}
