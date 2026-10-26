export default function OutputPanel({ modelo, resultado }) {
  const formato = (v) => `${Math.round(v * 100)}%`;

  const predicciones = resultado?.predicciones
    ? [...resultado.predicciones].sort((a, b) => b.probabilidad - a.probabilidad)
    : [];

  return (
    <div className="panel">
      <div className="panel-label">02 — Salida</div>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        Resultado del análisis
        <span style={{ fontSize: 11, color: 'var(--green)', border: '1px solid var(--green)', padding: '2px 8px', borderRadius: 6 }}>
          ● LIVE
        </span>
      </div>

      {!resultado && (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Esperando una imagen o dibujo…
        </p>
      )}

      {resultado?.error && (
        <p style={{ color: 'var(--pink)', fontSize: 13 }}>
          Ocurrió un error consultando la IA.
        </p>
      )}

      {modelo === 'pets' && predicciones.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {predicciones.map((p, i) => (
            <div key={i} className="panel" style={{ background: '#16181c' }}>
              <div className="panel-label">{p.clase.toUpperCase()}</div>
              <div style={{ fontSize: 44, fontWeight: 700, color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>
                {formato(p.probabilidad)}
              </div>
              <div style={{ height: 4, background: i === 0 ? 'var(--gold)' : 'var(--muted)', borderRadius: 2, marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      {modelo === 'mnist' && resultado?.digito !== undefined && (
        <div className="panel" style={{ background: '#1a0f14', borderColor: '#3a1f2a' }}>
          <div className="panel-label" style={{ color: 'var(--pink)' }}>Número detectado</div>
          <div style={{ fontSize: 120, textAlign: 'center', color: 'var(--pink)', fontWeight: 700 }}>
            {resultado.digito}
          </div>
          <div className="panel-label" style={{ marginTop: 10 }}>Match</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--pink)' }}>●</span>
            <strong>{formato(resultado.confianza ?? 0)}</strong>
          </div>
          <div style={{ height: 6, background: '#2a1620', borderRadius: 3 }}>
            <div style={{
              width: formato(resultado.confianza ?? 0),
              height: '100%',
              background: 'linear-gradient(90deg, #ff4d6d, #ff8fa3)',
              borderRadius: 3,
            }} />
          </div>
        </div>
      )}

      {resultado?.url && (
        <img
          src={resultado.url}
          alt="entrada"
          style={{ marginTop: 16, width: '100%', borderRadius: 10, border: '1px solid var(--border)' }}
        />
      )}
    </div>
  );
}