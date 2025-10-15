import React, { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import "./App.css"; // ¡IMPORTANTE!

function App() {
  const [sede, setSede] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [responsable, setResponsable] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [imagenes, setImagenes] = useState([]); // [{file, title, preview}]

  const firmaTecnicoRef = useRef();
  const firmaResponsableRef = useRef();

  useEffect(() => {
    return () => {
      imagenes.forEach((img) => img.preview && URL.revokeObjectURL(img.preview));
    };
  }, [imagenes]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    // liberar previews anteriores
    imagenes.forEach((img) => img.preview && URL.revokeObjectURL(img.preview));
    const mapped = files.map((f) => ({
      file: f,
      title: "",
      preview: URL.createObjectURL(f),
    }));
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
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 15;
    const marginY = 15;

    const fechaActual = new Date();
    const fechaTexto = `${String(fechaActual.getDate()).padStart(2, "0")}-${String(
      fechaActual.getMonth() + 1
    ).padStart(2, "0")}-${fechaActual.getFullYear()}`;

    // Header
    doc.setFontSize(16);
    doc.text("MINUTA DE TRABAJO", pageW / 2, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Fecha: ${fechaTexto}`, pageW - marginX, 20, { align: "right" });

    // Datos
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

    // Fotos (3 por página, 1/3 cada una, centradas)
    const slotsPerPage = 3;
    const slotHeight = (pageH - marginY * 2) / slotsPerPage;
    const titleHeight = 6;
    const imagePadding = 4;
    const imageHeight = slotHeight - titleHeight - imagePadding * 2;
    const imageWidth = Math.min(pageW * 0.72, pageW - marginX * 2);

    if (imagenes.length > 0) {
      doc.addPage(); // empezar fotos en página nueva
    }

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

      const title = (imagenes[i].title || "").trim() || "(sin título)";
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(title, centerX, titleY, { align: "center" });
      doc.setFont(undefined, "normal");

      const dataURL = await leerImagenComoDataURL(imagenes[i].file);
      doc.addImage(dataURL, "JPEG", imgX, imgY, imageWidth, imageHeight);
      doc.setLineWidth(0.2);
      doc.rect(imgX, imgY, imageWidth, imageHeight);
    }

    // Firmas
    const finalPageH = doc.internal.pageSize.getHeight();
    let fy = finalPageH - 70;

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

  return (
    <div className="contenedor">
      <h2>Minuta de Trabajo</h2>

      <div className="formulario">
        <input
          type="text"
          placeholder="Sede"
          value={sede}
          onChange={(e) => setSede(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Técnico"
          value={tecnico}
          onChange={(e) => setTecnico(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Responsable o jefe de tienda"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          required
        />

        <textarea
          placeholder="Descripción del trabajo"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={4}
          required
        />

        <textarea
          placeholder="Observaciones importantes (riesgos, pendientes, repuestos, notas internas)"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={4}
        />

        <label><strong>Subir fotografías</strong></label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
        />

        {/* Miniaturas + títulos */}
        {imagenes.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {imagenes.map((img, idx) => (
              <div key={idx} style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 8
              }}>
                <img
                  src={img.preview}
                  alt={`img-${idx}`}
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #ccc" }}
                />
                <input
                  type="text"
                  placeholder="Título de la foto (aparece en el PDF)"
                  value={img.title}
                  onChange={(e) => updateImageTitle(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Firmas */}
        <div className="firmas">
          <div>
            <p><strong>Firma Técnico</strong></p>
            <SignatureCanvas
              ref={firmaTecnicoRef}
              penColor="black"
              canvasProps={{
                width: 320,
                height: 100,
                className: "sigCanvas"
              }}
            />
            <button className="limpiar" onClick={limpiarFirmaTecnico}>Limpiar Firma Técnico</button>
          </div>

          <div>
            <p><strong>Firma Responsable</strong></p>
            <SignatureCanvas
              ref={firmaResponsableRef}
              penColor="black"
              canvasProps={{
                width: 320,
                height: 100,
                className: "sigCanvas"
              }}
            />
            <button className="limpiar" onClick={limpiarFirmaResponsable}>Limpiar Firma Responsable</button>
          </div>
        </div>

        <button className="enviar" onClick={generarPDF}>Generar PDF</button>
      </div>
    </div>
  );
}

export default App;
