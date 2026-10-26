import { useState } from 'react';
import Header from './components/header';
import Hero from './components/Hero';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';

export default function App() {
  const [modelo, setModelo] = useState('pets');
  const [resultado, setResultado] = useState(null);

  const manejarPrediccion = (data) => setResultado(data);

  return (
    <div className="container">
      <Header />
      <Hero
        modelo={modelo}
        setModelo={(m) => {
          setModelo(m);
          setResultado(null);
        }}
      />
      <div className="grid-2">
        <InputPanel modelo={modelo} onResult={manejarPrediccion} />
        <OutputPanel modelo={modelo} resultado={resultado} />
      </div>
    </div>
  );
}