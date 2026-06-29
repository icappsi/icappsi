// ============================================
// GESTIÓN DE USUARIOS - COMPLETO Y CORREGIDO
// ============================================

let todosLosUsuarios = [];
let usuariosFiltrados = [];
let paginaActual = 1;
const usuariosPorPagina = 10;
let usuarioEditandoId = null;
let usuarioEliminandoId = null;
let fotoUrlActual = null;
let usuariosSeleccionados = new Set();

// 🆕 Variables para la cámara
let streamCamara = null;
let fotoCapturadaData = null;
let modoCamaraActual = 'user'; // 'user' = frontal, 'environment' = trasera

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
    document.body.innerHTML = '';
    return;
  }
  
  configurarEventos();
  cargarUsuarios();
});

// ============================================
// 2. CONFIGURACIÓN DE EVENTOS
// ============================================

function configurarEventos() {
  const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuario'));
  
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
  
  const btnSeleccionarTodos = document.getElementById('btnSeleccionarTodos');
  if (btnSeleccionarTodos) {
    btnSeleccionarTodos.addEventListener('click', seleccionarTodosUsuarios);
  }
  
  const btnDeseleccionarTodos = document.getElementById('btnDeseleccionarTodos');
  if (btnDeseleccionarTodos) {
    btnDeseleccionarTodos.addEventListener('click', deseleccionarTodosUsuarios);
  }
  
  const btnEliminarSeleccionados = document.getElementById('btnEliminarSeleccionados');
  if (btnEliminarSeleccionados) {
    btnEliminarSeleccionados.addEventListener('click', eliminarSeleccionados);
  }
  
  const btnCancelarSeleccion = document.getElementById('btnCancelarSeleccion');
  if (btnCancelarSeleccion) {
    btnCancelarSeleccion.addEventListener('click', cancelarSeleccion);
  }
  
  const btnEliminarTodos = document.getElementById('btnEliminarTodos');
  if (btnEliminarTodos) {
    btnEliminarTodos.addEventListener('click', eliminarTodosUsuarios);
  }
  
  const inputCedula = document.getElementById('usuarioCedula');
  inputCedula.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value.length > 8) {
      e.target.value = e.target.value.slice(0, 8);
    }
  });
  
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
  
  // 🆕 NUEVO: Botones de cámara (con verificación de existencia)
  const btnAbrirCamara = document.getElementById('btnAbrirCamara');
  if (btnAbrirCamara) {
    btnAbrirCamara.addEventListener('click', () => abrirCamara('user'));
  }
  
  const btnCambiarCamara = document.getElementById('btnCambiarCamara');
  if (btnCambiarCamara) {
    btnCambiarCamara.addEventListener('click', cambiarCamara);
  }
  
  const btnCapturar = document.getElementById('btnCapturar');
  if (btnCapturar) {
    btnCapturar.addEventListener('click', capturarFoto);
  }
  
  const btnNuevaFoto = document.getElementById('btnNuevaFoto');
  if (btnNuevaFoto) {
    btnNuevaFoto.addEventListener('click', tomarOtraFoto);
  }
  
  const btnUsarFoto = document.getElementById('btnUsarFoto');
  if (btnUsarFoto) {
    btnUsarFoto.addEventListener('click', usarFotoCapturada);
  }
  
  const btnCerrarCamara = document.getElementById('btnCerrarCamara');
  if (btnCerrarCamara) {
    btnCerrarCamara.addEventListener('click', cerrarCamara);
  }
  
  const btnQuitarFoto = document.getElementById('btnQuitarFoto');
  if (btnQuitarFoto) {
    btnQuitarFoto.addEventListener('click', () => {
      document.getElementById('fotoPreviewContainer').style.display = 'none';
      document.getElementById('fotoPreview').src = '';
      fotoUrlActual = null;
      document.getElementById('usuarioFoto').value = '';
    });
  }
  
  const checkboxSuperAdmin = document.getElementById('usuarioEsSuperAdmin');
  if (checkboxSuperAdmin) {
    checkboxSuperAdmin.addEventListener('change', (e) => {
      const passwordContainer = document.getElementById('passwordContainer');
      const passwordLabel = document.getElementById('passwordLabel');
      
      if (e.target.checked) {
        document.getElementById('usuarioNivel').value = 'administrador';
        passwordContainer.style.display = 'block';
        passwordLabel.innerHTML = '🔑 Contraseña de Super Administrador: *';
        passwordLabel.style.color = '#d4af37';
      } else {
        const nivel = document.getElementById('usuarioNivel').value;
        if (nivel !== 'administrador') {
          passwordContainer.style.display = 'none';
          passwordLabel.innerHTML = 'Contraseña de Administrador: *';
          passwordLabel.style.color = '#4a0404';
        }
      }
    });
  }
  
  const selectNivel = document.getElementById('usuarioNivel');
  if (selectNivel) {
    selectNivel.addEventListener('change', (e) => {
      const passwordContainer = document.getElementById('passwordContainer');
      const passwordLabel = document.getElementById('passwordLabel');
      const checkboxSuperAdmin = document.getElementById('usuarioEsSuperAdmin');
      
      if (e.target.value === 'administrador') {
        passwordContainer.style.display = 'block';
        passwordLabel.innerHTML = '🔐 Contraseña de Administrador: *';
        passwordLabel.style.color = '#4a0404';
      } else {
        if (!checkboxSuperAdmin || !checkboxSuperAdmin.checked) {
          passwordContainer.style.display = 'none';
        }
      }
    });
  }
  
  const btnVerEliminados = document.getElementById('btnVerEliminados');
  if (btnVerEliminados) {
    if (usuarioLogueado.es_super_admin) {
      btnVerEliminados.style.display = 'inline-block';
      btnVerEliminados.addEventListener('click', () => {
        window.open('usuarios_eliminados.html', '_blank');
      });
    }
  }
}

