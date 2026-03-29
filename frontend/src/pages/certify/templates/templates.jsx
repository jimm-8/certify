import React, { useEffect, useMemo, useRef, useState } from "react";
import templateService from "../../../services/templateService";
import { useNavigate } from "react-router-dom";
import { BsChevronLeft } from "react-icons/bs";
import {
  BiUndo,
  BiRedo,
  BiBold,
  BiItalic,
  BiUnderline,
  BiAlignLeft,
  BiAlignMiddle,
  BiAlignRight,
  BiListUl,
  BiListOl,
} from "react-icons/bi";
import { FaXmark } from "react-icons/fa6";

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState("");
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [viewMode, setViewMode] = useState("visual");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const iframeRef = useRef(null);
  const navigate = useNavigate();

  const apiBase =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
  const assetsBase = `${apiBase}/templates/assets/`;

  const normalizeAssetLinks = (html) => {
    if (!html) return html;
    return html.replace(
      /(src|href)=["'](?!https?:|data:|\/api\/v1\/templates\/assets\/)([^"']+)["']/gi,
      (_, attr, url) => {
        if (url.startsWith("/"))
          return `${attr}="${assetsBase}${url.slice(1)}"`;
        return `${attr}="${assetsBase}${url}"`;
      },
    );
  };

  const previewHtml = useMemo(() => {
    if (!content) return "";
    const baseTag = `<base href="${assetsBase}">`;
    const withBase = content.includes("<head>")
      ? content.replace("<head>", `<head>${baseTag}`)
      : `<!doctype html><html><head>${baseTag}</head><body>${content}</body></html>`;
    return normalizeAssetLinks(withBase);
  }, [content, assetsBase]);

  const editorHtml = useMemo(() => {
    if (!content) return "";
    return normalizeAssetLinks(content);
  }, [content, assetsBase]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await templateService.listTemplates();
        const list = data?.templates || [];
        setTemplates(list);
        if (list.length) {
          setSelected(list[0]);
        }
      } catch (err) {
        setError("Failed to load templates.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const loadTemplate = async () => {
      try {
        setLoading(true);
        const data = await templateService.getTemplate(selected);
        const html = data.content || "";
        setContent(html);
        setOriginalContent(html);
        setError("");
      } catch (err) {
        setError("Failed to load template content.");
      } finally {
        setLoading(false);
      }
    };
    loadTemplate();
  }, [selected]);

  const handleSave = async () => {
    try {
      setSaving(true);
      let nextContent = content;
      if (viewMode === "visual" && iframeRef.current?.contentDocument) {
        const doc = iframeRef.current.contentDocument;
        nextContent = doc.documentElement.outerHTML;
        const baseTag = `<base href="${assetsBase}">`;
        nextContent = nextContent.replace(baseTag, "");
        nextContent = nextContent.replaceAll(assetsBase, "");
      }
      await templateService.updateTemplate(selected, nextContent);
      setContent(nextContent);
      setSuccess("Template saved.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const exec = (cmd, value = null) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.execCommand(cmd, false, value);
    setContent(doc.documentElement.outerHTML);
  };

  const handleIframeLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    try {
      doc.designMode = "on";
    } catch {
      // ignore
    }
  };

  const toolbarBtn =
    "flex items-center gap-1 px-2 py-1 text-lg border border-gray-200 rounded bg-white hover:bg-gray-100";

  const formatName = (name) =>
    name
      .replace(/\.html$/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="py-3">
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
              className="text-lg font-bold text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors  rounded"
            >
              <BsChevronLeft style={{ strokeWidth: "0.5" }} />
              <span>Template Editor</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded-md overflow-hidden text-xs">
              <button
                onClick={() => setViewMode("visual")}
                className={`px-3 py-1.5 ${
                  viewMode === "visual"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600"
                }`}
              >
                Visual
              </button>
              <button
                onClick={() => setViewMode("html")}
                className={`px-3 py-1.5 ${
                  viewMode === "html"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600"
                }`}
              >
                HTML
              </button>
            </div>
            <button
              onClick={() => {
                setContent(originalContent);
                setSuccess("Reset to default.");
                setTimeout(() => setSuccess(""), 1500);
              }}
              disabled={!originalContent || saving}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Reset to Default
            </button>
            <button
              onClick={() => setPreviewOpen(true)}
              disabled={!content}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={!selected || saving}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 text-xs text-red-600">{String(error)}</div>
        )}
        {success && (
          <div className="mb-3 text-xs text-green-600">{success}</div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Template File
              </label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {templates.map((name) => (
                  <option key={name} value={name}>
                    {formatName(name)}
                  </option>
                ))}
              </select>
            </div>

            {viewMode === "visual" ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Template Editor
                </label>
                <div className="flex flex-wrap gap-1 border border-gray-200 rounded-md p-2 bg-gray-50">
                  <button
                    onClick={() => exec("bold")}
                    className={toolbarBtn}
                    title="Bold"
                  >
                    <BiBold />
                  </button>
                  <button
                    onClick={() => exec("italic")}
                    className={toolbarBtn}
                    title="Italic"
                  >
                    <BiItalic />
                  </button>
                  <button
                    onClick={() => exec("underline")}
                    className={toolbarBtn}
                    title="Underline"
                  >
                    <BiUnderline />
                  </button>
                  <button
                    onClick={() => exec("justifyLeft")}
                    className={toolbarBtn}
                    title="Align Left"
                  >
                    <BiAlignLeft />
                  </button>
                  <button
                    onClick={() => exec("justifyCenter")}
                    className={toolbarBtn}
                    title="Align Center"
                  >
                    <BiAlignMiddle />
                  </button>
                  <button
                    onClick={() => exec("justifyRight")}
                    className={toolbarBtn}
                    title="Align Right"
                  >
                    <BiAlignRight />
                  </button>
                  <button
                    onClick={() => exec("insertUnorderedList")}
                    className={toolbarBtn}
                    title="Bullet List"
                  >
                    <BiListUl />
                  </button>
                  <button
                    onClick={() => exec("insertOrderedList")}
                    className={toolbarBtn}
                    title="Numbered List"
                  >
                    <BiListOl />
                  </button>
                  <button
                    onClick={() => exec("undo")}
                    className={toolbarBtn}
                    title="Undo"
                  >
                    <BiUndo />
                  </button>
                  <button
                    onClick={() => exec("redo")}
                    className={toolbarBtn}
                    title="Redo"
                  >
                    <BiRedo />
                  </button>
                  <select
                    onChange={(e) => exec("fontSize", e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                    defaultValue="3"
                  >
                    <option value="2">Small</option>
                    <option value="3">Normal</option>
                    <option value="4">Large</option>
                    <option value="5">XL</option>
                  </select>
                </div>
                <iframe
                  ref={iframeRef}
                  title="template-editor"
                  srcDoc={editorHtml}
                  onLoad={handleIframeLoad}
                  className="w-full h-[720px] border border-gray-300 rounded-md mt-2 bg-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Editing the real template file from the backend.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Template HTML
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={18}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-mono leading-5"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Editing the real template file from the backend.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewOpen && (
        <div
          onClick={() => setPreviewOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
              <div className="text-sm font-semibold text-gray-800">
                Template Preview
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-lg rounded-md  border-gray-200 hover:text-[#B22222]"
              >
                <FaXmark />
              </button>
            </div>
            <div className="flex-1 bg-gray-50 p-2 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">
                  Loading template...
                </div>
              ) : (
                <iframe
                  title="template-preview"
                  srcDoc={previewHtml}
                  className="w-full h-full border-0 bg-white rounded-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
