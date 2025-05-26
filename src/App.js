import React, { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import './App.css';

export default function App() {
  const [sede, setSede] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [correoJefe, setCorreoJefe] = useState("");
  const [imagenes, setImagenes] = useState([]);
  const [nombreTecnicoFirma, setNombreTecnicoFirma] = useState("");
  const [nombreClienteFirma, setNombreClienteFirma] = useState("");

  const firmaTecnicoRef = useRef();
  const firmaClienteRef = useRef();

  const handleImageChange = (e) => {
    setImagenes(Array.from(e.target.files));
  };

  const generarPDF = async () => {
    const doc = new jsPDF();

    // Fecha actual
    const fechaActual = new Date();
    const fechaTexto = `${fechaActual.getDate().toString().padStart(2, '0')}-${(fechaActual.getMonth() + 1)
      .toString().padStart(2, '0')}-${fechaActual.getFullYear()}`;

    doc.setFontSize(16);
    doc.text("MINUTAS DE SERVICIO", 60, 20);

    doc.setFontSize(10);
    doc.text(`Fecha: ${fechaTexto}`, 150, 20);

    doc.setFontSize(12);
    doc.text(`Sede: ${sede}`, 20, 40);
    doc.text(`Técnico: ${tecnico}`, 20, 50);
    doc.text("Descripción:", 20, 60);

    const descripcionLimpia = doc.splitTextToSize(descripcion, 170);
    doc.text(descripcionLimpia, 20, 70);

    let yOffset = 80 + descripcionLimpia.length * 6;

    for (const img of imagenes) {
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = (e) => {
          doc.addImage(e.target.result, "JPEG", 20, yOffset, 80, 60);
          yOffset += 65;
          resolve();
        };
        reader.readAsDataURL(img);
      });
    }

    // Firmas con nombre sobre la firma
    const firmaTecnico = firmaTecnicoRef.current.getCanvas().toDataURL("image/png");
    const firmaCliente = firmaClienteRef.current.getCanvas().toDataURL("image/png");

    doc.setFontSize(12);
    doc.text("Firma Técnico:", 20, yOffset);
    doc.setFontSize(10);
    doc.text(nombreTecnicoFirma || "Nombre técnico", 25, yOffset + 7);
    doc.addImage(firmaTecnico, "PNG", 20, yOffset + 10, 50, 20);

    doc.setFontSize(12);
    doc.text("Firma responsable:", 100, yOffset);
    doc.setFontSize(10);
    doc.text(nombreClienteFirma || "Nombre responsable", 105, yOffset + 7);
    doc.addImage(firmaCliente, "PNG", 100, yOffset + 10, 50, 20);

    doc.save(`Minutas_de_Servicio_${sede}.pdf`);

    
  return (
    <div className="contenedor">
      <h2>Minutas de Servicio</h2>
      <form className="formulario" onSubmit={e => {e.preventDefault(); generarPDF();}}>
        <input
          type="text"
          placeholder="Sede"
          value={sede}
          onChange={e => setSede(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Técnico"
          value={tecnico}
          onChange={e => setTecnico(e.target.value)}
          required
        />
        <textarea
          placeholder="Descripción del trabajo"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          rows={3}
          required
        />
        <input
          type="email"
          placeholder="Correo de jefe de tienda (opcional)"
          value={correoJefe}
          onChange={e => setCorreoJefe(e.target.value)}
        />

        <label style={{marginTop:10}}>Subir fotos</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
        />

        <div className="firmas">
          <div>
            <label>Nombre Técnico que firma</label>
            <input
              type="text"
              placeholder="Nombre técnico"
              value={nombreTecnicoFirma}
              onChange={e => setNombreTecnicoFirma(e.target.value)}
              required
            />
            <SignatureCanvas
              ref={firmaTecnicoRef}
              penColor="black"
              canvasProps={{
                width: 200,
                height: 80,
                className: "sigCanvas",
                style: { border: "1px solid #aaa", borderRadius:8 }
              }}
            />
            <button type="button"
              className="limpiar"
              onClick={() => firmaTecnicoRef.current.clear()}
            >
              Limpiar firma
            </button>
          </div>
          <div>
            <label>Nombre responsable que firma</label>
            <input
              type="text"
              placeholder="Nombre responsable"
              value={nombreClienteFirma}
              onChange={e => setNombreClienteFirma(e.target.value)}
              required
            />
            <SignatureCanvas
              ref={firmaClienteRef}
              penColor="black"
              canvasProps={{
                width: 200,
                height: 80,
                className: "sigCanvas",
                style: { border: "1px solid #aaa", borderRadius:8 }
              }}
            />
            <button type="button"
              className="limpiar"
              onClick={() => firmaClienteRef.current.clear()}
            >
              Limpiar firma
            </button>
          </div>
        </div>
        <button className="enviar" type="submit">Generar PDF y Abrir Gmail</button>
      </form>
    </div>
  );