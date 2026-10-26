import { useRef } from 'react';
import { RotateCcw } from 'lucide-react';

export default function CanvasDraw({ onPredict }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const start = (e) => {
    drawing.current = true;
    draw(e);
  };
  const stop = () => (drawing.current = false);

  const draw = (e) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches?.[0].clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0].clientY ?? e.clientY) - rect.top;

    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  };

  const predecir = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    onPredict(base64, dataUrl);
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        style={{ background: '#0a0a0a', borderRadius: 12, border: '1px solid var(--border)', cursor: 'crosshair' }}
        onMouseDown={start}
        onMouseUp={stop}
        onMouseLeave={stop}
        onMouseMove={draw}
        onTouchStart={start}
        onTouchEnd={stop}
        onTouchMove={draw}
      />
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>Dibuja un número del 0 al 9</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-outline" onClick={clear}>
          <RotateCcw size={14} /> Limpiar
        </button>
        <button className="tab-btn active-pink" onClick={predecir}>
          Predecir
        </button>
      </div>
    </div>
  );
}