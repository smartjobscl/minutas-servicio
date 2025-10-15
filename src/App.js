import React, { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import "./App.css";

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

  const leerArchivoComoDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const tipoDesdeDataURL = (dataURL) => {
    const match = /^data:image\/(png|jpeg|jpg)/i.exec(dataURL || "");
    if (!match) return "JPEG";
    return match[1].toLowerCase() === "png" ? "PNG" : "JPEG";
  };

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

    // Header (sin logo)
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("MINUTA DE TRABAJO", pageW / 2, 20, { align: "center" });
    doc.setFont(undefined, "normal");
    doc.setFontSize(11);
    doc.text(`Fecha: ${fechaTexto}`, pageW - marginX, 20, { align: "right" });

    // Datos
    let y = 41;
    doc.setFontSize(12);
    doc.text(`Sede: ${sede || "-"}`, marginX, y); y += 7;
    doc.text(`Técnico: ${tecnico || "-"}`, marginX, y); y += 7;
    doc.text(`Responsable (Receptor): ${responsable || "-"}`, marginX, y); y += 10;

    // Descripción
    doc.setFont(undefined, "bold");
    doc.text("Descripción:", marginX, y);
    doc.setFont(undefined, "normal");
    y += 6;
    const descLines = doc.splitTextToSize(descripcion || "-", pageW - marginX * 2);
    doc.text(descLines, marginX, y);
    y += descLines.length * 6 + 6;

    // Observaciones (recuadro)
    doc.setFont(undefined, "bold");
    doc.text("Observaciones importantes:", marginX, y);
    doc.setFont(undefined, "normal");
    y += 5;

    const obsLines = doc.splitTextToSize(observaciones || "-", pageW - marginX * 2 - 2);
    const obsBoxHeight = Math.max(24, obsLines.length * 6 + 6);
    doc.roundedRect(marginX, y, pageW - marginX * 2, obsBoxHeight, 2, 2);
    doc.text(obsLines, marginX + 2, y + 6);
    y += obsBoxHeight + 6;

    // ¿Hay espacio para firmas?
    const espacioFirmasNecesario = 70;
    let requiereNuevaParaFirmas = y > (pageH - espacioFirmasNecesario - marginY);

    // Fotos (3 por página)
    const hayImagenes = imagenes.length > 0;
    if (hayImagenes) {
      doc.addPage();
      const slotsPerPage = 3;
      const slotHeight = (pageH - marginY * 2) / slotsPerPage;
      const titleHeight = 6;
      const imagePadding = 4;
      const imageHeight = slotHeight - titleHeight - imagePadding * 2;
      const imageMaxWidth = Math.min(pageW * 0.72, pageW - marginX * 2);

      for (let i = 0; i < imagenes.length; i++) {
        const slotIndex = i % slotsPerPage;
        if (slotIndex === 0 && i !== 0) doc.addPage();

        const topY = marginY + slotIndex * slotHeight;
        const titleY = topY + titleHeight - 1;
        const imgY = topY + titleHeight + imagePadding;

        const centerX = pageW / 2;
        const imgX = centerX - imageMaxWidth / 2;

        const title = (imagenes[i].title || "").trim() || "(sin título)";
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(title, centerX, titleY, { align: "center" });
        doc.setFont(undefined, "normal");

        const dataURL = await leerArchivoComoDataURL(imagenes[i].file);
        const tipo = tipoDesdeDataURL(dataURL);
        doc.addImage(dataURL, tipo, imgX, imgY, imageMaxWidth, imageHeight);
        doc.setLineWidth(0.2);
        doc.rect(imgX, imgY, imageMaxWidth, imageHeight);
      }
      requiereNuevaParaFirmas = false;
    }

    // Firmas (lado a lado)
    if (!hayImagenes && requiereNuevaParaFirmas) {
      doc.addPage();
    }

    const finalPageH = doc.internal.pageSize.getHeight();
    let fy = hayImagenes ? finalPageH - 70 : Math.min(y + 10, finalPageH - 70);

    const colW = (pageW - marginX * 2 - 20) / 2;
    const leftX = marginX;
    const rightX = marginX + colW + 20;

    doc.setFontSize(12);
    doc.text("Firma Técnico:", leftX, fy);
    doc.text("Firma Receptor:", rightX, fy);

    const canvasTec = firmaTecnicoRef.current?.getTrimmedCanvas
      ? firmaTecnicoRef.current.getTrimmedCanvas()
      : firmaTecnicoRef.current?.getCanvas();

    const canvasResp = firmaResponsableRef.current?.getTrimmedCanvas
      ? firmaResponsableRef.current.getTrimmedCanvas()
      : firmaResponsableRef.current?.getCanvas();

    const firmaTecnico = canvasTec ? canvasTec.toDataURL("image/png") : null;
    const firmaResponsable = canvasResp ? canvasResp.toDataURL("image/png") : null;

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
        <input type="text" placeholder="Sede" value={sede} onChange={(e) => setSede(e.target.value)} required />
        <input type="text" placeholder="Técnico" value={tecnico} onChange={(e) => setTecnico(e.target.value)} required />
        <input type="text" placeholder="Responsable o jefe de tienda" value={responsable} onChange={(e) => setResponsable(e.target.value)} required />

        <textarea placeholder="Descripción del trabajo" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} required />

        <textarea placeholder="Observaciones importantes (riesgos, pendientes, repuestos, notas internas)" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={4} />

        <label><strong>Subir fotografías</strong></label>
        <input type="file" accept="image/*" multiple onChange={handleImageChange} />

        {imagenes.length > 0 && (
          <div className="galeria">
            {imagenes.map((img, idx) => (
              <div key={idx} className="galeria-item">
                <img src={img.preview} alt={`img-${idx}`} className="thumb" />
                <input type="text" className="titulo-foto" placeholder="Título de la foto (aparece en el PDF)" value={img.title} onChange={(e) => updateImageTitle(idx, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        <div className="firmas">
          <div className="firma-box">
            <p><strong>Firma Técnico</strong></p>
            <SignatureCanvas ref={firmaTecnicoRef} penColor="black" canvasProps={{ width: 320, height: 100, className: "sigCanvas" }} />
            <button className="btn limpiar" onClick={limpiarFirmaTecnico}>Limpiar Firma Técnico</button>
          </div>

          <div className="firma-box">
            <p><strong>Firma Receptor</strong></p>
            <SignatureCanvas ref={firmaResponsableRef} penColor="black" canvasProps={{ width: 320, height: 100, className: "sigCanvas" }} />
            <button className="btn limpiar" onClick={limpiarFirmaResponsable}>Limpiar Firma Receptor</button>
          </div>
        </div>

        <button className="btn enviar" onClick={generarPDF}>Generar PDF</button>
      </div>
    </div>
  );
}

export default App;
