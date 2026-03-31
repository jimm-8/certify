import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronLeft } from "react-icons/bs";
import signatureService from "../../../services/signatureService";

const SignatureManager = () => {
  const navigate = useNavigate();
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [campusId, setCampusId] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [imageUrls, setImageUrls] = useState({});
  const imageUrlRef = useRef({});

  const resetForm = () => {
    setName("");
    setTitle("");
    setCampusId("");
    setFile(null);
  };

  const loadSignatures = async () => {
    try {
      setLoading(true);
      const data = await signatureService.list(false);
      setSignatures(data || []);
      setError("");
    } catch (err) {
      setError("Failed to load signatures.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignatures();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    const loadImages = async () => {
      for (const sig of signatures) {
        if (!sig?.id || !sig.signature_path) continue;
        if (imageUrlRef.current[sig.id]) continue;
        try {
          const blob = await signatureService.fetchFile(sig.id);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          imageUrlRef.current[sig.id] = url;
          setImageUrls((prev) => ({ ...prev, [sig.id]: url }));
        } catch (err) {
          // Ignore image load failures; keep list usable
        }
      }
    };
    loadImages();
    return () => {
      cancelled = true;
    };
  }, [signatures]);

  useEffect(() => {
    return () => {
      Object.values(imageUrlRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!name.trim() || !title.trim() || !file) {
      setError("Name, title, and signature file are required.");
      return;
    }
    try {
      setSubmitting(true);
      await signatureService.upload({
        name: name.trim(),
        title: title.trim(),
        campusId: campusId.trim(),
        file,
      });
      setSuccess("Signature uploaded successfully.");
      resetForm();
      await loadSignatures();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to upload signature. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (sig) => {
    try {
      setError("");
      await signatureService.update(sig.id, { is_active: !sig.is_active });
      await loadSignatures();
    } catch (err) {
      setError("Failed to update signature status.");
    }
  };

  const handleDelete = async (sig, hardDelete = false) => {
    const confirmMsg = hardDelete
      ? "Permanently delete this signature? This cannot be undone."
      : "Deactivate this signature?";
    if (!window.confirm(confirmMsg)) return;
    try {
      setError("");
      await signatureService.remove(sig.id, hardDelete);
      await loadSignatures();
    } catch (err) {
      setError("Failed to delete signature.");
    }
  };

  const sortedSignatures = useMemo(() => {
    return [...signatures].sort((a, b) => {
      if (a.is_active === b.is_active) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return a.is_active ? -1 : 1;
    });
  }, [signatures]);

  return (
    <div className="py-3 space-y-4">
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-lg font-bold text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors rounded"
        >
          <BsChevronLeft style={{ strokeWidth: "0.5" }} />
          <span>Signature Management</span>
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Upload and manage registrar head signatures used on certificates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800">
            Upload New Signature
          </h3>
          <form onSubmit={handleUpload} className="mt-3 space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Official Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Maria Santos"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Official Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="University Registrar"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Campus ID (optional)
              </label>
              <input
                type="number"
                min="1"
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                placeholder="1"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Signature File (PNG/JPG)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-xs text-gray-600"
              />
              {previewUrl && (
                <div className="mt-2 border border-dashed border-gray-200 rounded-md p-2 bg-gray-50">
                  <img
                    src={previewUrl}
                    alt="Signature preview"
                    className="max-h-24 w-auto object-contain"
                  />
                </div>
              )}
            </div>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                {success}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 text-sm rounded-md bg-[#ee1133] text-white hover:bg-[#c50f2a] disabled:opacity-60"
            >
              {submitting ? "Uploading..." : "Upload Signature"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Uploaded Signatures
              </h3>
              <p className="text-xs text-gray-500">
                Active signatures appear first. Deactivate to hide without
                deleting.
              </p>
            </div>
            <button
              onClick={loadSignatures}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-xs text-gray-500">Loading signatures...</div>
          ) : sortedSignatures.length === 0 ? (
            <div className="text-xs text-gray-500">
              No signatures uploaded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSignatures.map((sig) => (
                <div
                  key={sig.id}
                  className="border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-16 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                      {imageUrls[sig.id] ? (
                        <img
                          src={imageUrls[sig.id]}
                          alt={`${sig.name} signature`}
                          className="max-h-14 w-auto object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400">
                          No preview
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {sig.name}
                      </div>
                      <div className="text-xs text-gray-500">{sig.title}</div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        Campus: {sig.campus_id || "N/A"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                        sig.is_active
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}
                    >
                      {sig.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <button
                      onClick={() => handleToggleActive(sig)}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {sig.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(sig, false)}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Soft Delete
                    </button>
                    <button
                      onClick={() => handleDelete(sig, true)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-black"
                    >
                      Hard Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignatureManager;
