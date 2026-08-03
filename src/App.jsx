import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutDashboard, Users, CreditCard, LogOut, FileText, Printer, Plus, Trash2, Menu, X, ArrowLeft, CheckCircle, AlertCircle, Edit } from 'lucide-react';

export default function App() {
  const [appUser, setAppUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  
  const [loginDni, setLoginDni] = useState('');
  const [view, setView] = useState('dashboard'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  // --- CÁLCULO DE SALDO DISPONIBLE Y GANANCIAS ---
  const saldoDisponible = useMemo(() => {
    let activos = 0; let interesesPagados = 0;
    loans.forEach(l => {
      const interesPrestamo = (Number(l.amount) * 0.10 / 12) * l.months; // 10% anual fijo
      if (l.status !== 'pagado') {
        activos += Number(l.amount); // El dinero está en la calle
      } else {
        interesesPagados += interesPrestamo; // El préstamo se pagó, ganamos este interés
      }
    });
    // Todo el dinero aportado por los socios
    const totalAportes = users.filter(u => u.role === 'socio').reduce((sum, s) => sum + (Number(s.aporte) || 0), 0);
    
    // CAJA ACTUAL = Aportes Iniciales + Ganancias Ya Pagadas - Dinero Prestandose
    return totalAportes + interesesPagados - activos;
  }, [loans, users]);

  const loadData = useCallback(async () => {
    try {
      const [usersRes, loansRes] = await Promise.all([
        fetch('/api/users'), fetch('/api/loans')
      ]);
      if(usersRes.ok) setUsers(await usersRes.json());
      if(loansRes.ok) setLoans(await loansRes.json());
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const showConfirm = (message, onConfirmAction) => {
    setConfirmDialog({ isOpen: true, message, onConfirm: onConfirmAction });
  };
  const closeConfirm = () => setConfirmDialog({ isOpen: false, message: '', onConfirm: null });

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const dni = loginDni.trim();
    if (!dni) return;

    if (users.length === 0) {
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dni, name: 'Administrador Principal', role: 'admin', aporte: 0 })
        });
        showToast("Primer usuario creado. Vuelve a ingresar tu DNI.", "success");
        setLoginDni('');
        loadData();
      } catch(err) { showToast("Error creando administrador", "error"); }
    } else {
      const foundUser = users.find(u => u.dni === dni);
      if (foundUser) {
        setAppUser(foundUser);
        setView(foundUser.role === 'receptor' ? 'loans' : 'dashboard');
        showToast(`Bienvenido, ${foundUser.name}`, "success");
      } else {
        showToast("DNI no registrado.", "error");
      }
    }
  };

  const handleLogout = () => {
    setAppUser(null);
    setLoginDni('');
    setView('dashboard');
  };

  const apiRequest = async (url, options, successMsg) => {
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        if(successMsg) showToast(successMsg, "success");
        loadData();
      } else {
        showToast("Error en la operación", "error");
      }
    } catch(err) { showToast("Error de conexión", "error"); }
  };

  if (!appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
        <ToastNotification toast={toast} />
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 border border-green-100">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-green-800 mb-2">CoopFamiliar</h1>
            <p className="text-green-600 font-medium">Gestión de Préstamos</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Ingrese su DNI (Contraseña)</label>
              <input type="number" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition" placeholder="Ej. 12345678" value={loginDni} onChange={(e) => setLoginDni(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition shadow-lg">Ingresar al Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <ToastNotification toast={toast} />
      <ConfirmModal isOpen={confirmDialog.isOpen} message={confirmDialog.message} onConfirm={() => { if(confirmDialog.onConfirm) confirmDialog.onConfirm(); closeConfirm(); }} onCancel={closeConfirm} />

      {/* OVERLAY MOVIL */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity no-print" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* MENU LATERAL */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-green-900 text-white shadow-2xl flex flex-col transform transition-transform duration-300 no-print ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex justify-between border-b border-green-800">
          <h2 className="text-2xl font-bold">Menú</h2>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-green-800 rounded-lg"><X size={24} /></button>
        </div>
        <div className="px-6 py-5 bg-green-800 bg-opacity-40">
          <p className="text-sm text-green-300">Sesión activa:</p>
          <p className="font-bold text-lg mb-2">{appUser.name}</p>
          <span className="px-3 py-1 bg-green-700 text-xs font-bold rounded-full uppercase">{appUser.role}</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-3">
          {(appUser.role === 'admin' || appUser.role === 'socio') && (
            <SidebarBtn icon={<LayoutDashboard size={22} />} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} />
          )}
          {appUser.role === 'admin' && (
            <SidebarBtn icon={<Users size={22} />} label="Usuarios" active={view === 'users'} onClick={() => { setView('users'); setIsMobileMenuOpen(false); }} />
          )}
          <SidebarBtn icon={<CreditCard size={22} />} label={appUser.role === 'receptor' ? 'Mis Préstamos' : 'Préstamos'} active={view === 'loans' || view === 'schedule'} onClick={() => { setView('loans'); setSelectedLoan(null); setIsMobileMenuOpen(false); }} />
        </nav>
      </div>

      {/* CONTENIDO PRINCIPAL (Mejorado para no tapar contenido) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* ENCABEZADO SUPERIOR FIJO */}
        <header className="w-full h-16 bg-green-900 text-white shadow-md flex justify-between items-center px-4 z-30 no-print flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-green-800 rounded-lg hover:bg-green-700 transition"><Menu size={24} /></button>
            <h1 className="text-xl font-bold hidden sm:block">Cooperativa Familiar</h1>
            <h1 className="text-xl font-bold sm:hidden">CoopFam</h1>
          </div>
          <div className="flex items-center space-x-3">
             <span className="hidden sm:inline-block font-medium bg-green-800 px-3 py-1 rounded-full text-sm">{appUser.name}</span>
             <button onClick={() => showConfirm("¿Cerrar sesión?", handleLogout)} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition shadow-md"><LogOut size={18} /></button>
          </div>
        </header>

        {/* ÁREA DE SCROLL LIBRE DE SUPERPOSICIONES */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-8 relative">
          <div className="max-w-6xl mx-auto pb-10">
            {view === 'dashboard' && <DashboardView loans={loans} users={users} formatMoney={formatMoney} saldoDisponible={saldoDisponible} />}
            {view === 'users' && <UsersView users={users} apiRequest={apiRequest} showConfirm={showConfirm} />}
            {view === 'loans' && <LoansView loans={loans} users={users} appUser={appUser} formatMoney={formatMoney} onSelectLoan={(l) => { setSelectedLoan(l); setView('schedule'); }} apiRequest={apiRequest} showConfirm={showConfirm} saldoDisponible={saldoDisponible} showToast={showToast} />}
            {view === 'schedule' && selectedLoan && <ScheduleView loan={selectedLoan} users={users} formatMoney={formatMoney} onBack={() => setView('loans')} />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ================= COMPONENTES =================

function SidebarBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition ${active ? 'bg-green-600 text-white font-bold' : 'text-green-100 hover:bg-green-800'}`}>
      {icon} <span>{label}</span>
    </button>
  );
}

function ToastNotification({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-white font-bold animate-in slide-in-from-right ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />} <p>{toast.message}</p>
    </div>
  );
}

function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirmación</h3>
        <p className="text-gray-600 mb-8">{message}</p>
        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="px-5 py-2.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
          <button onClick={onConfirm} className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl">Aceptar</button>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ loans, users, formatMoney, saldoDisponible }) {
  const socios = users.filter(u => u.role === 'socio');
  const totalAportes = socios.reduce((sum, s) => sum + (Number(s.aporte) || 0), 0);
  
  const stats = useMemo(() => {
    let capitalPrestado = 0; let interesesEsperados = 0; let activos = 0; let interesesPagados = 0;
    loans.forEach(l => {
      capitalPrestado += Number(l.amount);
      const interesPrestamo = (Number(l.amount) * 0.10 / 12) * l.months; // 10% Anual
      if (l.status !== 'pagado') {
        activos += Number(l.amount);
        interesesEsperados += interesPrestamo;
      } else {
        interesesPagados += interesPrestamo;
      }
    });
    return { capitalPrestado, activos, interesesEsperados, interesesPagados, totalPrestamos: loans.length };
  }, [loans]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-white p-6 rounded-3xl border border-gray-200 shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Panel de Control</h2>
          <p className="text-gray-500 font-medium">Resumen financiero de la cooperativa</p>
        </div>
        <div className="bg-green-50 px-6 py-4 rounded-2xl border border-green-200 md:text-right shadow-inner w-full md:w-auto">
          <p className="text-sm text-green-700 font-bold uppercase tracking-wider mb-1">Saldo Disponible (Caja Libre)</p>
          <p className="text-3xl font-black text-green-800">{formatMoney(saldoDisponible)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Préstamos Emitidos" value={stats.totalPrestamos} icon={<FileText />} color="bg-blue-600" />
        <StatCard title="Total Aportado" value={formatMoney(totalAportes)} icon={<CreditCard />} color="bg-teal-600" />
        <StatCard title="Dinero Prestado" value={formatMoney(stats.activos)} icon={<LayoutDashboard />} color="bg-yellow-500" />
        <StatCard title="Ganancia Generada" value={formatMoney(stats.interesesEsperados + stats.interesesPagados)} icon={<CheckCircle />} color="bg-purple-600" />
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 mt-8">
        <div className="p-6 border-b border-gray-100"><h3 className="text-xl font-bold text-gray-800">Distribución de Socios y Ganancias (10% Anual)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50 text-gray-500 text-sm border-b">
              <th className="p-4 font-bold">Nombre del Socio</th><th className="p-4 font-bold">Aporte Inicial</th><th className="p-4 font-bold">% Participación</th><th className="p-4 font-bold text-green-700">Ganancia Acumulada</th>
            </tr></thead>
            <tbody>
              {socios.map(socio => {
                const aporte = Number(socio.aporte) || 0; 
                const porcentaje = totalAportes > 0 ? (aporte / totalAportes) : 0;
                const gananciaSocio = (stats.interesesEsperados + stats.interesesPagados) * porcentaje;
                
                return (
                  <tr key={socio.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-4 font-bold text-gray-800">{socio.name}</td>
                    <td className="p-4">{formatMoney(aporte)}</td>
                    <td className="p-4"><span className="bg-gray-200 px-2 py-1 rounded-md text-xs font-bold text-gray-600">{(porcentaje * 100).toFixed(1)}%</span></td>
                    <td className="p-4 font-black text-green-600">{formatMoney(gananciaSocio)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-5 hover:shadow-md transition">
      <div className={`p-4 rounded-2xl text-white ${color} shadow-inner`}>{icon}</div>
      <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{title}</p><p className="text-2xl font-black text-gray-800">{value}</p></div>
    </div>
  );
}

function UsersView({ users, apiRequest, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null); // Nuevo estado para saber si estamos editando
  const [formData, setFormData] = useState({ dni: '', name: '', role: 'receptor', aporte: 0 });

  const handleEditClick = (user) => {
    setFormData({ dni: user.dni, name: user.name, role: user.role, aporte: user.aporte });
    setEditId(user.id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({ dni: '', name: '', role: 'receptor', aporte: 0 });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, aporte: formData.role === 'socio' ? Number(formData.aporte) : 0 };
    
    if (editId) {
      // Editar
      apiRequest(`/api/users/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, "Usuario actualizado exitosamente");
    } else {
      // Crear
      apiRequest('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, "Usuario registrado exitosamente");
    }
    
    handleCancelForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-extrabold text-gray-900">Directorio de Usuarios</h2>
        <button onClick={() => showForm ? handleCancelForm() : setShowForm(true)} className={`${showForm ? 'bg-gray-500' : 'bg-green-600'} text-white px-5 py-2.5 rounded-xl font-bold flex gap-2 shadow-md transition`}><Plus size={18} /> <span className="hidden sm:inline">{showForm ? 'Cancelar' : 'Nuevo Usuario'}</span></button>
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-green-200 grid grid-cols-1 md:grid-cols-2 gap-5 animate-in slide-in-from-top-4">
          <div className="md:col-span-2 border-b border-gray-100 pb-2 mb-2">
            <h3 className="font-extrabold text-lg text-green-800 flex items-center gap-2">{editId ? <Edit size={20}/> : <Plus size={20}/>} {editId ? 'Editar Información del Usuario' : 'Registrar Nuevo Usuario'}</h3>
          </div>
          <div><label className="block text-sm font-bold mb-1.5 text-gray-700">DNI (Usado como Contraseña)</label><input required type="number" className="w-full px-4 py-3 border border-gray-300 focus:border-green-500 rounded-xl outline-none" value={formData.dni} onChange={e=>setFormData({...formData, dni: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Nombre Completo</label><input required className="w-full px-4 py-3 border border-gray-300 focus:border-green-500 rounded-xl outline-none" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Rol en la Cooperativa</label><select className="w-full px-4 py-3 border border-gray-300 focus:border-green-500 rounded-xl outline-none" value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})}><option value="receptor">Receptor (Pide préstamos)</option><option value="socio">Socio (Presta y Gana)</option><option value="admin">Administrador (Control Total)</option></select></div>
          {formData.role === 'socio' && <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Aporte Inicial (S/)</label><input required type="number" className="w-full px-4 py-3 border border-gray-300 focus:border-green-500 rounded-xl outline-none" value={formData.aporte} onChange={e=>setFormData({...formData, aporte: e.target.value})} /></div>}
          <div className="md:col-span-2 text-right mt-2"><button type="submit" className="bg-green-900 hover:bg-green-950 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition">{editId ? 'Actualizar Datos' : 'Guardar Usuario'}</button></div>
        </form>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="bg-gray-50 text-sm border-b border-gray-100 text-gray-500"><th className="p-5 font-bold">DNI</th><th className="p-5 font-bold">Nombre Completo</th><th className="p-5 font-bold">Rol</th><th className="p-5 font-bold text-right">Acciones</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition">
                <td className="p-5 font-medium text-gray-600">{u.dni}</td><td className="p-5 font-bold text-gray-900">{u.name}</td>
                <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'socio' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{u.role}</span></td>
                <td className="p-5 flex justify-end gap-2">
                  <button onClick={() => handleEditClick(u)} className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-sm transition">Editar</button>
                  <button onClick={() => showConfirm("¿Desea eliminar este usuario definitivamente?", () => apiRequest(`/api/users/${u.id}`, { method: 'DELETE' }, "Usuario eliminado"))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={20}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoansView({ loans, users, appUser, formatMoney, onSelectLoan, apiRequest, showConfirm, saldoDisponible, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ receptorDni: '', amount: '', months: '', startDate: new Date().toISOString().split('T')[0] });

  const receptores = users.filter(u => u.role === 'receptor');
  const visibleLoans = appUser.role === 'receptor' ? loans.filter(l => l.receptorDni === appUser.dni) : loans;

  const handleSubmit = (e) => {
    e.preventDefault();
    const montoSolicitado = Number(formData.amount);
    
    // --- VALIDACIÓN DE SALDO ---
    if (montoSolicitado > saldoDisponible) {
      showToast(`ALERTA: Saldo insuficiente. Solo hay ${formatMoney(saldoDisponible)} en caja.`, "error");
      return;
    }

    // El servidor siempre guardará la tasa como 10 (10% anual fijo)
    apiRequest('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...formData, amount: montoSolicitado, rate: 10, months: Number(formData.months)}) }, "Préstamo generado correctamente");
    setShowForm(false); setFormData({ receptorDni: '', amount: '', months: '', startDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-extrabold text-gray-900">{appUser.role === 'receptor' ? 'Mis Préstamos' : 'Gestión de Préstamos'}</h2>
        {appUser.role === 'admin' && <button onClick={() => setShowForm(!showForm)} className={`${showForm ? 'bg-gray-500' : 'bg-green-600'} text-white px-5 py-2.5 rounded-xl font-bold flex gap-2 shadow-md transition`}><Plus size={18} /> <span className="hidden sm:inline">{showForm ? 'Cancelar' : 'Nuevo Préstamo'}</span></button>}
      </div>
      
      {showForm && appUser.role === 'admin' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-green-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in slide-in-from-top-4">
          <div className="lg:col-span-3 mb-2 flex items-center justify-between bg-blue-50 text-blue-900 p-4 rounded-xl border border-blue-200 shadow-inner">
            <p className="font-bold flex items-center gap-2"><CheckCircle size={18}/> Sistema configurado a Interés Fijo: 10% Anual</p>
            <p className="font-extrabold">Caja Disponible: <span className="text-green-700 text-lg">{formatMoney(saldoDisponible)}</span></p>
          </div>
          <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Receptor del Préstamo</label><select required className="w-full px-4 py-3 border border-gray-300 focus:border-green-500 rounded-xl outline-none" value={formData.receptorDni} onChange={e=>setFormData({...formData, receptorDni: e.target.value})}><option value="">Seleccione a quién prestar...</option>{receptores.map(r=><option key={r.id} value={r.dni}>{r.name} ({r.dni})</option>)}</select></div>
          <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Monto (S/)</label><input required type="number" max={saldoDisponible} className="w-full px-4 py-3 border border-gray-300 focus:border-green-500 rounded-xl outline-none" placeholder={`Máx: ${saldoDisponible}`} value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Plazo (Meses)</label><input required type="number" min="1" className="w-full px-4 py-3 border border-gray-300 focus:border-green-500 rounded-xl outline-none" value={formData.months} onChange={e=>setFormData({...formData, months: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Fecha de Entrega</label><input required type="date" className="w-full px-4 py-3 border border-gray-300 focus:border-green-500 rounded-xl outline-none" value={formData.startDate} onChange={e=>setFormData({...formData, startDate: e.target.value})} /></div>
          <div className="lg:col-span-2 flex items-end justify-end"><button type="submit" className="bg-green-900 hover:bg-green-950 w-full sm:w-auto text-white px-8 py-3 rounded-xl font-bold shadow-lg transition">Generar Préstamo</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleLoans.map(l => {
          const r = users.find(u => u.dni === l.receptorDni);
          const activo = l.status !== 'pagado';
          return (
            <div key={l.id} className="bg-white rounded-3xl border border-gray-200 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                <div>
                  <p className="font-extrabold text-lg text-gray-900 leading-tight">{r ? r.name : l.receptorDni}</p>
                  <p className="text-xs font-bold text-gray-500 mt-1">DNI: {l.receptorDni}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-bold tracking-wider ${activo ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>{activo ? 'EN CURSO' : 'PAGADO'}</span>
              </div>
              <div className="p-6 flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Monto Otorgado</p>
                <p className="text-4xl font-black text-green-700">{formatMoney(l.amount)}</p>
                <div className="mt-4 flex gap-4">
                  <div className="bg-gray-100 px-3 py-2 rounded-lg"><p className="text-[10px] font-bold text-gray-500 uppercase">Plazo</p><p className="font-extrabold text-gray-800">{l.months} Meses</p></div>
                  <div className="bg-gray-100 px-3 py-2 rounded-lg"><p className="text-[10px] font-bold text-gray-500 uppercase">Tasa Anual</p><p className="font-extrabold text-gray-800">10% Fijo</p></div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
                <button onClick={() => onSelectLoan(l)} className="flex-1 bg-white border-2 border-green-200 text-green-700 font-bold py-2.5 rounded-xl hover:bg-green-50 transition">Ver Cuotas</button>
                {appUser.role === 'admin' && <button onClick={() => showConfirm(`¿Marcar este préstamo como ${activo ? 'PAGADO' : 'ACTIVO'}?`, () => apiRequest(`/api/loans/${l.id}/status`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status: activo ? 'pagado' : 'activo'}) }, "Estado Actualizado"))} className={`flex-1 font-bold py-2.5 rounded-xl transition ${activo ? 'bg-gray-800 text-white hover:bg-black' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{activo ? 'Recibir Pago' : 'Reactivar'}</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleView({ loan, users, formatMoney, onBack }) {
  const receptor = users.find(u => u.dni === loan.receptorDni);
  
  const schedule = useMemo(() => {
    // --- NUEVO CÁLCULO: INTERÉS SIMPLE / FIJO ---
    // 10% Anual dividido en los meses solicitados de forma equitativa
    const tasaAnual = 0.10; 
    const interesMensualFijo = (loan.amount * tasaAnual) / 12; 
    const principalMensualFijo = loan.amount / loan.months;
    const cuotaMensualFija = principalMensualFijo + interesMensualFijo;

    let balance = loan.amount; 
    const items = []; 
    let date = new Date(loan.startDate);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    
    for (let i = 1; i <= loan.months; i++) {
      balance -= principalMensualFijo;
      if (i === loan.months) balance = 0; // Prevenir errores de decimales en el último mes
      date.setMonth(date.getMonth() + 1);
      
      items.push({ 
        month: i, 
        date: date.toLocaleDateString('es-PE'), 
        payment: cuotaMensualFija, 
        principal: principalMensualFijo, 
        interest: interesMensualFijo, 
        balance: Math.max(0, balance) 
      });
    }
    return items;
  }, [loan]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-200 no-print">
        <button onClick={onBack} className="flex gap-2 items-center font-bold text-gray-600 hover:text-gray-900 transition px-4 py-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20}/> <span className="hidden sm:inline">Volver a Préstamos</span></button>
        <button onClick={() => window.print()} className="flex gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition"><Printer size={20}/> Imprimir PDF</button>
      </div>
      
      <div id="print-area" className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-gray-200 print:shadow-none print:border-none">
        <div className="text-center mb-8 border-b border-gray-100 pb-6">
          <h1 className="text-3xl font-black text-gray-900 mb-1">Cooperativa Familiar</h1>
          <p className="text-gray-500 font-medium">Cronograma de Pagos - Interés Simple / Cuota Fija</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 text-sm bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <div><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Receptor</p><p className="font-extrabold text-gray-900 text-base">{receptor ? receptor.name : loan.receptorDni}</p></div>
          <div><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Monto de Capital</p><p className="text-green-700 font-black text-xl">{formatMoney(loan.amount)}</p></div>
          <div><p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Condiciones</p><p className="font-bold text-gray-800 text-base">10% Anual / {loan.months} Meses</p></div>
        </div>
        
        <div className="overflow-x-auto border border-gray-200 rounded-2xl">
          <table className="w-full text-right text-sm">
            <thead><tr className="bg-gray-100 text-gray-600 border-b border-gray-200"><th className="p-4 text-center font-bold">N° Cuota</th><th className="p-4 font-bold">Fecha de Pago</th><th className="p-4 font-bold text-green-800">Cuota a Pagar</th><th className="p-4 font-bold">Interés Fijo</th><th className="p-4 font-bold">Amortización Capital</th><th className="p-4 font-bold">Saldo Pendiente</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="p-4 text-center text-gray-400">0</td><td className="p-4 text-gray-400">-</td><td className="p-4 text-gray-400">-</td><td className="p-4 text-gray-400">-</td><td className="p-4 text-gray-400">-</td><td className="p-4 font-black text-gray-900">{formatMoney(loan.amount)}</td></tr>
              {schedule.map(r => (
                <tr key={r.month} className="hover:bg-gray-50 transition"><td className="p-4 text-center font-bold text-gray-600">{r.month}</td><td className="p-4 font-medium text-gray-700">{r.date}</td><td className="p-4 font-black text-green-700 bg-green-50/30">{formatMoney(r.payment)}</td><td className="p-4 font-medium text-gray-600">{formatMoney(r.interest)}</td><td className="p-4 font-medium text-gray-600">{formatMoney(r.principal)}</td><td className="p-4 font-bold text-gray-900">{formatMoney(r.balance)}</td></tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan="2" className="p-4 font-bold text-gray-500 uppercase">Totales del Préstamo:</td>
                <td className="p-4 font-black text-green-800">{formatMoney(schedule.reduce((s, r) => s + r.payment, 0))}</td>
                <td className="p-4 font-bold text-gray-700">{formatMoney(schedule.reduce((s, r) => s + r.interest, 0))}</td>
                <td className="p-4 font-bold text-gray-700">{formatMoney(schedule.reduce((s, r) => s + r.principal, 0))}</td>
                <td className="p-4 text-gray-400 font-bold">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="mt-20 flex justify-around text-sm text-gray-500 font-bold text-center pt-8">
          <div className="w-48 border-t-2 border-gray-300 pt-3">Firma de Administración</div>
          <div className="w-48 border-t-2 border-gray-300 pt-3">Firma del Receptor</div>
        </div>
      </div>
    </div>
  );
}