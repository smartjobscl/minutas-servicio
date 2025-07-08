import React, { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";

function App() {
  const [sede, setSede] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [responsable, setResponsable] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagenes, setImagenes] = useState([]);

  const firmaTecnicoRef = useRef();
  const firmaResponsableRef = useRef();

  const handleImageChange = (e) => {
    setImagenes(Array.from(e.target.files));
  };

  const limpiarFirmaTecnico = () => {
    firmaTecnicoRef.current.clear();
  };

  const limpiarFirmaResponsable = () => {
    firmaResponsableRef.current.clear();
  };

  const leerImagenComoDataURL = (img) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(img);
    });
  };

  const generarPDF = async () => {
    const doc = new jsPDF();
    const fechaActual = new Date();
    const fechaTexto = `${fechaActual.getDate().toString().padStart(2, '0')}-${(fechaActual.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${fechaActual.getFullYear()}`;

    // Logo
    const logo = new window.Image();
    logo.src = process.env.PUBLIC_URL + "/logo.jpg";
    await Promise.race([
      new Promise((resolve) => {
        logo.onload = () => {
          doc.addImage(logo, "JPG", 10, 10, 40, 20);
          resolve();
        };
      }),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);

    doc.setFontSize(16);
    doc.text("MINUTA DE TRABAJO", 70, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${fechaTexto}`, 150, 20);

    doc.setFontSize(12);
    doc.text(`Sede: ${sede}`, 20, 40);
    doc.text(`Técnico: ${tecnico}`, 20, 50);
    doc.text(`Responsable: ${responsable}`, 20, 60);
    doc.text("Descripción:", 20, 70);

    const descripcionLimpia = doc.splitTextToSize(descripcion, 170);
    doc.text(descripcionLimpia, 20, 80);

    // Imágenes
    let yOffset = 90 + descripcionLimpia.length * 6;
    let imgCount = 0;
    for (let i = 0; i < imagenes.length; i++) {
      const dataURL = await leerImagenComoDataURL(imagenes[i]);
      doc.addImage(dataURL, "JPEG", 20, yOffset, 100, 75);
      yOffset += 80;
      imgCount++;
      // Si ya hay 3 imágenes en la página, salto de página
      if (imgCount % 3 === 0 && i !== imagenes.length - 1) {
        doc.addPage();
        yOffset = 20;
      }
    }

    // Firmas
    const firmaTecnico = firmaTecnicoRef.current.getCanvas().toDataURL("image/png");
    const firmaResponsable = firmaResponsableRef.current.getCanvas().toDataURL("image/png");

    doc.text("Firma Técnico:", 20, yOffset + 10);
    doc.addImage(firmaTecnico, "PNG", 20, yOffset + 15, 50, 20);
    doc.text("Firma Responsable:", 100, yOffset + 10);
    doc.addImage(firmaResponsable, "PNG", 100, yOffset + 15, 50, 20);

    doc.save(`Minuta_${sede}.pdf`);
  };

  // ESTILOS para el contenedor responsivo y letra grande
  const estiloContenedor = {
    maxWidth: 400,
    margin: "auto",
    padding: 10,
    fontFamily: "Arial",
    fontSize: "1.6em", // 100% más grande
    background: "#f7f7f7",
    borderRadius: 12,
  };

  const estiloInput = {
    fontSize: "1em",
    padding: 8,
    marginBottom: 10,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 6,
    border: "1px solid #ccc"
  };

  const estiloFirma = {
    marginBottom: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  };

  return (
    <div style={estiloContenedor}>
      <h2 style={{ textAlign: "center", fontSize: "2em" }}>Minuta de Trabajo</h2>
      <input
        style={estiloInput}
        type="text"
        placeholder="Sede"
        value={sede}
        onChange={(e) => setSede(e.target.value)}
        required
      />
      <input
        style={estiloInput}
        type="text"
        placeholder="Técnico"
        value={tecnico}
        onChange={(e) => setTecnico(e.target.value)}
        required
      />
      <input
        style={estiloInput}
        type="text"
        placeholder="Responsable o jefe de tienda"
        value={responsable}
        onChange={(e) => setResponsable(e.target.value)}
        required
      />
      <textarea
        style={estiloInput}
        placeholder="Descripción del trabajo"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        rows={3}
        required
      />
      <label style={{ marginBottom: 5 }}><strong>Subir fotografías</strong></label>
      <input
        style={{ ...estiloInput, fontSize: "1em", padding: 0 }}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
      />

      {/* FIRMAS: ahora van una debajo de otra */}
      <div style={estiloFirma}>
        <p><strong>Firma Técnico:</strong></p>
        <SignatureCanvas
          ref={firmaTecnicoRef}
          penColor="black"
          canvasProps={{
            width: 300,
            height: 90,
            className: "sigCanvas",
            style: { border: "2px solid #000", borderRadius: 8 }
          }}
        />
        <button onClick={limpiarFirmaTecnico} style={{ marginTop: 8, fontSize: "1em", width: 200 }}>Limpiar Firma Técnico</button>
      </div>

      <div style={estiloFirma}>
        <p><strong>Firma Responsable:</strong></p>
        <SignatureCanvas
          ref={firmaResponsableRef}
          penColor="black"
          canvasProps={{
            width: 300,
            height: 90,
            className: "sigCanvas",
            style: { border: "2px solid #000", borderRadius: 8 }
          }}
        />
        <button onClick={limpiarFirmaResponsable} style={{ marginTop: 8, fontSize: "1em", width: 200 }}>Limpiar Firma Responsable</button>
      </div>

      <button
        onClick={generarPDF}
        style={{
          padding: 16,
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: "1.2em",
          width: "100%",
          marginTop: 20
        }}
      >
        Generar PDF
      </button>
    </div>
  );
}

export default App;
