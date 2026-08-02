import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutDashboard, Users, CreditCard, LogOut, FileText, Printer, Plus, Trash2, Menu, X, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

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

  // Función para cargar datos desde nuestro nuevo servidor
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
    // Refrescar datos cada 10 segundos para simular tiempo real
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showConfirm = (message, onConfirmAction) => {
    setConfirmDialog({ isOpen: true, message, onConfirm: onConfirmAction });
  };
  const closeConfirm = () => setConfirmDialog({ isOpen: false, message: '', onConfirm: null });

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  // --- LÓGICA CON EL NUEVO BACKEND ---
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
        showToast(successMsg, "success");
        loadData();
      } else {
        showToast("Error en la operación", "error");
      }
    } catch(err) { showToast("Error de conexión", "error"); }
  };

  // --- COMPONENTES DE INTERFAZ ---

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
              <label className="block text-sm font-bold text-gray-700 mb-2">Ingrese su DNI</label>
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

      <header className="absolute top-0 left-0 w-full h-16 bg-green-900 text-white shadow-md flex justify-between items-center px-4 z-30 no-print">
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-green-800 rounded-lg hover:bg-green-700 transition"><Menu size={24} /></button>
          <h1 className="text-xl font-bold">CoopFamiliar</h1>
        </div>
        <div className="flex items-center space-x-3">
           <span className="hidden sm:inline-block font-medium">{appUser.name}</span>
           <button onClick={() => showConfirm("¿Cerrar sesión?", handleLogout)} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"><LogOut size={18} /></button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity no-print" onClick={() => setIsMobileMenuOpen(false)} />
      )}

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

      <main className="flex-1 pt-20 overflow-y-auto bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto pb-10">
          {view === 'dashboard' && <DashboardView loans={loans} users={users} formatMoney={formatMoney} />}
          {view === 'users' && <UsersView users={users} apiRequest={apiRequest} showConfirm={showConfirm} />}
          {view === 'loans' && <LoansView loans={loans} users={users} appUser={appUser} formatMoney={formatMoney} onSelectLoan={(l) => { setSelectedLoan(l); setView('schedule'); }} apiRequest={apiRequest} showConfirm={showConfirm} />}
          {view === 'schedule' && selectedLoan && <ScheduleView loan={selectedLoan} users={users} formatMoney={formatMoney} onBack={() => setView('loans')} />}
        </div>
      </main>
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
    <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white font-bold animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
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

