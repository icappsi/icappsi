// Sistema de modales personalizados con diseño institucional

// Función para mostrar modal de confirmación
function showConfirm(titulo, mensaje) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      padding: 20px;
      animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 450px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
        overflow: hidden;
      ">
        <!-- Header con color institucional -->
        <div style="
          background: linear-gradient(135deg, #4a0404 0%, #6b0f0f 100%);
          padding: 20px;
          color: white;
        ">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700;">${titulo}</h3>
        </div>
        
        <!-- Contenido -->
        <div style="padding: 25px;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">${mensaje}</p>
        </div>
        
        <!-- Botones -->
        <div style="
          padding: 15px 25px;
          background: #f9f9f9;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          border-top: 1px solid #e0e0e0;
        ">
          <button id="modalCancelar" style="
            padding: 10px 25px;
            background: #888;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          ">Cancelar</button>
          <button id="modalConfirmar" style="
            padding: 10px 25px;
            background: #cc0000;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          ">Confirmar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('modalCancelar').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });
    
    document.getElementById('modalConfirmar').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true);
    });
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    });
  });
}

// Función para mostrar modal de alerta/información
function showAlert(titulo, mensaje, tipo = 'info') {
  return new Promise((resolve) => {
    const colores = {
      info: { bg: '#6b0f0f', icon: 'ℹ️' },
      success: { bg: '#28a745', icon: '✅' },
      warning: { bg: '#ffc107', icon: '⚠️' },
      error: { bg: '#cc0000', icon: '❌' }
    };
    
    const color = colores[tipo] || colores.info;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      padding: 20px;
      animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 450px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
        overflow: hidden;
      ">
        <!-- Header con color según tipo -->
        <div style="
          background: ${color.bg};
          padding: 20px;
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <span style="font-size: 24px;">${color.icon}</span>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700;">${titulo}</h3>
        </div>
        
        <!-- Contenido -->
        <div style="padding: 25px;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">${mensaje}</p>
        </div>
        
        <!-- Botón -->
        <div style="
          padding: 15px 25px;
          background: #f9f9f9;
          display: flex;
          justify-content: center;
          border-top: 1px solid #e0e0e0;
        ">
          <button id="modalAceptar" style="
            padding: 10px 40px;
            background: ${color.bg};
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          ">Aceptar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listener
    document.getElementById('modalAceptar').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve();
    });
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve();
      }
    });
  });
}

// Agregar animaciones CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideIn {
    from {
      transform: translateY(-50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
