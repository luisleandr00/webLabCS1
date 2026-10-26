import { useRef, useState } from 'react';
import { Upload, Camera, Pencil } from 'lucide-react';
import CanvasDraw from './CanvasDraw';

export default function InputPanel({ modelo, onResult }) {
  const [tab, setTab] = useState('upload');
  const [cargando, setCargando] = useState(false);
  const fileRef = useRef();

  const tabs = [
    { id: 'upload', label: 'Subir imagen', icon: <Upload size={14} /> },
    { id: 'cam', label: 'Vista de cámara', icon: <Camera size={14} /> },
    { id: 'draw', label: 'Canvas de dibujo', icon: <Pencil size={14} />, only: 'mnist' },
  ].filter((t) => !t.only || t.only === modelo);

  const enviarAlBackend = async (base64, urlPreview) => {
    setCargando(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelo, imageBase64: base64 }),
      });
      const data = await res.json();
      onResult({ ...data, url: urlPreview });
    } catch (err) {
      console.error(err);
      onResult({ error: true, url: urlPreview });
    } finally {
      setCargando(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      const url = URL.createObjectURL(file);
      enviarAlBackend(base64, url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel">
      <div className="panel-label">01 — Entrada</div>
      <div className="panel-title">Selecciona una fuente</div>

      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-inner ${tab === t.id ? 'active' : ''}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="drop-zone">
        {cargando && <p style={{ color: 'var(--gold)' }}>Consultando a la IA…</p>}

        {!cargando && modelo === 'pets' && tab !== 'draw' && (
          <>
            <div className="drop-icon"><Upload size={22} /></div>
            <h3>Arrastra tu imagen aquí</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              o haz clic para explorar tus archivos
            </p>
            <button className="btn-outline" onClick={() => fileRef.current.click()}>
              <Upload size={14} /> Seleccionar imagen
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
            <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 14 }}>
              Formatos: JPG, PNG
            </p>
          </>
        )}

        {!cargando && modelo === 'mnist' && tab === 'draw' && (
          <CanvasDraw
            onPredict={(base64, urlPreview) => enviarAlBackend(base64, urlPreview)}
          />
        )}

        {!cargando && modelo === 'mnist' && tab !== 'draw' && (
          <p style={{ color: 'var(--muted)' }}>Cambia a "Canvas de dibujo"</p>
        )}
      </div>
    </div>
  );
}