// ============================================
// 3. CARGAR USUARIOS
// ============================================

async function cargarUsuarios() {
  const tbody = document.getElementById('tablaUsuariosBody');
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#888;">Cargando usuarios...</td></tr>';
  
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
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:#c33;">Error al cargar usuarios: ${error.message}</td></tr>`;
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
  
  const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuario'));
  
  document.getElementById('contadorUsuarios').textContent = 
    `Mostrando ${total > 0 ? inicio + 1 : 0} - ${fin} de ${total} usuarios`;
  
  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#888;">No se encontraron usuarios</td></tr>';
    document.getElementById('paginacionUsuarios').innerHTML = '';
    return;
  }
  
  tbody.innerHTML = '';
  
  pagina.forEach(u => {
    const tr = document.createElement('tr');
    const fechaCreacion = u.creado_en ? new Date(u.creado_en).toLocaleString('es-VE') : 'N/A';
    let badgeNivel;
    if (u.es_super_admin) {
      badgeNivel = '<span class="badge badge-superadmin">⭐ Super Admin</span>';
    } else if (u.nivel_acceso === 'administrador') {
      badgeNivel = '<span class="badge badge-admin">Admin</span>';
    } else {
      badgeNivel = '<span class="badge badge-usuario">Usuario</span>';
    }
    
    let fotoHTML;
    if (u.foto_url) {
      fotoHTML = `<img src="${u.foto_url}" class="foto-mini" alt="Foto" data-foto-url="${u.foto_url}" data-nombre="${u.primer_nombre} ${u.primer_apellido}" title="Click para ampliar">`;
    } else {
      fotoHTML = `<div class="foto-placeholder">👤</div>`;
    }
    
    const causaCorta = u.causa_sancion 
      ? (u.causa_sancion.length > 30 ? u.causa_sancion.substring(0, 30) + '...' : u.causa_sancion)
      : '<span style="color:#888;">-</span>';
    
    const causaTooltip = u.causa_sancion ? `data-full="${u.causa_sancion.replace(/"/g, '&quot;')}"` : '';
    const causaClass = u.causa_sancion ? 'causa-tooltip' : '';
    
    const expediente = u.numero_expediente || '<span style="color:#888;">-</span>';
    
    let puedeEditar = false;
    let puedeEliminar = false;
    let puedeSeleccionar = false;
    
    if (usuarioLogueado.es_super_admin) {
      puedeEditar = true;
      puedeEliminar = true;
      puedeSeleccionar = true;
    } else {
      if (u.nivel_acceso === 'usuario') {
        puedeEditar = true;
        puedeEliminar = true;
        puedeSeleccionar = true;
      }
    }
    
    let checkboxHTML = '';
    if (puedeSeleccionar) {
      const isChecked = usuariosSeleccionados.has(u.id) ? 'checked' : '';
      checkboxHTML = `<input type="checkbox" class="checkbox-usuario" data-id="${u.id}" ${isChecked} style="width: 18px; height: 18px; cursor: pointer;">`;
    }
    
    let botonesHTML = '<div style="display: flex; gap: 5px;">';
    
    if (puedeEditar) {
      botonesHTML += `<button class="btn btn-info btn-editar" data-id="${u.id}" style="padding: 6px 10px; font-size: 12px;">✏️</button>`;
    }
    
    if (puedeEliminar) {
      botonesHTML += `<button class="btn btn-danger btn-eliminar" data-id="${u.id}" data-nombre="${u.primer_nombre} ${u.primer_apellido}" style="padding: 6px 10px; font-size: 12px;">🗑️</button>`;
    }
    
    botonesHTML += '</div>';
    
    tr.innerHTML = `
      <td>${checkboxHTML}</td>
      <td>${fotoHTML}</td>
      <td><strong>${u.cedula}</strong></td>
      <td>${u.primer_nombre} ${u.primer_apellido}</td>
      <td>${u.jerarquia || '<span style="color:#888;">-</span>'}</td>
      <td>${badgeNivel}</td>
      <td style="font-size: 12px; font-family: monospace;">${expediente}</td>
      <td class="${causaClass}" ${causaTooltip}>${causaCorta}</td>
      <td style="font-size: 12px; color: #666;">${fechaCreacion}</td>
      <td>${botonesHTML}</td>
    `;
    
    tbody.appendChild(tr);
    
    const checkbox = tr.querySelector('.checkbox-usuario');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          usuariosSeleccionados.add(u.id);
        } else {
          usuariosSeleccionados.delete(u.id);
        }
        actualizarContadorSeleccionados();
      });
    }
    
    const fotoImg = tr.querySelector('.foto-mini');
    if (fotoImg) {
      fotoImg.addEventListener('click', () => {
        abrirLightbox(fotoImg.dataset.fotoUrl, fotoImg.dataset.nombre);
      });
    }
    
    const btnEditar = tr.querySelector('.btn-editar');
    if (btnEditar) {
      btnEditar.addEventListener('click', () => abrirModalUsuario(u.id));
    }
    
    const btnEliminar = tr.querySelector('.btn-eliminar');
    if (btnEliminar) {
      btnEliminar.addEventListener('click', () => {
        usuarioEliminandoId = u.id;
        document.getElementById('mensajeEliminar').innerHTML = `
          ¿Estás seguro de eliminar al usuario <strong>${u.primer_nombre} ${u.primer_apellido}</strong> (Cédula: ${u.cedula})?<br><br>
          <span style="color:#dc3545;">⚠️ Esta acción no se puede deshacer.</span>
        `;
        document.getElementById('modalEliminar').style.display = 'flex';
      });
    }
  });
  
  renderizarPaginacion(totalPaginas);
  actualizarContadorSeleccionados();
}

