export default function Header() {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, background: 'var(--gold)', borderRadius: 6 }} />
        <strong>CSILab</strong>
      </div>
    </header>
  );
}