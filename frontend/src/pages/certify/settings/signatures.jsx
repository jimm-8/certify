import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronLeft } from "react-icons/bs";
import signatureService from "../../../services/signatureService";
import campusService from "../../../services/campusService";
import settingsService from "../../../services/settingsService";
import FeedbackDialog from "../../../components/common/feedbackDialog";

const SignatureManager = () => {
  const navigate = useNavigate();
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [campusId, setCampusId] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [imageUrls, setImageUrls] = useState({});
  const imageUrlRef = useRef({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSig, setConfirmSig] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [campuses, setCampuses] = useState([]);
  const [campusLoading, setCampusLoading] = useState(false);
  const [wetSignature, setWetSignature] = useState(false);
  const [wetSaving, setWetSaving] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "default",
  });

  const showFeedback = (title, message, tone = "default") => {
    setFeedbackModal({
      open: true,
      title,
      message,
      tone,
    });
  };

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
    } catch (err) {
      showFeedback("Load Failed", "Failed to load signatures.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignatures();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadWetSignature = async () => {
      try {
        const data = await settingsService.getWetSignature();
        if (!mounted) return;
        setWetSignature(Boolean(data?.use_wet_signature));
      } catch (err) {
        // ignore; keep toggle usable
      }
    };
    loadWetSignature();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadCampuses = async () => {
      try {
        setCampusLoading(true);
        const data = await campusService.list();
        if (!mounted) return;
        setCampuses(data || []);
      } catch (err) {
        if (!mounted) return;
        setCampuses([]);
      } finally {
        if (mounted) setCampusLoading(false);
      }
    };
    loadCampuses();
    return () => {
      mounted = false;
    };
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
    if (!name.trim() || !title.trim() || !file) {
      showFeedback(
        "Missing Fields",
        "Name, title, and signature file are required.",
        "warning",
      );
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
      showFeedback(
        "Upload Successful",
        "Signature uploaded successfully.",
        "success",
      );
      resetForm();
      await loadSignatures();
    } catch (err) {
      showFeedback(
        "Upload Failed",
        err.response?.data?.detail || "Failed to upload signature. Try again.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (sig) => {
    try {
      await signatureService.update(sig.id, { is_active: !sig.is_active });
      await loadSignatures();
    } catch (err) {
      showFeedback(
        "Update Failed",
        "Failed to update signature status.",
        "error",
      );
    }
  };

  const handleDelete = (sig) => {
    setConfirmSig(sig);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmSig) return;
    try {
      setConfirming(true);
      await signatureService.remove(confirmSig.id);
      await loadSignatures();
      setConfirmOpen(false);
      setConfirmSig(null);
    } catch (err) {
      showFeedback("Delete Failed", "Failed to delete signature.", "error");
    } finally {
      setConfirming(false);
    }
  };

  const sortedSignatures = useMemo(() => {
    return [...signatures].sort((a, b) => {
      const rank = (sig) => {
        if (sig.deleted_at) return 2;
        return sig.is_active ? 0 : 1;
      };
      const rankDiff = rank(a) - rank(b);
      if (rankDiff === 0) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return rankDiff;
    });
  }, [signatures]);

  const campusNameById = useMemo(() => {
    const map = new Map();
    campuses.forEach((campus) => {
      map.set(String(campus.id), campus.name);
    });
    return map;
  }, [campuses]);

  const handleWetSignatureToggle = async () => {
    const next = !wetSignature;
    setWetSignature(next);
    setWetSaving(true);
    try {
      await settingsService.updateWetSignature(next);
    } catch (err) {
      setWetSignature(!next);
      showFeedback(
        "Update Failed",
        "Failed to update wet signature setting.",
        "error",
      );
    } finally {
      setWetSaving(false);
    }
  };

  return (
    <div className="py-3 space-y-4">
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-2">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-lg font-bold text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors rounded"
        >
          <BsChevronLeft style={{ strokeWidth: "0.5" }} />
          <span>Signature Management</span>
        </button>
        <p className="text-xs text-gray-500 ml-5">
          Upload and manage registrar head signatures used on certificates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
          <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-700">
                  Use wet signature
                </div>
                <div className="text-[11px] text-gray-500">
                  When on, certificates will not use digital signatures.
                </div>
              </div>
              <button
                type="button"
                onClick={handleWetSignatureToggle}
                disabled={wetSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  wetSignature ? "bg-green-500" : "bg-gray-300"
                }`}
                aria-pressed={wetSignature}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    wetSignature ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
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
                Campus (optional)
              </label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                disabled={campusLoading}
              >
                <option value="">Select campus</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
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
                    loading="lazy"
                    src={previewUrl}
                    alt="Signature preview"
                    className="max-h-24 w-auto object-contain"
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 text-sm rounded-md bg-[#ee1133] text-white hover:bg-[#c50f2a] disabled:opacity-60"
            >
              {submitting ? "Uploading..." : "Upload Signature"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Uploaded Signatures
              </h3>
              <p className="text-xs text-gray-500">
                Active signatures appear first. Deactivate to hide; soft delete
                marks a signature as deleted.
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
              {sortedSignatures.map((sig) => {
                const isDeleted = Boolean(sig.deleted_at);
                return (
                  <div
                    key={sig.id}
                    className="border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-16 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                        {imageUrls[sig.id] ? (
                          <img
                            loading="lazy"
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
                          Campus:{" "}
                          {sig.campus_id
                            ? campusNameById.get(String(sig.campus_id)) ||
                              sig.campus_id
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                          isDeleted
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : sig.is_active
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}
                      >
                        {isDeleted
                          ? "DELETED"
                          : sig.is_active
                            ? "ACTIVE"
                            : "INACTIVE"}
                      </span>
                      <button
                        onClick={() => handleToggleActive(sig)}
                        disabled={isDeleted}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {sig.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(sig)}
                        disabled={isDeleted}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Soft Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="w-full max-w-sm rounded-lg bg-white shadow-lg border border-gray-200">
            <div className="px-4 pt-4">
              <h4
                id="confirm-title"
                className="text-sm font-semibold text-gray-800"
              >
                Confirm Deletion
              </h4>
              <p className="mt-2 text-xs text-gray-600">
                Mark this signature as deleted? You can’t activate it again.
              </p>
            </div>
            <div className="px-4 pb-4 pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirming) return;
                  setConfirmOpen(false);
                  setConfirmSig(null);
                }}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={confirming}
                className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-black disabled:opacity-60"
              >
                {confirming ? "Deleting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      <FeedbackDialog
        open={feedbackModal.open}
        title={feedbackModal.title}
        message={feedbackModal.message}
        tone={feedbackModal.tone}
        onClose={() =>
          setFeedbackModal((current) => ({ ...current, open: false }))
        }
      />
    </div>
  );
};

export default SignatureManager;
