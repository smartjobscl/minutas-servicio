import React, { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";

function App() {
  const [sede, setSede] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [responsable, setResponsable] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [imagenes, setImagenes] = useState([]); // [{file, title, preview}...]

  const firmaTecnicoRef = useRef();
  const firmaResponsableRef = useRef();

  // Limpia previews al desmontar
  useEffect(() => {
    return () => {
      imagenes.forEach(img => img.preview && URL.revokeObjectURL(img.preview));
    };
  }, [imagenes]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((f) => ({
      file: f,
      title: "",
      preview: URL.createObjectURL(f),
    }));
    // Si vuelven a subir, liberar previews anteriores
    imagenes.forEach(img => img.preview && URL.revokeObjectURL(img.preview));
    setImagenes(mapped);
  };

  const updateImageTitle = (idx, title) => {
    setImagenes((arr) => {
      const next = [...arr];
      next[idx] = { ...next[idx], title };
      return next;
    });
  };

  const limpiarFirmaTecnico = () => firmaTecnicoRef.current?.clear();
  const limpiarFirmaResponsable = () => firmaResponsableRef.current?.clear();

  const leerImagenComoDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const generarPDF = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" }); // A4
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 15;
    const marginY = 15;

    const fechaActual = new Date();
    const fechaTexto = `${fechaActual.getDate().toString().padStart(2, "0")}-${(fechaActual.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${fechaActual.getFullYear()}`;

    // Header
    doc.setFontSize(16);
    doc.text("MINUTA DE TRABAJO", pageW / 2, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Fecha: ${fechaTexto}`, pageW - marginX, 20, { align: "right" });

    // Datos básicos
    let y = 35;
    doc.setFontSize(12);
    doc.text(`Sede: ${sede || "-"}`, marginX, y); y += 7;
    doc.text(`Técnico: ${tecnico || "-"}`, marginX, y); y += 7;
    doc.text(`Responsable: ${responsable || "-"}`, marginX, y); y += 10;

    // Descripción
    doc.setFont(undefined, "bold");
    doc.text("Descripción:", marginX, y);
    doc.setFont(undefined, "normal");
    y += 6;
    const descLines = doc.splitTextToSize(descripcion || "-", pageW - marginX * 2);
    doc.text(descLines, marginX, y);
    y += descLines.length * 6 + 6;

    // Observaciones importantes (recuadro)
    doc.setFont(undefined, "bold");
    doc.text("Observaciones importantes:", marginX, y);
    doc.setFont(undefined, "normal");
    y += 5;

    const obsLines = doc.splitTextToSize(observaciones || "-", pageW - marginX * 2 - 2);
    const obsBoxHeight = Math.max(24, obsLines.length * 6 + 6);
    doc.roundedRect(marginX, y, pageW - marginX * 2, obsBoxHeight, 2, 2);
    doc.text(obsLines, marginX + 2, y + 6);
    y += obsBoxHeight + 10;

    // ---- FOTOS: 3 por página, cada una ocupa 1/3 de la altura ----
    // Secciones verticales iguales
    const slotsPerPage = 3;
    const slotHeight = (pageH - marginY * 2) / slotsPerPage; // altura por slot (≈ 1/3 de página)
    const titleHeight = 6; // alto reservado para título
    const imagePadding = 4;
    const imageHeight = slotHeight - titleHeight - imagePadding * 2;
    const imageWidth = Math.min(pageW * 0.72, pageW - marginX * 2); // centrado, ancho uniforme

    // Empezamos una nueva página si no cabe el primer bloque de imágenes
    if (imagenes.length > 0) {
      doc.addPage();
    }

    imagenes.length === 0 && (y = y); // no-op para claridad

    for (let i = 0; i < imagenes.length; i++) {
      const slotIndex = i % slotsPerPage;
      if (slotIndex === 0 && i !== 0) {
        doc.addPage();
      }
      const topY = marginY + slotIndex * slotHeight;
      const titleY = topY + titleHeight - 1;
      const imgY = topY + titleHeight + imagePadding;

      const centerX = pageW / 2;
      const imgX = centerX - imageWidth / 2;

      // Título centrado
      const title = (imagenes[i].title || "").trim() || "(sin título)";
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(title, centerX, titleY, { align: "center" });
      doc.setFont(undefined, "normal");

      // Imagen del mismo tamaño para todas
      const dataURL = await leerImagenComoDataURL(imagenes[i].file);
      // Fuerza tamaño uniforme (ancho y alto fijos)
      doc.addImage(dataURL, "JPEG", imgX, imgY, imageWidth, imageHeight);
      // Marco fino opcional para uniformidad visual
      doc.setLineWidth(0.2);
      doc.rect(imgX, imgY, imageWidth, imageHeight);
    }

    // ---- Firmas (lado a lado) ----
    // Colocarlas al final de la última página
    const finalPageH = doc.internal.pageSize.getHeight();
    let fy = finalPageH - 70; // altura base para firmas
    // Si hubo cero imágenes, seguimos en la primera página y usamos 'y'
    if (imagenes.length === 0) {
      if (y > finalPageH - 90) {
        doc.addPage();
        fy = marginY + 10;
      } else {
        fy = y + 10;
      }
    }

    const colW = (pageW - marginX * 2 - 20) / 2;
    const leftX = marginX;
    const rightX = marginX + colW + 20;

    doc.setFontSize(12);
    doc.text("Firma Técnico:", leftX, fy);
    doc.text("Firma Responsable:", rightX, fy);

    const firmaTecnico = firmaTecnicoRef.current?.getCanvas().toDataURL("image/png");
    const firmaResponsable = firmaResponsableRef.current?.getCanvas().toDataURL("image/png");

    const sigH = 25;
    const sigW = 60;
    if (firmaTecnico) doc.addImage(firmaTecnico, "PNG", leftX, fy + 3, sigW, sigH);
    if (firmaResponsable) doc.addImage(firmaResponsable, "PNG", rightX, fy + 3, sigW, sigH);

    doc.save(`Minuta_${sede || "sede"}.pdf`);
  };

  // ==== ESTILOS UI ====
  const estiloContenedor = {
    maxWidth: 420,
    margin: "auto",
    padding: 12,
    fontFamily: "Arial",
    fontSize: "1.1em",
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
    border: "1px solid #ccc",
  };

  const estiloFirma = {
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const estiloThumbGrid = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    marginTop: 6,
  };

  const estiloThumbItem = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 8,
  };

  const estiloThumbImg = {
    width: 72,
    height: 72,
    objectFit: "cover",
    borderRadius: 6,
    border: "1px solid #ccc",
  };

  return (
    <div style={estiloContenedor}>
      <h2 style={{ textAlign: "center", fontSize: "1.6em", marginBottom: 8 }}>Minuta de Trabajo</h2>

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
        rows={4}
        required
      />

      <textarea
        style={estiloInput}
        placeholder="Observaciones importantes (ej.: riesgos, pendientes, repuestos, notas internas)"
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        rows={4}
      />

      <label style={{ marginBottom: 5 }}><strong>Subir fotografías</strong></label>
      <input
        style={{ ...estiloInput, fontSize: "1em", padding: 4 }}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
      />

      {/* Vista previa + títulos */}
      {imagenes.length > 0 && (
        <div style={estiloThumbGrid}>
          {imagenes.map((img, idx) => (
            <div key={idx} style={estiloThumbItem}>
              <img src={img.preview} alt={`img-${idx}`} style={estiloThumbImg} />
              <input
                type="text"
                style={{ ...estiloInput, marginBottom: 0 }}
                placeholder="Título de la foto (se mostrará en el PDF)"
                value={img.title}
                onChange={(e) => updateImageTitle(idx, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {/* FIRMAS */}
      <div style={{ ...estiloFirma, marginTop: 12 }}>
        <p><strong>Firma Técnico:</strong></p>
        <SignatureCanvas
          ref={firmaTecnicoRef}
          penColor="black"
          canvasProps={{
            width: 320,
            height: 100,
            className: "sigCanvas",
            style: { border: "2px solid #000", borderRadius: 8 },
          }}
        />
        <button onClick={limpiarFirmaTecnico} style={{ marginTop: 8, fontSize: "1em", width: 220 }}>
          Limpiar Firma Técnico
        </button>
      </div>

      <div style={estiloFirma}>
        <p><strong>Firma Responsable:</strong></p>
        <SignatureCanvas
          ref={firmaResponsableRef}
          penColor="black"
          canvasProps={{
            width: 320,
            height: 100,
            className: "sigCanvas",
            style: { border: "2px solid #000", borderRadius: 8 },
          }}
        />
        <button onClick={limpiarFirmaResponsable} style={{ marginTop: 8, fontSize: "1em", width: 220 }}>
          Limpiar Firma Responsable
        </button>
      </div>

      <button
        onClick={generarPDF}
        style={{
          padding: 14,
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: "1.1em",
          width: "100%",
          marginTop: 12,
        }}
      >
        Generar PDF
      </button>
    </div>
  );
}

export default App;