// ============================================
// 5. LIGHTBOX PARA FOTO GRANDE
// ============================================

function abrirLightbox(fotoUrl, nombre) {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox-overlay';
  lightbox.innerHTML = `
    <button class="lightbox-close" title="Cerrar">×</button>
    <img src="${fotoUrl}" class="lightbox-content" alt="${nombre}">
    <div class="lightbox-info">${nombre}</div>
  `;
  
  document.body.appendChild(lightbox);
  
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
      document.body.removeChild(lightbox);
    }
  });
  
  const cerrarConEsc = (e) => {
    if (e.key === 'Escape') {
      if (document.body.contains(lightbox)) {
        document.body.removeChild(lightbox);
      }
      document.removeEventListener('keydown', cerrarConEsc);
    }
  };
  document.addEventListener('keydown', cerrarConEsc);
}

// ============================================
// 6. PAGINACIÓN
// ============================================

function renderizarPaginacion(totalPaginas) {
  const div = document.getElementById('paginacionUsuarios');
  div.innerHTML = '';
  
  if (totalPaginas <= 1) return;
  
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
// 7. CREAR/EDITAR USUARIO
// ============================================

async function abrirModalUsuario(usuarioId = null) {
  const modal = document.getElementById('modalUsuario');
  const titulo = document.getElementById('modalUsuarioTitulo');
  const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuario'));
  
  document.getElementById('usuarioCedula').value = '';
  document.getElementById('usuarioExpediente').value = '';
  document.getElementById('usuarioNombre').value = '';
  document.getElementById('usuarioApellido').value = '';
  document.getElementById('usuarioJerarquia').value = '';
  document.getElementById('usuarioNivel').value = 'usuario';
  document.getElementById('usuarioCausaSancion').value = '';
  document.getElementById('usuarioFoto').value = '';
  document.getElementById('fotoPreviewContainer').style.display = 'none';
  document.getElementById('passwordContainer').style.display = 'none';
  document.getElementById('usuarioPassword').value = '';
  document.getElementById('superAdminContainer').style.display = 'none';
  document.getElementById('usuarioEsSuperAdmin').checked = false;
  fotoUrlActual = null;
  
  const selectNivel = document.getElementById('usuarioNivel');
  
  if (usuarioLogueado.es_super_admin) {
    selectNivel.innerHTML = `
      <option value="usuario">Usuario</option>
      <option value="administrador">Administrador</option>
    `;
    selectNivel.disabled = false;
    document.getElementById('superAdminContainer').style.display = 'block';
  } else {
    selectNivel.innerHTML = `
      <option value="usuario">Usuario</option>
    `;
    selectNivel.disabled = false;
  }
  
  if (usuarioId) {
    const usuario = todosLosUsuarios.find(u => u.id === usuarioId);
    if (!usuario) return;
    
    usuarioEditandoId = usuarioId;
    titulo.textContent = 'Editar Usuario';
    
    document.getElementById('usuarioCedula').value = usuario.cedula || '';
    document.getElementById('usuarioExpediente').value = usuario.numero_expediente || '';
    document.getElementById('usuarioNombre').value = usuario.primer_nombre || '';
    document.getElementById('usuarioApellido').value = usuario.primer_apellido || '';
    document.getElementById('usuarioJerarquia').value = usuario.jerarquia || '';
    document.getElementById('usuarioCausaSancion').value = usuario.causa_sancion || '';
    
    if (!usuarioLogueado.es_super_admin && usuario.nivel_acceso === 'administrador') {
      alert('⚠️ Solo el Super Administrador puede editar otros administradores');
      return;
    }
    
    if (usuarioLogueado.es_super_admin) {
      selectNivel.value = usuario.nivel_acceso || 'usuario';
      selectNivel.disabled = false;
      
      if (usuario.es_super_admin) {
        document.getElementById('usuarioEsSuperAdmin').checked = true;
      }
    } else {
      selectNivel.value = 'usuario';
      selectNivel.innerHTML = '<option value="usuario">Usuario</option>';
    }
    
    if (usuario.foto_url) {
      fotoUrlActual = usuario.foto_url;
      document.getElementById('fotoPreview').src = usuario.foto_url;
      document.getElementById('fotoPreviewContainer').style.display = 'block';
    }
    
    if (usuario.nivel_acceso === 'administrador') {
      document.getElementById('passwordContainer').style.display = 'block';
      document.getElementById('passwordLabel').textContent = 'Nueva Contraseña (dejar vacío para mantener la actual):';
    }
    
    document.getElementById('usuarioCedula').disabled = true;
    
  } else {
    usuarioEditandoId = null;
    titulo.textContent = 'Nuevo Usuario';
    document.getElementById('usuarioCedula').disabled = false;
    
    const siguienteNumero = await generarSiguienteExpediente();
    document.getElementById('usuarioExpediente').value = siguienteNumero;
  }
  
  modal.style.display = 'flex';
}

// ============================================
// 8. GUARDAR USUARIO (CON LOGS)
// ============================================

async function guardarUsuario() {
  const cedula = document.getElementById('usuarioCedula').value.trim();
  const expediente = document.getElementById('usuarioExpediente').value.trim();
  const nombre = document.getElementById('usuarioNombre').value.trim();
  const apellido = document.getElementById('usuarioApellido').value.trim();
  const jerarquia = document.getElementById('usuarioJerarquia').value;
  const nivel = document.getElementById('usuarioNivel').value;
  const causaSancion = document.getElementById('usuarioCausaSancion').value.trim();
  const fotoFile = document.getElementById('usuarioFoto').files[0];
  const password = document.getElementById('usuarioPassword').value;
  const esSuperAdmin = document.getElementById('usuarioEsSuperAdmin').checked;
  
  const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuario'));
  
  if (!cedula) {
    alert('⚠️ La cédula es obligatoria');
    return;
  }
  
  if (!nombre) {
    alert('⚠️ El nombre es obligatorio');
    return;
  }
  
  if (!apellido) {
    alert('⚠️ El apellido es obligatorio');
    return;
  }
  
  if (!jerarquia) {
    alert('⚠️ Debes seleccionar una jerarquía');
    return;
  }
  
  if (!expediente) {
    alert('⚠️ El número de expediente es obligatorio');
    return;
  }
  
  if (!causaSancion) {
    alert('⚠️ La causa de sanción es obligatoria');
    return;
  }
  
  if (!/^\d{7,8}$/.test(cedula)) {
    alert('La cédula debe contener entre 7 y 8 dígitos numéricos');
    return;
  }
  
  if (nivel === 'administrador' && !usuarioLogueado.es_super_admin) {
    alert('⚠️ Solo el Super Administrador puede crear administradores');
    return;
  }
  
  if (nivel === 'administrador' && !usuarioEditandoId && !password) {
    alert('🔐 Los administradores DEBEN tener una contraseña');
    return;
  }
  
  if (password && password.length < 8) {
    alert('🔐 La contraseña debe tener al menos 8 caracteres');
    return;
  }
  
  if (esSuperAdmin && !usuarioLogueado.es_super_admin) {
    alert('⚠️ Solo el Super Administrador puede crear otros Super Administradores');
    return;
  }
  
  const btnGuardar = document.getElementById('btnGuardarUsuario');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  
  try {
    let fotoUrl = fotoUrlActual;
    let passwordHash = null;
    
    if (fotoFile) {
      const fileName = `usuario_${cedula}_${Date.now()}_${fotoFile.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('fotos-usuarios')
        .upload(fileName, fotoFile, { upsert: true });
      
      if (uploadError) throw new Error('Error al subir la foto: ' + uploadError.message);
      
      const { data: urlData } = supabaseClient.storage
        .from('fotos-usuarios')
        .getPublicUrl(fileName);
      
      fotoUrl = urlData.publicUrl;
    }
    
    if (password) {
      passwordHash = await generarHash(password);
    }
    
    const datosUsuario = {
      cedula: cedula,
      primer_nombre: nombre,
      primer_apellido: apellido,
      jerarquia: jerarquia,
      nivel_acceso: nivel,
      numero_expediente: expediente,
      causa_sancion: causaSancion,
      foto_url: fotoUrl,
      es_super_admin: esSuperAdmin && nivel === 'administrador'
    };
    
    if (nivel === 'administrador') {
      if (passwordHash) {
        datosUsuario.password_hash = passwordHash;
      }
    } else {
      datosUsuario.password_hash = null;
      datosUsuario.es_super_admin = false;
    }
    
    let error;
    
    if (usuarioEditandoId) {
      ({ error } = await supabaseClient
        .from('usuarios')
        .update(datosUsuario)
        .eq('id', usuarioEditandoId));
    } else {
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
      
      ({ error } = await supabaseClient
        .from('usuarios')
        .insert(datosUsuario));
    }
    
    if (error) throw error;
    
    // 🆕 REGISTRAR LOG DE CREAR/EDITAR USUARIO
    if (typeof registrarLog === 'function') {
      const accionLog = usuarioEditandoId ? 'Editar usuario' : 'Crear usuario';
      await registrarLog({
        accion: accionLog,
        modulo: 'Usuarios',
        descripcion: `${accionLog}: ${nombre} ${apellido} (Cédula: ${cedula})`,
        detalles: {
          cedula: cedula,
          nombre_completo: `${nombre} ${apellido}`,
          nivel: nivel,
          jerarquia: jerarquia,
          expediente: expediente,
          es_super_admin: esSuperAdmin,
          tiene_foto: !!fotoUrl,
          es_edicion: !!usuarioEditandoId
        }
      });
    }
    
    document.getElementById('modalUsuario').style.display = 'none';
    
    if (!usuarioEditandoId && nivel === 'administrador' && password) {
      let mensaje = `✅ Administrador creado correctamente\n\n🔐 Contraseña: ${password}`;
      if (esSuperAdmin) {
        mensaje += `\n\n🔑 Este usuario es Super Administrador`;
      }
      mensaje += `\n\n⚠️ IMPORTANTE: Guarda esta contraseña en un lugar seguro.`;
      alert(mensaje);
    } else {
      alert(usuarioEditandoId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
    }
    
    cargarUsuarios();
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
  }
}

async function generarSiguienteExpediente() {
  const añoActual = new Date().getFullYear().toString().slice(-2);
  
  let maxNumero = 0;
  todosLosUsuarios.forEach(u => {
    if (u.numero_expediente) {
      const match = u.numero_expediente.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumero) maxNumero = num;
      }
    }
  });
  
  const siguienteNum = (maxNumero + 1).toString().padStart(4, '0');
  return `ID-ZU-CPNB-${siguienteNum}-${añoActual}`;
}

// ============================================
// 9. ELIMINAR USUARIO (INDIVIDUAL CON LOG)
// ============================================

async function confirmarEliminar() {
  if (!usuarioEliminandoId) return;
  
  const btnConfirmar = document.getElementById('btnConfirmarEliminar');
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Eliminando...';
  
  try {
    const usuario = todosLosUsuarios.find(u => u.id === usuarioEliminandoId);
    const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuario'));
    
    if (usuario) {
      await supabaseClient.from('usuarios_eliminados').insert({
        usuario_id_original: usuario.id,
        cedula: usuario.cedula,
        primer_nombre: usuario.primer_nombre,
        primer_apellido: usuario.primer_apellido,
        jerarquia: usuario.jerarquia,
        nivel_acceso: usuario.nivel_acceso,
        numero_expediente: usuario.numero_expediente,
        causa_sancion: usuario.causa_sancion,
        foto_url: usuario.foto_url,
        password_hash: usuario.password_hash,
        es_super_admin: usuario.es_super_admin,
        eliminado_por: usuarioLogueado.id,
        razon_eliminacion: 'Eliminación individual por administrador'
      });
    }
    
    if (usuario && usuario.foto_url) {
      try {
        const urlParts = usuario.foto_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await supabaseClient.storage.from('fotos-usuarios').remove([fileName]);
      } catch (e) {
        console.warn('No se pudo eliminar la foto:', e);
      }
    }
    
    const { error } = await supabaseClient
      .from('usuarios')
      .delete()
      .eq('id', usuarioEliminandoId);
    
    if (error) {
      console.error('Error al eliminar:', error);
      throw error;
    }
    
    // 🆕 REGISTRAR LOG DE ELIMINAR USUARIO
    if (typeof registrarLog === 'function' && usuario) {
      await registrarLog({
        accion: 'Eliminar usuario',
        modulo: 'Usuarios',
        descripcion: `Usuario eliminado: ${usuario.primer_nombre} ${usuario.primer_apellido} (Cédula: ${usuario.cedula})`,
        detalles: {
          cedula: usuario.cedula,
          nombre_completo: `${usuario.primer_nombre} ${usuario.primer_apellido}`,
          nivel: usuario.nivel_acceso,
          jerarquia: usuario.jerarquia,
          expediente: usuario.numero_expediente,
          es_super_admin: usuario.es_super_admin,
          tipo_eliminacion: 'Individual'
        }
      });
    }
    
    document.getElementById('modalEliminar').style.display = 'none';
    alert('✅ Usuario eliminado correctamente y guardado en el respaldo');
    
    await cargarUsuarios();
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al eliminar: ' + error.message);
  } finally {
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = '🗑️ Sí, Eliminar';
    usuarioEliminandoId = null;
  }
}

// ============================================
// 10. FUNCIONES DE SELECCIÓN MASIVA (CON LOGS)
// ============================================

function seleccionarTodosUsuarios() {
  const checkboxes = document.querySelectorAll('.checkbox-usuario');
  checkboxes.forEach(cb => {
    cb.checked = true;
    usuariosSeleccionados.add(cb.dataset.id);
  });
  actualizarContadorSeleccionados();
}

function deseleccionarTodosUsuarios() {
  const checkboxes = document.querySelectorAll('.checkbox-usuario');
  checkboxes.forEach(cb => {
    cb.checked = false;
  });
  usuariosSeleccionados.clear();
  actualizarContadorSeleccionados();
}

function cancelarSeleccion() {
  deseleccionarTodosUsuarios();
}

function actualizarContadorSeleccionados() {
  const contador = document.getElementById('contadorSeleccionados');
  const accionesMasivas = document.getElementById('accionesMasivas');
  
  if (contador && accionesMasivas) {
    if (usuariosSeleccionados.size > 0) {
      contador.textContent = usuariosSeleccionados.size;
      accionesMasivas.style.display = 'block';
    } else {
      accionesMasivas.style.display = 'none';
    }
  }
}

async function eliminarSeleccionados() {
  if (usuariosSeleccionados.size === 0) {
    alert('No hay usuarios seleccionados');
    return;
  }
  
  const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuario'));
  
  const usuariosAEliminar = todosLosUsuarios.filter(u => 
    usuariosSeleccionados.has(u.id) && u.nivel_acceso === 'usuario'
  );
  
  if (usuariosAEliminar.length === 0) {
    alert('No se pueden eliminar administradores en grupo. Solo se pueden eliminar usuarios normales.');
    return;
  }
  
  const confirmado = confirm(`¿Estás seguro de eliminar ${usuariosAEliminar.length} usuarios seleccionados?\n\nEsta acción no se puede deshacer.\nLos usuarios serán guardados en el respaldo.`);
  
  if (!confirmado) return;
  
  const btnEliminar = document.getElementById('btnEliminarSeleccionados');
  btnEliminar.disabled = true;
  btnEliminar.textContent = 'Eliminando...';
  
  try {
    for (const usuario of usuariosAEliminar) {
      await supabaseClient.from('usuarios_eliminados').insert({
        usuario_id_original: usuario.id,
        cedula: usuario.cedula,
        primer_nombre: usuario.primer_nombre,
        primer_apellido: usuario.primer_apellido,
        jerarquia: usuario.jerarquia,
        nivel_acceso: usuario.nivel_acceso,
        numero_expediente: usuario.numero_expediente,
        causa_sancion: usuario.causa_sancion,
        foto_url: usuario.foto_url,
        password_hash: usuario.password_hash,
        es_super_admin: usuario.es_super_admin,
        eliminado_por: usuarioLogueado.id,
        razon_eliminacion: 'Eliminación masiva por administrador'
      });
      
      if (usuario.foto_url) {
        try {
          const urlParts = usuario.foto_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          await supabaseClient.storage.from('fotos-usuarios').remove([fileName]);
        } catch (e) {
          console.warn('No se pudo eliminar la foto:', e);
        }
      }
      
      await supabaseClient.from('usuarios').delete().eq('id', usuario.id);
    }
    
    // 🆕 REGISTRAR LOG DE ELIMINACIÓN MASIVA SELECCIONADA
    if (typeof registrarLog === 'function') {
      await registrarLog({
        accion: 'Eliminar usuarios masivamente',
        modulo: 'Usuarios',
        descripcion: `Se eliminaron ${usuariosAEliminar.length} usuarios seleccionados`,
        detalles: {
          cantidad: usuariosAEliminar.length,
          cedulas: usuariosAEliminar.map(u => u.cedula),
          nombres: usuariosAEliminar.map(u => `${u.primer_nombre} ${u.primer_apellido}`),
          tipo_eliminacion: 'Masiva seleccionada'
        }
      });
    }
    
    alert(`✅ ${usuariosAEliminar.length} usuarios eliminados correctamente`);
    usuariosSeleccionados.clear();
    await cargarUsuarios();
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al eliminar usuarios: ' + error.message);
  } finally {
    btnEliminar.disabled = false;
    btnEliminar.textContent = '🗑️ Eliminar Seleccionados';
  }
}

async function eliminarTodosUsuarios() {
  const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuario'));
  
  const usuariosNormales = todosLosUsuarios.filter(u => u.nivel_acceso === 'usuario');
  
  if (usuariosNormales.length === 0) {
    alert('No hay usuarios normales para eliminar');
    return;
  }
  
  const confirmado = confirm(`⚠️ ¿Estás seguro de eliminar TODOS los ${usuariosNormales.length} usuarios normales?\n\nEsta acción no se puede deshacer.\nLos usuarios serán guardados en el respaldo.\n\nLos administradores NO serán eliminados.`);
  
  if (!confirmado) return;
  
  const btnEliminar = document.getElementById('btnEliminarTodos');
  btnEliminar.disabled = true;
  btnEliminar.textContent = 'Eliminando...';
  
  try {
    for (const usuario of usuariosNormales) {
      await supabaseClient.from('usuarios_eliminados').insert({
        usuario_id_original: usuario.id,
        cedula: usuario.cedula,
        primer_nombre: usuario.primer_nombre,
        primer_apellido: usuario.primer_apellido,
        jerarquia: usuario.jerarquia,
        nivel_acceso: usuario.nivel_acceso,
        numero_expediente: usuario.numero_expediente,
        causa_sancion: usuario.causa_sancion,
        foto_url: usuario.foto_url,
        password_hash: usuario.password_hash,
        es_super_admin: usuario.es_super_admin,
        eliminado_por: usuarioLogueado.id,
        razon_eliminacion: 'Eliminación masiva de todos los usuarios'
      });
      
      if (usuario.foto_url) {
        try {
          const urlParts = usuario.foto_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          await supabaseClient.storage.from('fotos-usuarios').remove([fileName]);
        } catch (e) {
          console.warn('No se pudo eliminar la foto:', e);
        }
      }
      
      await supabaseClient.from('usuarios').delete().eq('id', usuario.id);
    }
    
    // 🆕 REGISTRAR LOG DE ELIMINACIÓN MASIVA TOTAL
    if (typeof registrarLog === 'function') {
      await registrarLog({
        accion: 'Eliminar todos los usuarios',
        modulo: 'Usuarios',
        descripcion: `Se eliminaron TODOS los ${usuariosNormales.length} usuarios normales del sistema`,
        detalles: {
          cantidad: usuariosNormales.length,
          cedulas: usuariosNormales.map(u => u.cedula),
          nombres: usuariosNormales.map(u => `${u.primer_nombre} ${u.primer_apellido}`),
          tipo_eliminacion: 'Masiva total (todos los usuarios normales)'
        }
      });
    }
    
    alert(`✅ ${usuariosNormales.length} usuarios normales eliminados correctamente`);
    usuariosSeleccionados.clear();
    await cargarUsuarios();
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al eliminar usuarios: ' + error.message);
  } finally {
    btnEliminar.disabled = false;
    btnEliminar.textContent = '⚠️ Eliminar Todos los Usuarios Normales';
  }
}

// ============================================
// 11. 🆕 FUNCIONES DE CÁMARA (FRONTAL Y TRASERA)
// ============================================

async function abrirCamara(modo = 'user') {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('❌ Tu navegador no soporta el acceso a la cámara.\n\nPor favor usa un navegador moderno como Chrome, Firefox o Edge.');
      return;
    }
    
    // Detener stream anterior si existe
    if (streamCamara) {
      streamCamara.getTracks().forEach(track => track.stop());
      streamCamara = null;
    }
    
    modoCamaraActual = modo;
    
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: modo
      }
    };
    
    streamCamara = await navigator.mediaDevices.getUserMedia(constraints);
    
    const video = document.getElementById('videoCamara');
    video.srcObject = streamCamara;
    
    document.getElementById('modalCamara').style.display = 'flex';
    document.getElementById('camaraContainer').style.display = 'block';
    document.getElementById('fotoCapturadaContainer').style.display = 'none';
    document.getElementById('btnCapturar').style.display = 'block';
    document.getElementById('btnNuevaFoto').style.display = 'none';
    document.getElementById('btnUsarFoto').style.display = 'none';
    
    fotoCapturadaData = null;
    
  } catch (error) {
    console.error('Error al acceder a la cámara:', error);
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      alert('❌ Permiso de cámara denegado.\n\nPor favor permite el acceso a la cámara en la configuración de tu navegador.');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      alert('❌ No se encontró ninguna cámara en tu dispositivo.\n\nVerifica que tu cámara esté conectada y funcionando.');
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      alert('❌ La cámara está siendo usada por otra aplicación.\n\nCierra otras aplicaciones que puedan estar usando la cámara e intenta de nuevo.');
    } else {
      alert('❌ Error al acceder a la cámara: ' + error.message);
    }
  }
}

// 🆕 NUEVA FUNCIÓN: Cambiar entre cámara frontal y trasera
function cambiarCamara() {
  const nuevoModo = modoCamaraActual === 'user' ? 'environment' : 'user';
  
  if (streamCamara) {
    streamCamara.getTracks().forEach(track => track.stop());
    streamCamara = null;
  }
  
  abrirCamara(nuevoModo);
}

function capturarFoto() {
  const video = document.getElementById('videoCamara');
  const canvas = document.getElementById('canvasCamara');
  const context = canvas.getContext('2d');
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  fotoCapturadaData = canvas.toDataURL('image/jpeg', 0.9);
  
  document.getElementById('fotoCapturada').src = fotoCapturadaData;
  document.getElementById('camaraContainer').style.display = 'none';
  document.getElementById('fotoCapturadaContainer').style.display = 'block';
  document.getElementById('btnCapturar').style.display = 'none';
  document.getElementById('btnNuevaFoto').style.display = 'block';
  document.getElementById('btnUsarFoto').style.display = 'block';
  
  if (streamCamara) {
    streamCamara.getTracks().forEach(track => track.stop());
    streamCamara = null;
  }
}

function tomarOtraFoto() {
  document.getElementById('fotoCapturadaContainer').style.display = 'none';
  document.getElementById('camaraContainer').style.display = 'block';
  document.getElementById('btnCapturar').style.display = 'block';
  document.getElementById('btnNuevaFoto').style.display = 'none';
  document.getElementById('btnUsarFoto').style.display = 'none';
  
  fotoCapturadaData = null;
  
  // Abrir cámara con el modo actual (frontal o trasera)
  abrirCamara(modoCamaraActual);
}

function usarFotoCapturada() {
  if (!fotoCapturadaData) {
    alert('❌ No hay foto capturada');
    return;
  }
  
  document.getElementById('fotoPreview').src = fotoCapturadaData;
  document.getElementById('fotoPreviewContainer').style.display = 'block';
  
  // Convertir data URL a File para que se suba como archivo
  fetch(fotoCapturadaData)
    .then(res => res.blob())
    .then(blob => {
      const file = new File([blob], `foto_capturada_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      document.getElementById('usuarioFoto').files = dataTransfer.files;
    });
  
  cerrarCamara();
}

function cerrarCamara() {
  if (streamCamara) {
    streamCamara.getTracks().forEach(track => track.stop());
    streamCamara = null;
  }
  
  document.getElementById('modalCamara').style.display = 'none';
  fotoCapturadaData = null;
}
