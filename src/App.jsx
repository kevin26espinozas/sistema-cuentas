import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PlusCircle, 
  FileText, 
  ShoppingBag, 
  CreditCard, 
  UserPlus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search, 
  Check, 
  ChevronDown, 
  Plus, 
  X,
  CheckCircle2
} from 'lucide-react';
import { supabase } from './utils/supabase';
import { generarEstadoCuentaPdf } from './utils/generatePdf';

export default function App() {
  const [clientes, setClientes] = useState([]);
  const [clienteActivoId, setClienteActivoId] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estado para la notificación flotante (Toast de éxito)
  const [notificacion, setNotificacion] = useState(null);

  // Buscador de clientes
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const dropdownRef = useRef(null);

  // Modales
  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [modalCliente, setModalCliente] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  // Formulario Movimiento
  const [tipoMov, setTipoMov] = useState('Compra');
  const [fechaMov, setFechaMov] = useState('');
  const [notas, setNotas] = useState('');

  // Lista dinámica de productos para compras múltiples
  const [itemsCompra, setItemsCompra] = useState([{ detalle: '', monto: '' }]);

  // Campos para modo Pago (Abono) o Edición
  const [detalleSimple, setDetalleSimple] = useState('');
  const [montoSimple, setMontoSimple] = useState('');

  // Formulario Cliente
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');

  // Función para mostrar mensajes de éxito flotantes
  const mostrarExito = (mensaje) => {
    setNotificacion(mensaje);
    setTimeout(() => {
      setNotificacion(null);
    }, 3200);
  };

  // Cerrar desplegable si se hace clic fuera
  useEffect(() => {
    const handleClickAfuera = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  // Cargar datos al iniciar
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: clientesData, error: errCli } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (errCli) throw errCli;

      setClientes(clientesData || []);

      if (clientesData && clientesData.length > 0) {
        setClienteActivoId((prev) => (prev ? prev : clientesData[0].id));
      }

      const { data: movsData, error: errMov } = await supabase
        .from('movimientos')
        .select('*')
        .order('created_at', { ascending: true });

      if (errMov) throw errMov;
      setMovimientos(movsData || []);
    } catch (error) {
      console.error('Error al cargar datos:', error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cliente activo garantizado por coincidencia de ID
  const clienteActivo = useMemo(() => {
    if (!clientes.length || !clienteActivoId) return null;
    return clientes.find((c) => String(c.id) === String(clienteActivoId)) || clientes[0];
  }, [clientes, clienteActivoId]);

  // Filtro de búsqueda de clientes
  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return clientes;
    const q = busquedaCliente.toLowerCase();
    return clientes.filter(
      (c) => c.nombre.toLowerCase().includes(q) || (c.telefono && c.telefono.includes(q))
    );
  }, [clientes, busquedaCliente]);

  // Filtrado estricto y cálculo de saldos
  const { listaFiltrada, totales } = useMemo(() => {
    if (!clienteActivo) {
      return { listaFiltrada: [], totales: { compras: 0, pagos: 0, saldo: 0 } };
    }

    const filtrados = movimientos.filter(
      (m) => String(m.cliente_id) === String(clienteActivo.id)
    );

    const ordenados = [...filtrados].sort((a, b) => {
      const fA = new Date(a.fecha || a.created_at);
      const fB = new Date(b.fecha || b.created_at);
      return fA - fB;
    });

    let acumulado = 0;
    let compras = 0;
    let pagos = 0;

    const calculados = ordenados.map((m) => {
      const cargo = parseFloat(m.cargo) || 0;
      const abono = parseFloat(m.abono) || 0;
      compras += cargo;
      pagos += abono;
      acumulado += (cargo - abono);
      return { ...m, cargo, abono, saldoAcumulado: acumulado };
    });

    return {
      listaFiltrada: calculados,
      totales: { compras, pagos, saldo: acumulado }
    };
  }, [movimientos, clienteActivo]);

  // Total acumulado dinámico de los productos añadidos en el modal
  const totalCompraMultiple = useMemo(() => {
    return itemsCompra.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);
  }, [itemsCompra]);

  // Abrir modal para nuevo movimiento
  const abrirModalNuevo = () => {
    setEditandoId(null);
    setTipoMov('Compra');
    setFechaMov(new Date().toISOString().split('T')[0]);
    setItemsCompra([{ detalle: '', monto: '' }]);
    setDetalleSimple('');
    setMontoSimple('');
    setNotas('');
    setModalMovimiento(true);
  };

  // Funciones para manejar la lista de múltiples productos
  const agregarFilaProducto = () => {
    setItemsCompra((prev) => [...prev, { detalle: '', monto: '' }]);
  };

  const eliminarFilaProducto = (index) => {
    if (itemsCompra.length === 1) return;
    setItemsCompra((prev) => prev.filter((_, i) => i !== index));
  };

  const actualizarFilaProducto = (index, campo, valor) => {
    setItemsCompra((prev) => {
      const copia = [...prev];
      copia[index][campo] = valor;
      return copia;
    });
  };

  // Abrir modal para editar movimiento existente
  const iniciarEdicion = (m) => {
    setEditandoId(m.id);
    setTipoMov(m.tipo);
    setFechaMov(m.fecha);
    setDetalleSimple(m.detalle);
    setMontoSimple(m.tipo === 'Compra' ? m.cargo.toString() : m.abono.toString());
    setNotas(m.notas || '');
    setModalMovimiento(true);
  };

  // Eliminar movimiento
  const handleEliminar = async (id, detalle) => {
    if (window.confirm(`¿Eliminar "${detalle}"?`)) {
      try {
        const { error } = await supabase.from('movimientos').delete().eq('id', id);
        if (error) throw error;
        setMovimientos((prev) => prev.filter((m) => m.id !== id));
        mostrarExito(`Se eliminó "${detalle}" correctamente.`);
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  // Guardar movimiento(s)
  const handleGuardarMovimiento = async (e) => {
    e.preventDefault();
    if (!clienteActivo) return;

    const fechaFinal = fechaMov || new Date().toISOString().split('T')[0];

    try {
      if (editandoId) {
        // Modo Edición
        const num = parseFloat(montoSimple) || 0;
        const payload = {
          cliente_id: clienteActivo.id,
          fecha: fechaFinal,
          tipo: tipoMov,
          detalle: detalleSimple.trim() || (tipoMov === 'Pago' ? 'Abono a cuenta' : 'Producto'),
          cargo: tipoMov === 'Compra' ? num : 0,
          abono: tipoMov === 'Pago' ? num : 0,
          notas: notas.trim()
        };

        const { data, error } = await supabase
          .from('movimientos')
          .update(payload)
          .eq('id', editandoId)
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          setMovimientos((prev) => prev.map((m) => (m.id === editandoId ? data[0] : m)));
        }
        setModalMovimiento(false);
        mostrarExito('¡Movimiento actualizado con éxito!');
      } else if (tipoMov === 'Compra') {
        // Guardar múltiples productos
        const filasValidas = itemsCompra.filter((item) => item.detalle.trim() && parseFloat(item.monto) > 0);

        if (filasValidas.length === 0) {
          alert('Por favor ingresa al menos un producto con descripción y monto válido.');
          return;
        }

        const payloads = filasValidas.map((item) => ({
          cliente_id: clienteActivo.id,
          fecha: fechaFinal,
          tipo: 'Compra',
          detalle: item.detalle.trim(),
          cargo: parseFloat(item.monto) || 0,
          abono: 0,
          notas: notas.trim()
        }));

        const { data, error } = await supabase
          .from('movimientos')
          .insert(payloads)
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          setMovimientos((prev) => [...prev, ...data]);
        }
        setModalMovimiento(false);
        const mensaje = filasValidas.length === 1 
          ? '¡Producto guardado con éxito!' 
          : `¡${filasValidas.length} productos guardados con éxito!`;
        mostrarExito(mensaje);
      } else {
        // Guardar Abono / Pago
        const num = parseFloat(montoSimple) || 0;
        if (num <= 0) {
          alert('Por favor ingresa un monto válido para el abono.');
          return;
        }

        const payload = {
          cliente_id: clienteActivo.id,
          fecha: fechaFinal,
          tipo: 'Pago',
          detalle: detalleSimple.trim() || 'Abono a cuenta',
          cargo: 0,
          abono: num,
          notas: notas.trim()
        };

        const { data, error } = await supabase
          .from('movimientos')
          .insert([payload])
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          setMovimientos((prev) => [...prev, data[0]]);
        }
        setModalMovimiento(false);
        mostrarExito('¡Abono registrado con éxito!');
      }
    } catch (err) {
      alert('Error al guardar movimiento: ' + err.message);
    }
  };

  // Guardar nuevo cliente
  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{ nombre: nuevoNombre.trim(), telefono: nuevoTelefono.trim() }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setClientes((prev) => [...prev, data[0]]);
        setClienteActivoId(data[0].id);
        setModalCliente(false);
        setNuevoNombre('');
        setNuevoTelefono('');
        setBusquedaCliente('');
        mostrarExito(`¡Cliente "${data[0].nombre}" creado con éxito!`);
      }
    } catch (err) {
      alert('Error al crear cliente: ' + err.message);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B365D]" />
        <p className="font-bold text-slate-600">Conectando con Supabase...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 text-slate-800 relative">
      
      {/* Notificación Toast Flotante Elegante */}
      {notificacion && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-bounce border border-emerald-400">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span className="font-bold text-sm tracking-wide">{notificacion}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Encabezado */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-[#1B365D] tracking-tight">CONTROL DE CLIENTES Y CUENTAS</h1>
            <p className="text-sm text-slate-500">Gestión de compras a crédito y abonos sincronizados</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setModalCliente(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold transition-colors cursor-pointer"
            >
              <UserPlus className="w-5 h-5" />
              <span>Nuevo Cliente</span>
            </button>
            <button
              disabled={!clienteActivo}
              onClick={abrirModalNuevo}
              className="flex items-center gap-2 bg-[#1B365D] hover:bg-[#132742] disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold shadow-sm active:scale-95 transition-transform cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Registrar Movimiento</span>
            </button>
            <button
              disabled={!clienteActivo}
              onClick={() => generarEstadoCuentaPdf(clienteActivo, listaFiltrada, totales)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold shadow-sm active:scale-95 transition-transform cursor-pointer"
            >
              <FileText className="w-5 h-5" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </header>

        {/* Buscador y Tarjetas de Saldo */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Buscador Reactivo */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Buscar o Elegir Cliente
            </label>

            <div className="relative">
              <input
                type="text"
                placeholder={clienteActivo ? clienteActivo.nombre : 'Buscar cliente...'}
                value={busquedaCliente}
                onFocus={() => setMenuAbierto(true)}
                onChange={(e) => {
                  setBusquedaCliente(e.target.value);
                  setMenuAbierto(true);
                }}
                className="w-full bg-amber-50/80 border border-amber-300 font-black text-[#1B365D] rounded-xl pl-9 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-amber-400 text-sm placeholder:text-[#1B365D]"
              />
              <Search className="w-4 h-4 text-amber-700 absolute left-3 top-3.5" />
              <button
                type="button"
                onClick={() => setMenuAbierto((prev) => !prev)}
                className="absolute right-2 top-3 text-amber-700 hover:text-amber-900"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${menuAbierto ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Menú Desplegable */}
            {menuAbierto && (
              <div className="absolute left-0 right-0 top-[82px] bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto p-1 divide-y divide-slate-100">
                {clientesFiltrados.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 font-semibold">
                    No se encontró ningún cliente
                  </div>
                ) : (
                  clientesFiltrados.map((c) => {
                    const seleccionado = String(c.id) === String(clienteActivo?.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClienteActivoId(c.id);
                          setMenuAbierto(false);
                          setBusquedaCliente('');
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors cursor-pointer ${
                          seleccionado ? 'bg-amber-100/70 text-[#1B365D] font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-bold leading-tight">{c.nombre}</p>
                          {c.telefono && <p className="text-[11px] text-slate-400">{c.telefono}</p>}
                        </div>
                        {seleccionado && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Tarjeta Total Compras */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-[#1B365D] rounded-xl"><ShoppingBag className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-slate-400">TOTAL COMPRAS</p>
              <p className="text-xl font-black text-[#1B365D]">L. {totales.compras.toFixed(2)}</p>
            </div>
          </div>

          {/* Tarjeta Total Pagos */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CreditCard className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-slate-400">TOTAL PAGOS</p>
              <p className="text-xl font-black text-emerald-700">L. {totales.pagos.toFixed(2)}</p>
            </div>
          </div>

          {/* Tarjeta Saldo Inteligente */}
          <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${
            totales.saldo > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div>
              <p className={`text-xs font-black uppercase ${
                totales.saldo > 0 ? 'text-red-600' : 'text-emerald-700'
              }`}>
                {totales.saldo < 0 ? 'SALDO A FAVOR' : 'SALDO PENDIENTE'}
              </p>
              <p className={`text-2xl font-black ${
                totales.saldo > 0 ? 'text-[#721C24]' : 'text-emerald-800'
              }`}>
                L. {Math.abs(totales.saldo).toFixed(2)}
              </p>
            </div>
          </div>
        </section>

        {/* Historial de Movimientos */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-700">
              Historial de <span className="text-[#1B365D] underline font-black">{clienteActivo ? clienteActivo.nombre : '...'}</span>
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
              {listaFiltrada.length} movimientos
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1B365D] text-white text-xs uppercase sticky top-0">
                <tr>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Producto / Detalle</th>
                  <th className="p-4 text-right">Cargo</th>
                  <th className="p-4 text-right">Abono</th>
                  <th className="p-4 text-right">Saldo</th>
                  <th className="p-4">Notas</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {listaFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                      No hay transacciones registradas para este cliente.
                    </td>
                  </tr>
                ) : (
                  listaFiltrada.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-500 whitespace-nowrap">{m.fecha}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          m.tipo === 'Compra' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{m.detalle}</td>
                      <td className="p-4 text-right font-medium">{m.cargo > 0 ? `L. ${m.cargo.toFixed(2)}` : '-'}</td>
                      <td className="p-4 text-right font-medium text-emerald-600">{m.abono > 0 ? `L. ${m.abono.toFixed(2)}` : '-'}</td>
                      <td className="p-4 text-right font-bold text-[#721C24]">
                        {m.saldoAcumulado < 0 ? `(L. ${Math.abs(m.saldoAcumulado).toFixed(2)})` : `L. ${m.saldoAcumulado.toFixed(2)}`}
                      </td>
                      <td className="p-4 text-slate-400 text-xs">{m.notas}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => iniciarEdicion(m)}
                            title="Editar registro"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(m.id, m.detalle)}
                            title="Eliminar registro"
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Modal Registrar o Editar Movimiento (Con soporte multi-producto) */}
        {modalMovimiento && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 my-8">
              <h3 className="text-xl font-black text-[#1B365D] mb-1">
                {editandoId ? 'Editar Movimiento' : 'Registrar Transacción'}
              </h3>
              <p className="text-xs text-slate-500 mb-4 font-semibold">
                Cliente: <span className="text-[#1B365D] font-bold">{clienteActivo?.nombre}</span>
              </p>

              <form onSubmit={handleGuardarMovimiento} className="space-y-4">
                
                {/* Selector Tipo de Movimiento */}
                {!editandoId && (
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTipoMov('Compra')}
                      className={`py-2 font-bold text-sm rounded-lg transition-all cursor-pointer ${
                        tipoMov === 'Compra' ? 'bg-[#1B365D] text-white shadow' : 'text-slate-600'
                      }`}
                    >
                      Compra (Productos)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoMov('Pago')}
                      className={`py-2 font-bold text-sm rounded-lg transition-all cursor-pointer ${
                        tipoMov === 'Pago' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600'
                      }`}
                    >
                      Abono (Pago a cuenta)
                    </button>
                  </div>
                )}

                {/* Fecha */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                  <input
                    type="date"
                    required
                    value={fechaMov}
                    onChange={(e) => setFechaMov(e.target.value)}
                    className="w-full mt-1 p-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[#1B365D]"
                  />
                </div>

                {/* SECCIÓN 1: Venta con Múltiples Productos */}
                {!editandoId && tipoMov === 'Compra' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Lista de Productos ({itemsCompra.length})
                      </label>
                      <button
                        type="button"
                        onClick={agregarFilaProducto}
                        className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar otro producto</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {itemsCompra.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <input
                            type="text"
                            required
                            placeholder={`Producto #${index + 1} (ej. Zapatos, Sandalias...)`}
                            value={item.detalle}
                            onChange={(e) => actualizarFilaProducto(index, 'detalle', e.target.value)}
                            className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#1B365D]"
                          />
                          <div className="w-28 relative">
                            <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">L.</span>
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={item.monto}
                              onChange={(e) => actualizarFilaProducto(index, 'monto', e.target.value)}
                              className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-[#1B365D]"
                            />
                          </div>
                          {itemsCompra.length > 1 && (
                            <button
                              type="button"
                              onClick={() => eliminarFilaProducto(index)}
                              className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer"
                              title="Quitar este producto"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total acumulado de la compra */}
                    <div className="flex justify-between items-center bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                      <span className="text-xs font-black text-[#1B365D] uppercase">Total de esta compra:</span>
                      <span className="text-lg font-black text-[#1B365D]">L. {totalCompraMultiple.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  /* SECCIÓN 2: Abono Simple o Modo Edición */
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        {tipoMov === 'Pago' ? 'Detalle del Abono' : 'Detalle del Producto'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={tipoMov === 'Pago' ? 'Abono a cuenta' : 'Ej. Sandalias, Tenis...'}
                        value={detalleSimple}
                        onChange={(e) => setDetalleSimple(e.target.value)}
                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1B365D]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Monto (Lempiras)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={montoSimple}
                        onChange={(e) => setMontoSimple(e.target.value)}
                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-[#1B365D]"
                      />
                    </div>
                  </>
                )}

                {/* Notas generales */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Notas o Comentarios (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Pagó en efectivo, Transferencia BAC, Entrega viernes..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1B365D]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalMovimiento(false)}
                    className="flex-1 py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#1B365D] text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform cursor-pointer"
                  >
                    {editandoId 
                      ? 'Actualizar' 
                      : tipoMov === 'Compra' && itemsCompra.length > 1 
                        ? `Guardar (${itemsCompra.length} productos)` 
                        : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Crear Nuevo Cliente */}
        {modalCliente && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200">
              <h3 className="text-xl font-black text-[#1B365D] mb-4">Agregar Nuevo Cliente</h3>
              <form onSubmit={handleGuardarCliente} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del cliente"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1B365D]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej. 9988-7766"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1B365D]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalCliente(false)}
                    className="flex-1 py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform cursor-pointer"
                  >
                    Crear Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}