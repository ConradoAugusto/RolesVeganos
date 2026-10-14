// Loading animado com a logo: o mascote quica enquanto três folhas giram em volta.
export default function Carregando({ texto = "Carregando", tela = false }) {
  return (
    <div className={`carregando ${tela ? "tela" : ""}`} role="status" aria-live="polite">
      <div className="carregando-marca">
        <span className="orbita" aria-hidden="true">
          <i /><i /><i />
        </span>
        <img src="/logo-marca.webp" alt="" width="64" height="64" />
      </div>
      <span className="carregando-texto">{texto}<b>.</b><b>.</b><b>.</b></span>
    </div>
  );
}
