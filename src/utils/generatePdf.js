import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarEstadoCuentaPdf = (cliente, movimientos, totales) => {
  const doc = new jsPDF();

  // Encabezado
  doc.setFontSize(18);
  doc.setTextColor(27, 54, 93);
  doc.text('ESTADO DE CUENTA DE CLIENTE', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-HN')}`, 14, 26);

  // Datos Cliente
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Cliente: ${cliente.nombre}`, 14, 36);
  doc.text(`Teléfono: ${cliente.telefono || 'N/A'}`, 14, 42);

  // Recuadro Resumen
  doc.setFillColor(244, 247, 249);
  doc.rect(14, 48, 182, 16, 'F');

  doc.setFontSize(10);
  doc.text(`Total Compras: L. ${totales.compras.toFixed(2)}`, 20, 58);
  doc.text(`Total Pagos: L. ${totales.pagos.toFixed(2)}`, 80, 58);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(114, 28, 36);
  doc.text(`Saldo Pendiente: L. ${totales.saldo.toFixed(2)}`, 140, 58);

  // Tabla
  const filas = movimientos.map((m) => [
    m.fecha,
    m.tipo,
    m.detalle,
    m.cargo > 0 ? `L. ${m.cargo.toFixed(2)}` : '-',
    m.abono > 0 ? `L. ${m.abono.toFixed(2)}` : '-',
    `L. ${m.saldoAcumulado.toFixed(2)}`,
    m.notas || ''
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['Fecha', 'Tipo', 'Producto / Detalle', 'Cargo', 'Abono', 'Saldo', 'Notas']],
    body: filas,
    headStyles: { fillColor: [27, 54, 93] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9 }
  });

  doc.save(`Estado_Cuenta_${cliente.nombre.replace(/\s+/g, '_')}.pdf`);
};