function DashboardView({ loans, users, formatMoney }) {
  const socios = users.filter(u => u.role === 'socio');
  const totalAportes = socios.reduce((sum, s) => sum + (Number(s.aporte) || 0), 0);
  
  const stats = useMemo(() => {
    let capitalPrestado = 0; let interesesEsperados = 0; let activos = 0;
    loans.forEach(l => {
      capitalPrestado += Number(l.amount);
      if (l.status !== 'pagado') activos += Number(l.amount);
      const r = l.rate / 100;
      const cuota = r === 0 ? (l.amount / l.months) : (l.amount * r * Math.pow(1 + r, l.months)) / (Math.pow(1 + r, l.months) - 1);
      interesesEsperados += ((cuota * l.months) - l.amount);
    });
    return { capitalPrestado, activos, interesesEsperados, totalPrestamos: loans.length };
  }, [loans]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-extrabold text-gray-900">Panel de Control</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Préstamos" value={stats.totalPrestamos} icon={<FileText />} color="bg-blue-600" />
        <StatCard title="Capital Histórico" value={formatMoney(stats.capitalPrestado)} icon={<CreditCard />} color="bg-green-600" />
        <StatCard title="Capital Vigente" value={formatMoney(stats.activos)} icon={<LayoutDashboard />} color="bg-yellow-500" />
        <StatCard title="Ganancia Est." value={formatMoney(stats.interesesEsperados)} icon={<CheckCircle />} color="bg-purple-600" />
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 mt-8">
        <div className="p-5 border-b border-gray-100"><h3 className="text-xl font-bold">Ganancias de Socios</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50 text-gray-500 text-sm border-b">
              <th className="p-4 font-bold">Socio</th><th className="p-4 font-bold">Aporte</th><th className="p-4 font-bold">Participación</th><th className="p-4 font-bold text-green-700">Ganancia</th>
            </tr></thead>
            <tbody>
              {socios.map(socio => {
                const aporte = Number(socio.aporte) || 0; const porcentaje = totalAportes > 0 ? (aporte / totalAportes) : 0;
                return (
                  <tr key={socio.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4 font-bold">{socio.name}</td><td className="p-4">{formatMoney(aporte)}</td>
                    <td className="p-4">{(porcentaje * 100).toFixed(1)}%</td><td className="p-4 font-black text-green-600">{formatMoney(stats.interesesEsperados * porcentaje)}</td>
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
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-5">
      <div className={`p-4 rounded-2xl text-white ${color}`}>{icon}</div>
      <div><p className="text-xs text-gray-400 font-bold uppercase">{title}</p><p className="text-2xl font-black text-gray-800">{value}</p></div>
    </div>
  );
}

function UsersView({ users, apiRequest, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ dni: '', name: '', role: 'receptor', aporte: 0 });

  const handleSubmit = (e) => {
    e.preventDefault();
    apiRequest('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...formData, aporte: formData.role === 'socio' ? Number(formData.aporte) : 0}) }, "Usuario registrado");
    setShowForm(false); setFormData({ dni: '', name: '', role: 'receptor', aporte: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-extrabold text-gray-900">Directorio</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={18} /> <span className="hidden sm:inline">{showForm ? 'Cancelar' : 'Nuevo'}</span></button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-bold mb-1">DNI</label><input required type="number" className="w-full px-4 py-2 border rounded-xl" value={formData.dni} onChange={e=>setFormData({...formData, dni: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1">Nombre</label><input required className="w-full px-4 py-2 border rounded-xl" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1">Rol</label><select className="w-full px-4 py-2 border rounded-xl" value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})}><option value="receptor">Receptor</option><option value="socio">Socio</option><option value="admin">Admin</option></select></div>
          {formData.role === 'socio' && <div><label className="block text-sm font-bold mb-1">Aporte (S/)</label><input required type="number" className="w-full px-4 py-2 border rounded-xl" value={formData.aporte} onChange={e=>setFormData({...formData, aporte: e.target.value})} /></div>}
          <div className="md:col-span-2 text-right"><button type="submit" className="bg-green-900 text-white px-6 py-2 rounded-xl font-bold">Guardar</button></div>
        </form>
      )}
      <div className="bg-white rounded-3xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="bg-gray-50 text-sm border-b"><th className="p-4 font-bold">DNI</th><th className="p-4 font-bold">Nombre</th><th className="p-4 font-bold">Rol</th><th className="p-4"></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-50"><td className="p-4">{u.dni}</td><td className="p-4 font-bold">{u.name}</td><td className="p-4 uppercase text-xs">{u.role}</td><td className="p-4"><button onClick={() => showConfirm("¿Eliminar usuario?", () => apiRequest(`/api/users/${u.id}`, { method: 'DELETE' }, "Eliminado"))} className="text-red-500"><Trash2 size={20}/></button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoansView({ loans, users, appUser, formatMoney, onSelectLoan, apiRequest, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ receptorDni: '', amount: '', rate: '', months: '', startDate: new Date().toISOString().split('T')[0] });

  const receptores = users.filter(u => u.role === 'receptor');
  const visibleLoans = appUser.role === 'receptor' ? loans.filter(l => l.receptorDni === appUser.dni) : loans;

  const handleSubmit = (e) => {
    e.preventDefault();
    apiRequest('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...formData, amount: Number(formData.amount), rate: Number(formData.rate), months: Number(formData.months)}) }, "Préstamo creado");
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border">
        <h2 className="text-2xl font-extrabold text-gray-900">{appUser.role === 'receptor' ? 'Mis Préstamos' : 'Préstamos'}</h2>
        {appUser.role === 'admin' && <button onClick={() => setShowForm(!showForm)} className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={18} /> <span className="hidden sm:inline">Nuevo</span></button>}
      </div>
      {showForm && appUser.role === 'admin' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className="block text-sm font-bold mb-1">Receptor</label><select required className="w-full px-4 py-2 border rounded-xl" value={formData.receptorDni} onChange={e=>setFormData({...formData, receptorDni: e.target.value})}><option value="">Seleccione...</option>{receptores.map(r=><option key={r.id} value={r.dni}>{r.name}</option>)}</select></div>
          <div><label className="block text-sm font-bold mb-1">Monto</label><input required type="number" className="w-full px-4 py-2 border rounded-xl" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1">Tasa %</label><input required type="number" step="0.01" className="w-full px-4 py-2 border rounded-xl" value={formData.rate} onChange={e=>setFormData({...formData, rate: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1">Meses</label><input required type="number" className="w-full px-4 py-2 border rounded-xl" value={formData.months} onChange={e=>setFormData({...formData, months: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1">Fecha</label><input required type="date" className="w-full px-4 py-2 border rounded-xl" value={formData.startDate} onChange={e=>setFormData({...formData, startDate: e.target.value})} /></div>
          <div className="lg:col-span-3 text-right"><button type="submit" className="bg-green-900 text-white px-6 py-2 rounded-xl font-bold">Guardar</button></div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleLoans.map(l => {
          const r = users.find(u => u.dni === l.receptorDni);
          const activo = l.status !== 'pagado';
          return (
            <div key={l.id} className="bg-white rounded-3xl border flex flex-col overflow-hidden">
              <div className="p-5 border-b"><p className="font-extrabold text-lg">{r ? r.name : l.receptorDni}</p><span className={`px-2 py-1 text-xs rounded-full font-bold ${activo ? 'bg-amber-100 text-amber-700' : 'bg-gray-100'}`}>{activo ? 'ACTIVO' : 'PAGADO'}</span></div>
              <div className="p-5 flex-1"><p className="text-3xl font-black text-green-700">{formatMoney(l.amount)}</p><p className="text-sm font-bold text-gray-500 mt-2">{l.months} meses • {l.rate}%</p></div>
              <div className="p-4 bg-gray-50 flex gap-2">
                <button onClick={() => onSelectLoan(l)} className="flex-1 bg-white border border-green-200 text-green-700 font-bold py-2 rounded-xl">Cronograma</button>
                {appUser.role === 'admin' && <button onClick={() => showConfirm("¿Cambiar estado?", () => apiRequest(`/api/loans/${l.id}/status`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status: activo ? 'pagado' : 'activo'}) }, "Actualizado"))} className="flex-1 bg-gray-200 font-bold py-2 rounded-xl">{activo ? 'Pagar' : 'Reactivar'}</button>}
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
    const r = loan.rate / 100;
    const payment = r === 0 ? (loan.amount / loan.months) : (loan.amount * r * Math.pow(1 + r, loan.months)) / (Math.pow(1 + r, loan.months) - 1);
    let balance = loan.amount; const items = []; let date = new Date(loan.startDate);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    for (let i = 1; i <= loan.months; i++) {
      const interest = balance * r; const principal = payment - interest; balance -= principal;
      if (i === loan.months) balance = 0;
      date.setMonth(date.getMonth() + 1);
      items.push({ month: i, date: date.toLocaleDateString('es-PE'), payment, principal, interest, balance: Math.max(0, balance) });
    }
    return items;
  }, [loan]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between p-4 bg-white rounded-3xl border no-print">
        <button onClick={onBack} className="flex gap-2 font-bold"><ArrowLeft /> Atrás</button>
        <button onClick={() => window.print()} className="flex gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold"><Printer /> Imprimir</button>
      </div>
      <div id="print-area" className="bg-white p-8 rounded-3xl border">
        <h1 className="text-2xl font-black text-center mb-6">Cronograma de Pagos</h1>
        <div className="grid grid-cols-3 gap-4 mb-8 text-sm font-bold bg-gray-50 p-4 rounded-xl">
          <div><p className="text-gray-400 text-xs">RECEPTOR</p><p>{receptor ? receptor.name : loan.receptorDni}</p></div>
          <div><p className="text-gray-400 text-xs">MONTO</p><p className="text-green-700 text-lg">{formatMoney(loan.amount)}</p></div>
          <div><p className="text-gray-400 text-xs">CONDICIONES</p><p>{loan.rate}% / {loan.months}m</p></div>
        </div>
        <table className="w-full text-right text-sm">
          <thead><tr className="bg-gray-100 border-b"><th className="p-3 text-center">N°</th><th className="p-3">Fecha</th><th className="p-3 text-green-800">Cuota</th><th className="p-3">Interés</th><th className="p-3">Amort.</th><th className="p-3">Saldo</th></tr></thead>
          <tbody>
            <tr><td className="p-3 text-center">0</td><td>-</td><td>-</td><td>-</td><td>-</td><td className="font-bold">{formatMoney(loan.amount)}</td></tr>
            {schedule.map(r => (
              <tr key={r.month} className="border-b"><td className="p-3 text-center">{r.month}</td><td className="p-3">{r.date}</td><td className="p-3 font-bold text-green-700">{formatMoney(r.payment)}</td><td className="p-3">{formatMoney(r.interest)}</td><td className="p-3">{formatMoney(r.principal)}</td><td className="p-3 font-bold">{formatMoney(r.balance)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}