export default function Hero({ modelo, setModelo }) {
  return (
    <section className="hero">
      <div>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: 0 }}>
          Explora modelos de{' '}
          <span style={{ color: 'var(--gold)' }}>Machine Learning</span>
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 12 }}>
          Carga una imagen, utiliza tu cámara o dibuja para obtener una predicción instantánea.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setModelo('pets')}
          className={`tab-btn ${modelo === 'pets' ? 'active-gold' : ''}`}
        >
          ● Perros & Gatos
        </button>
        <button
          onClick={() => setModelo('mnist')}
          className={`tab-btn ${modelo === 'mnist' ? 'active-pink' : ''}`}
        >
          ● MNIST
        </button>
      </div>
    </section>
  );
}