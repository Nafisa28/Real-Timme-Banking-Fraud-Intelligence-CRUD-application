import React, { useState, useEffect } from 'react';
import { FileText, Download, ShieldCheck, Search, RefreshCw } from 'lucide-react';
import { apiFetch } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AuditView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  async function fetchAuditLogs() {
    try {
      setLoading(true);
      const data = await apiFetch('/audit-logs');
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleExportPDF() {
    if (!filteredLogs || filteredLogs.length === 0) {
      alert('No audit logs available to export.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Document Title Header Bar
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('RBI DIGITAL BANKING FRAUD INTELLIGENCE - COMPLIANCE AUDIT TRAIL LOGS', 14, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      const dateStr = new Date().toLocaleString('en-IN').replace(/[\u200E\u200F]/g, '');
      doc.text(`Generated: ${dateStr}  |  Scope: Real-Time Security & Investigation Audit  |  Records: ${filteredLogs.length}`, 14, 19);

      // Table Data (Clean ASCII to avoid font encoding errors)
      const tableColumns = ["ID", "User", "Action", "Entity Type", "Entity ID", "Compliance Details", "Timestamp"];
      const tableRows = filteredLogs.map(log => [
        `#${log.id}`,
        log.user_id ? `User #${log.user_id}` : 'SYSTEM_CRON',
        String(log.action || ''),
        String(log.entity_type || ''),
        String(log.entity_id || '-'),
        String(log.details || '').replace(/[^\x00-\x7F]/g, ''),
        new Date(log.created_at).toLocaleString('en-IN').replace(/[\u200E\u200F]/g, '')
      ]);

      // Call autoTable directly
      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 15, fontStyle: 'bold' },
          1: { cellWidth: 25 },
          2: { cellWidth: 35, fontStyle: 'bold' },
          3: { cellWidth: 30 },
          4: { cellWidth: 22 },
          5: { cellWidth: 95 },
          6: { cellWidth: 45 }
        },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 28, left: 14, right: 14 }
      });

      doc.save(`RBI_Fraud_Audit_Logs_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF audit log file: ' + (err.message || err));
    }
  }

  const filteredLogs = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (l.action && l.action.toLowerCase().includes(s)) ||
      (l.entity_type && l.entity_type.toLowerCase().includes(s)) ||
      (l.details && l.details.toLowerCase().includes(s))
    );
  });

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading RBI compliance audit logs...</div>;
  }

  return (
    <div style={{ maxWidth: '1300px', margin: '1.5rem auto', padding: '0 1rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            <FileText color="var(--accent-cyan)" size={24} /> Compliance Audit Trail Logs
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Immutable RBI compliance audit record of all transaction screenings, rule evaluations, and fraud analyst decisions
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchAuditLogs} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={handleExportPDF} className="btn btn-primary" style={{ fontSize: '0.8rem', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderColor: '#ef4444' }}>
            <Download size={16} /> Export Audit Log PDF
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '450px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search action, entity type, details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Compliance Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id}>
                <td className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>#{log.id}</td>
                <td className="mono">{log.user_id ? `User #${log.user_id}` : 'SYSTEM_CRON'}</td>
                <td>
                  <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>{log.action}</span>
                </td>
                <td style={{ fontWeight: 600 }}>{log.entity_type}</td>
                <td className="mono">{log.entity_id || '-'}</td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="mono">
                  {log.details}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(log.created_at).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
