import { useEffect, useState } from "react";
import requestService from "../../services/requestService";

export default function TemplatePreview() {
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await requestService.getCertificateTypes();
        setCertificateTypes(data || []);
        if (data && data.length > 0) setSelected(data[0].name);
      } catch (err) {
        console.error("Failed to load certificate types", err);
      }
    };
    fetch();
  }, []);

  const apiBase =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
  const iframeSrc = selected ? `${apiBase}/certificate-types/preview/${encodeURIComponent(selected)}` : "about:blank";

  return (
    <div className="p-4">
      <h2 className="mb-3">Template Preview</h2>

      <div className="mb-3">
        <label className="form-label">Certificate Type</label>
        <select
          className="form-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {certificateTypes.map((ct) => (
            <option key={ct.id} value={ct.name}>
              {ct.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-2">
        <a href={iframeSrc} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
          Open preview in new tab
        </a>
      </div>

      <div style={{ border: "1px solid #ddd", minHeight: 400 }}>
        <iframe
          title="template-preview"
          src={iframeSrc}
          style={{ width: "100%", height: "80vh", border: "none" }}
        />
      </div>
    </div>
  );
}
