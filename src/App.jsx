import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { LayoutDashboard, Users, CreditCard, LogOut, FileText, Printer, Plus, Trash2, ArrowLeft, CheckCircle, AlertCircle, Info, Menu, X, DollarSign } from 'lucide-react';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'coop-familiar-app';

const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
const loansRef = collection(db, 'artifacts', appId, 'public', 'data', 'loans');

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  
  const [loginDni, setLoginDni] = useState('');
  const [view, setView] = useState('dashboard'); 
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Estados para modales y notificaciones customizadas
  const [toast, setToast] = useState(null); 
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error auth:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsubUsers = onSnapshot(usersRef, (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubLoans = onSnapshot(loansRef, (snap) => setLoans(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubUsers(); unsubLoans(); };
  }, [firebaseUser]);

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
      await addDoc(usersRef, { dni, name: 'Administrador Principal', role: 'admin', aporte: 0 });
      showToast("Primer usuario creado como Administrador. Vuelve a ingresar tu DNI.", "success");
      setLoginDni('');
    } else {
      const foundUser = users.find(u => u.dni === dni);
      if (foundUser) {
        setAppUser(foundUser);
        setView(foundUser.role === 'receptor' ? 'loans' : 'dashboard');
        showToast(`Bienvenido, ${foundUser.name}`, "success");
      } else {
        showToast("DNI no registrado en el sistema.", "error");
      }
    }
  };

  const handleLogout = () => {
    setAppUser(null);
    setLoginDni('');
    setView('dashboard');
  };

  const navigateTo = (newView) => {
    setView(newView);
    setIsSidebarOpen(false); // Cierra el menú automáticamente al hacer clic
  };

  if (!appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
        <ToastNotification toast={toast} />
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-green-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-green-900 mb-2">CoopFamiliar</h1>
            <p className="text-green-700 font-medium">Gestión de Préstamos</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Ingrese su DNI</label>
              <input type="number" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all" placeholder="Ej. 72345678" value={loginDni} onChange={(e) => setLoginDni(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition shadow-lg hover:shadow-green-500/30">Acceder al Sistema</button>
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

      {/* Elementos flotantes globales */}
      <ToastNotification toast={toast} />
      <ConfirmModal isOpen={confirmDialog.isOpen} message={confirmDialog.message} onConfirm={() => { if(confirmDialog.onConfirm) confirmDialog.onConfirm(); closeConfirm(); }} onCancel={closeConfirm} />

      {/* Header Superior Móvil y Desktop */}
      <header className="absolute top-0 left-0 w-full h-16 bg-green-900 text-white shadow-md flex justify-between items-center px-4 z-30 no-print">
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-green-800 rounded-lg hover:bg-green-700 transition">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold truncate">CoopFamiliar</h1>
        </div>
        <div className="flex items-center space-x-3">
           <span className="hidden sm:inline-block font-medium text-sm truncate max-w-[150px]">{appUser.name}</span>
           <button onClick={() => showConfirm("¿Deseas cerrar sesión?", handleLogout)} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition" title="Salir">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Fondo oscuro al abrir el Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity no-print" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar Lateral Deslizable (Drawer) */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-green-900 text-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out no-print ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-green-800">
          <h2 className="text-2xl font-bold">Menú</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-green-800 rounded-lg"><X size={24} /></button>
        </div>

        <div className="px-6 py-5 bg-green-800 bg-opacity-40">
          <p className="text-sm text-green-300 mb-1">Sesión activa:</p>
          <p className="font-bold text-lg truncate leading-tight mb-2">{appUser.name}</p>
          <span className="inline-flex px-3 py-1 bg-green-700 text-xs font-bold rounded-full uppercase tracking-wider">{appUser.role}</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
          {(appUser.role === 'admin' || appUser.role === 'socio') && (
            <SidebarBtn icon={<LayoutDashboard size={22} />} label="Panel Resumen" active={view === 'dashboard'} onClick={() => navigateTo('dashboard')} />
          )}
          {appUser.role === 'admin' && (
            <SidebarBtn icon={<Users size={22} />} label="Directorio de Usuarios" active={view === 'users'} onClick={() => navigateTo('users')} />
          )}
          <SidebarBtn icon={<CreditCard size={22} />} label={appUser.role === 'receptor' ? 'Mis Préstamos' : 'Gestión Préstamos'} active={view === 'loans' || view === 'schedule'} onClick={() => { navigateTo('loans'); setSelectedLoan(null); }} />
        </nav>
      </div>

      {/* Área central donde cargan las vistas */}
      <main className="flex-1 pt-20 overflow-y-auto bg-gray-50 p-4 sm:p-8 relative">
        <div className="max-w-6xl mx-auto pb-10">
          {view === 'dashboard' && (appUser.role === 'admin' || appUser.role === 'socio') && <DashboardView loans={loans} users={users} formatMoney={formatMoney} />}
          {view === 'users' && appUser.role === 'admin' && <UsersView users={users} showToast={showToast} showConfirm={showConfirm} />}
          {view === 'loans' && <LoansView loans={loans} users={users} appUser={appUser} formatMoney={formatMoney} onSelectLoan={(l) => { setSelectedLoan(l); setView('schedule'); }} showToast={showToast} showConfirm={showConfirm} />}
          {view === 'schedule' && selectedLoan && <ScheduleView loan={selectedLoan} users={users} formatMoney={formatMoney} onBack={() => setView('loans')} />}
        </div>
      </main>
    </div>
  );
}

function SidebarBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${active ? 'bg-green-600 text-white shadow-md font-bold' : 'text-green-100 hover:bg-green-800 font-medium'}`}>
      {icon} <span>{label}</span>
    </button>
  );
}

function ToastNotification({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white font-bold transition-all animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
      <p>{toast.message}</p>
    </div>
  );
}

function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95">
        <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Confirmación</h3>
        <p className="text-gray-600 mb-8 text-lg">{message}</p>
        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button>
          <button onClick={onConfirm} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition">Aceptar</button>
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
      // Fórmula de cuota constante (Francés)
      const cuota = r === 0 ? (l.amount / l.months) : (l.amount * r * Math.pow(1 + r, l.months)) / (Math.pow(1 + r, l.months) - 1);
      interesesEsperados += ((cuota * l.months) - l.amount);
    });
    return { capitalPrestado, activos, interesesEsperados, totalPrestamos: loans.length };
  }, [loans]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Resumen Financiero</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Préstamos Creados" value={stats.totalPrestamos} icon={<FileText size={24}/>} color="bg-blue-600" />
        <StatCard title="Capital Total Dispuesto" value={formatMoney(stats.capitalPrestado)} icon={<DollarSign size={24}/>} color="bg-green-600" />
        <StatCard title="Capital en Calle" value={formatMoney(stats.activos)} icon={<LayoutDashboard size={24}/>} color="bg-amber-500" />
        <StatCard title="Ganancia Proyectada" value={formatMoney(stats.interesesEsperados)} icon={<CheckCircle size={24}/>} color="bg-purple-600" />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
        <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <Users className="text-gray-500" size={24}/>
          <h3 className="text-xl font-bold text-gray-800">Participación de Socios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-gray-500 text-sm border-b">
                <th className="p-4 sm:p-5 font-bold uppercase tracking-wide">Nombre del Socio</th>
                <th className="p-4 sm:p-5 font-bold uppercase tracking-wide">Aporte Inicial</th>
                <th className="p-4 sm:p-5 font-bold uppercase tracking-wide">% Participación</th>
                <th className="p-4 sm:p-5 font-bold uppercase tracking-wide text-green-700">Ganancia Estimada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {socios.length === 0 ? (
                <tr><td colSpan="4" className="p-10 text-center text-gray-400 font-medium">Aún no hay socios registrados en el sistema.</td></tr>
              ) : socios.map(socio => {
                const aporte = Number(socio.aporte) || 0;
                const porcentaje = totalAportes > 0 ? (aporte / totalAportes) : 0;
                const ganancia = stats.interesesEsperados * porcentaje;
                return (
                  <tr key={socio.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 sm:p-5 font-bold text-gray-900">{socio.name}</td>
                    <td className="p-4 sm:p-5 text-gray-700 font-medium">{formatMoney(aporte)}</td>
                    <td className="p-4 sm:p-5 text-gray-600 font-medium">{(porcentaje * 100).toFixed(1)}%</td>
                    <td className="p-4 sm:p-5 font-black text-green-600">{formatMoney(ganancia)}</td>
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

function UsersView({ users, showToast, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ dni: '', name: '', role: 'receptor', aporte: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (users.find(u => u.dni === formData.dni)) return showToast("Este DNI ya está registrado.", "error");
    await addDoc(usersRef, { ...formData, aporte: formData.role === 'socio' ? Number(formData.aporte) : 0 });
    showToast("Usuario registrado exitosamente.", "success");
    setShowForm(false); setFormData({ dni: '', name: '', role: 'receptor', aporte: 0 });
  };

  const handleDelete = (id) => {
    showConfirm("¿Estás seguro de eliminar este usuario definitivamente?", async () => {
      await deleteDoc(doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'coop-familiar-app', 'public', 'data', 'users', id));
      showToast("Usuario eliminado.", "success");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-extrabold text-gray-900">Directorio de Usuarios</h2>
        <button onClick={() => setShowForm(!showForm)} className={`px-5 py-2.5 rounded-xl flex items-center space-x-2 text-white font-bold transition-all shadow-md ${showForm ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}>
          {showForm ? <X size={18} /> : <Plus size={18} />} <span className="hidden sm:inline">{showForm ? 'Cancelar' : 'Agregar Usuario'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-green-100 grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-4">
          <div><label className="block text-sm font-bold text-gray-700 mb-1.5">N° DNI</label><input required type="number" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre Completo</label><input required type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Rol en Cooperativa</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="receptor">Receptor (Pide préstamos)</option><option value="socio">Socio (Inversionista)</option><option value="admin">Administrador</option>
            </select>
          </div>
          {formData.role === 'socio' && (<div><label className="block text-sm font-bold text-gray-700 mb-1.5">Aporte Inicial (S/)</label><input required type="number" step="0.01" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={formData.aporte} onChange={e => setFormData({...formData, aporte: e.target.value})} /></div>)}
          <div className="sm:col-span-2 text-right mt-2"><button type="submit" className="bg-green-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-green-900/30 transition-all">Guardar Usuario</button></div>
        </form>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-gray-50 text-gray-500 text-sm border-b">
              <th className="p-4 sm:p-5 font-bold uppercase">DNI</th><th className="p-4 sm:p-5 font-bold uppercase">Nombre Completo</th><th className="p-4 sm:p-5 font-bold uppercase">Rol</th><th className="p-4 sm:p-5 font-bold uppercase text-right">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 sm:p-5 font-mono text-gray-600">{u.dni}</td>
                  <td className="p-4 sm:p-5 font-bold text-gray-900">{u.name}</td>
                  <td className="p-4 sm:p-5">
                    <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase ${u.role==='admin'?'bg-purple-100 text-purple-700':u.role==='socio'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700'}`}>{u.role}</span>
                  </td>
                  <td className="p-4 sm:p-5 text-right">
                    <button onClick={()=>handleDelete(u.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition" title="Eliminar"><Trash2 size={20}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LoansView({ loans, users, appUser, formatMoney, onSelectLoan, showToast, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ receptorDni: '', amount: '', rate: '', months: '', startDate: new Date().toISOString().split('T')[0] });

  const receptores = users.filter(u => u.role === 'receptor');
  // Receptores ven los suyos. Admin y Socio ven todos.
  const visibleLoans = appUser.role === 'receptor' ? loans.filter(l => l.receptorDni === appUser.dni) : loans;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(loansRef, { ...formData, amount: Number(formData.amount), rate: Number(formData.rate), months: Number(formData.months), status: 'activo', createdAt: Date.now() });
    showToast("Préstamo registrado exitosamente.", "success");
    setShowForm(false); setFormData({ receptorDni: '', amount: '', rate: '', months: '', startDate: new Date().toISOString().split('T')[0] });
  };

  const handleStatusChange = (id, currentStatus) => {
    const newStatus = currentStatus === 'activo' ? 'pagado' : 'activo';
    showConfirm(`¿Confirmas cambiar el estado a ${newStatus.toUpperCase()}?`, async () => {
      await updateDoc(doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'coop-familiar-app', 'public', 'data', 'loans', id), { status: newStatus });
      showToast("Estado de préstamo actualizado.", "success");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-extrabold text-gray-900">{appUser.role === 'receptor' ? 'Mis Préstamos Activos' : 'Cartera de Préstamos'}</h2>
        {appUser.role === 'admin' && (
          <button onClick={() => setShowForm(!showForm)} className={`px-5 py-2.5 rounded-xl flex items-center space-x-2 text-white font-bold transition-all shadow-md ${showForm ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}>
            {showForm ? <X size={18} /> : <Plus size={18} />} <span className="hidden sm:inline">{showForm ? 'Cerrar Panel' : 'Nuevo Préstamo'}</span>
          </button>
        )}
      </div>

      {showForm && appUser.role === 'admin' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-green-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-4">
          <div className="sm:col-span-2 lg:col-span-3 border-b border-gray-100 pb-3 mb-2 flex items-center gap-2">
            <Info size={20} className="text-green-600"/> <h3 className="font-extrabold text-gray-800 text-lg">Cálculo: Sistema Francés (Cuota Fija)</h3>
          </div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Receptor</label><select required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={formData.receptorDni} onChange={e=>setFormData({...formData, receptorDni: e.target.value})}><option value="">Seleccione receptor...</option>{receptores.map(r=><option key={r.id} value={r.dni}>{r.name}</option>)}</select></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Capital Entregado (S/)</label><input required type="number" step="0.01" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Tasa Mensual (%)</label><input required type="number" step="0.01" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={formData.rate} onChange={e=>setFormData({...formData, rate: e.target.value})} /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Plazo (Meses)</label><input required type="number" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={formData.months} onChange={e=>setFormData({...formData, months: e.target.value})} /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Fecha de Entrega</label><input required type="date" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={formData.startDate} onChange={e=>setFormData({...formData, startDate: e.target.value})} /></div>
          <div className="lg:col-span-3 text-right mt-3"><button type="submit" className="bg-green-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-green-900/30 transition-all">Generar Préstamo</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleLoans.length === 0 ? <div className="col-span-full bg-white p-10 text-center rounded-3xl border border-gray-200"><p className="text-gray-500 font-medium">No hay préstamos para mostrar.</p></div> : visibleLoans.map(l => {
          const receptor = users.find(u => u.dni === l.receptorDni);
          const isActivo = l.status !== 'pagado';
          return (
            <div key={l.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <p className="font-extrabold text-gray-900 text-lg">{receptor ? receptor.name : 'Usuario Eliminado'}</p>
                  <p className="text-sm text-gray-500 font-medium">DNI: {l.receptorDni}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-bold tracking-wide ${isActivo ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{isActivo ? 'ACTIVO' : 'FINALIZADO'}</span>
              </div>
              <div className="p-6 flex-1">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Monto del Préstamo</p>
                <p className="text-3xl font-black text-green-700 mb-4">{formatMoney(l.amount)}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl"><p className="text-xs text-gray-500 font-bold uppercase mb-1">Plazo</p><p className="font-extrabold text-gray-800">{l.months} Meses</p></div>
                  <div className="bg-gray-50 p-3 rounded-xl"><p className="text-xs text-gray-500 font-bold uppercase mb-1">Tasa Mes</p><p className="font-extrabold text-gray-800">{l.rate}%</p></div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
                <button onClick={() => onSelectLoan(l)} className="flex-1 bg-white border-2 border-green-200 text-green-700 font-bold py-2.5 rounded-xl text-sm hover:bg-green-50 transition">Ver Cronograma</button>
                {appUser.role === 'admin' && (
                  <button onClick={() => handleStatusChange(l.id, l.status)} className="flex-1 bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm hover:bg-gray-300 transition">{isActivo ? 'Marcar Pagado' : 'Reactivar'}</button>
                )}
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
      if (i === loan.months) balance = 0; // Evitar decimales sobrantes en ultima cuota
      date.setMonth(date.getMonth() + 1);
      items.push({ month: i, date: date.toLocaleDateString('es-PE'), payment, principal, interest, balance: Math.max(0, balance) });
    }
    return items;
  }, [loan]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center no-print bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-200">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 font-bold px-4 py-2 hover:bg-gray-100 rounded-xl transition"><ArrowLeft size={20} /> <span className="hidden sm:inline">Atrás</span></button>
        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition"><Printer size={20} /> <span>Guardar PDF</span></button>
      </div>

      <div id="print-area" className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-gray-200 print:shadow-none print:border-none">
        <div className="text-center mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-black text-gray-900 mb-1">Cooperativa Familiar</h1>
          <h2 className="text-gray-500 font-medium">Cronograma de Pagos - Amortización Sistema Francés</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <div><span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Receptor</span><span className="font-extrabold text-base text-gray-800">{receptor ? receptor.name : loan.receptorDni}</span></div>
          <div><span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Monto Otorgado</span><span className="font-black text-lg text-green-700">{formatMoney(loan.amount)}</span></div>
          <div><span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tasa y Plazo</span><span className="font-bold text-base text-gray-800">{loan.rate}% mensual / {loan.months} m</span></div>
        </div>
        
        <div className="overflow-x-auto border border-gray-200 rounded-2xl">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-4 font-bold text-center border-b">N°</th>
                <th className="p-4 font-bold text-center border-b">Fecha de Pago</th>
                <th className="p-4 font-bold border-b text-green-800">Cuota Fija</th>
                <th className="p-4 font-bold border-b">Interés</th>
                <th className="p-4 font-bold border-b">Amortización</th>
                <th className="p-4 font-bold border-b">Saldo Restante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="p-4 text-center text-gray-400">0</td><td className="p-4 text-center text-gray-400">-</td><td className="p-4 text-gray-400">-</td><td className="p-4 text-gray-400">-</td><td className="p-4 text-gray-400">-</td><td className="p-4 font-black text-gray-800">{formatMoney(loan.amount)}</td></tr>
              {schedule.map(row => (
                <tr key={row.month} className="hover:bg-gray-50 transition">
                  <td className="p-4 text-center font-medium text-gray-600">{row.month}</td>
                  <td className="p-4 text-center font-medium text-gray-600">{row.date}</td>
                  <td className="p-4 font-black text-green-700 bg-green-50/50">{formatMoney(row.payment)}</td>
                  <td className="p-4 font-medium text-gray-600">{formatMoney(row.interest)}</td>
                  <td className="p-4 font-medium text-gray-600">{formatMoney(row.principal)}</td>
                  <td className="p-4 font-bold text-gray-800">{formatMoney(row.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="2" className="p-4 font-bold text-right text-gray-500 uppercase">Totales:</td>
                <td className="p-4 font-black text-green-800">{formatMoney(schedule.reduce((s, r) => s + r.payment, 0))}</td>
                <td className="p-4 font-bold text-gray-700">{formatMoney(schedule.reduce((s, r) => s + r.interest, 0))}</td>
                <td className="p-4 font-bold text-gray-700">{formatMoney(schedule.reduce((s, r) => s + r.principal, 0))}</td>
                <td className="p-4 text-gray-400 font-bold">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="mt-20 flex justify-around text-sm text-gray-600 font-bold text-center">
          <div className="w-48 border-t-2 border-gray-300 pt-3">Firma Administración</div>
          <div className="w-48 border-t-2 border-gray-300 pt-3">Firma del Receptor</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-5 hover:shadow-md transition-shadow">
      <div className={`p-4 rounded-2xl text-white ${color} shadow-inner`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
}