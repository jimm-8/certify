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

const INJECTED_PAPER_STYLE = `
  <style>
    body { 
      background-color: #e5e7eb !important; 
      display: flex; 
      justify-content: center; 
      margin: 0; 
    }
    .paper-shell {
      background-color: white !important;
      width: 216mm; 
      min-height: 330mm; 
      padding: 10mm;
      box-shadow: 0 0 15px rgba(0,0,0,0.2);
      box-sizing: border-box;
      margin-top: -30px;
      margin-bottom: 40px;
    }
    .paper-shell:focus {
      outline: none;
    }
  </style>
`;

const DUMMY_FILL_STYLE = `
  <style>
    /* Remove underline borders used for fillable fields */
    .blank,
    .f.blank,
    .fill-cert,
    .line,
    .underline,
    [class*="line"],
    [class*="underline"] {
      border-bottom: none !important;
      text-decoration: none !important;
    }

    /* Catch inline styles like style="border-bottom: 1px solid" */
    *[style*="border-bottom"] {
      border-bottom: none !important;
    }

    /* Optional: if using HR as lines */
    hr {
      border: none !important;
    }
  </style>
`;

const DUMMY_SIGNATURE_STYLE = `
  <style>
    .signature-block,
    .signature,
    [class*="signature"] {
      display: block;
      width: 100%;
      text-align: right;
    }
    .signature-img, [class*="sig-img"], img.signature {
      content: url('');
      display: inline-block;
      width: 120px;
      height: 48px;
      background: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 4px,
        rgba(30,80,200,0.15) 4px,
        rgba(30,80,200,0.15) 5px
      );
      border-bottom: 2px solid #1e40af;
      border-radius: 2px;
    }
  </style>
`;

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState("");
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [viewMode, setViewMode] = useState("visual");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveTarget, setSaveTarget] = useState("template");
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [useDummyData, setUseDummyData] = useState(true);
  const iframeRef = useRef(null);
  const navigate = useNavigate();
  const initializedRef = useRef(false);

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

  const applyDummyTemplateData = (html) => {
    if (!html) return html;
    const placeholders = {
      student_name: "JUAN DELA CRUZ",
      student_honorific: "Mr.",
      student_surname: "DELA CRUZ",
      program: "BS Computer Engineering",
      program_name: "BS Computer Engineering",
      college_name: "College of Engineering",
      campus_name: "Main",
      campus_address: "Sample Address, Batangas City",
      campus_telNo: "(043) 000-0000",
      campus_email: "registrar@batstate-u.edu.ph",
      date_issued: "January 1, 2026",
      date_issued_day: "1",
      date_issued_month: "January",
      date_issued_year: "2026",
      request_purpose: "employment",
      academic_year: "2025-2026",
      first_enrollment_semester: "1st",
      first_enrollment_academic_year: "2022-2023",
      enrollment_to_semester: "2nd",
      enrollment_to_academic_year: "2024-2025",
      course_name: "Sample Curriculum",
      curriculum_acad_year: "2022-2023",
      campus_certCode: "BSU-MAIN",
      or_number: "OR-2026-00001",
      name_official: "MARIA SANTOS",
      official_title: "Head, Registration Services",
    };

    const replaceVariable = (match, expr) => {
      const key = String(expr || "")
        .trim()
        .split("|")[0]
        .split(".")
        .pop()
        .trim();
      return placeholders[key] || "Sample";
    };

    let result = html
      .replace(/{%[\s\S]*?%}/g, "")
      .replace(/{{\s*([^}]+)\s*}}/g, replaceVariable)
      .replace(/\b(blank|fill-cert|underline|line)\b/g, "");

    // Replace signature images via DOM parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(result, "text/html");
    const dummySigSrc = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='50'%3E%3Cpath d='M10 35 C30 10, 50 40, 70 20 C90 5, 110 38, 150 25' stroke='%231e3a8a' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E`;

    doc.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const cls = img.getAttribute("class") || "";
      const alt = img.getAttribute("alt") || "";
      if (
        src.includes("sign") ||
        cls.toLowerCase().includes("sign") ||
        alt.toLowerCase().includes("sign") ||
        !src ||
        src === "#"
      ) {
        img.setAttribute("src", dummySigSrc);
        img.style.width = "160px";
        img.style.height = "50px";
      }
    });

    return doc.body.innerHTML;
  };

  const needsPaperStyle = useMemo(() => {
    return [
      "certificate_of_course_description.html",
      "certificate_of_grades.html",
    ].includes(selected);
  }, [selected]);

  const editorHtml = useMemo(() => {
    if (!content) return "";
    let html = normalizeAssetLinks(content);
    if (useDummyData) {
      html = applyDummyTemplateData(html);
    }

    const dummyStyle = useDummyData
      ? DUMMY_FILL_STYLE + DUMMY_SIGNATURE_STYLE
      : "";
    if (needsPaperStyle) {
      // Inject the style and wrap the content
      html = `<!DOCTYPE html><html><head>${INJECTED_PAPER_STYLE}${dummyStyle}</head><body><div class="paper-shell">${html}</div></body></html>`;
    }
    return html;
  }, [content, needsPaperStyle, useDummyData]);

  const previewHtml = useMemo(() => {
    if (!content) return "";
    const baseTag = `<base href="${assetsBase}">`;
    let html = content;

    if (useDummyData) {
      html = applyDummyTemplateData(html);
    }

    const dummyStyle = useDummyData
      ? DUMMY_FILL_STYLE + DUMMY_SIGNATURE_STYLE
      : "";
    if (needsPaperStyle) {
      html = `<div class="paper-shell">${html}</div>`;
      const fullHtml = html.includes("<head>")
        ? html.replace(
            "<head>",
            `<head>${baseTag}${INJECTED_PAPER_STYLE}${dummyStyle}`,
          )
        : `<!DOCTYPE html><html><head>${baseTag}${INJECTED_PAPER_STYLE}${dummyStyle}</head><body>${html}</body></html>`;
      return normalizeAssetLinks(fullHtml);
    }

    // Fallback for other templates
    const withBase = html.includes("<head>")
      ? html.replace("<head>", `<head>${baseTag}${dummyStyle}`)
      : `<!doctype html><html><head>${baseTag}${dummyStyle}</head><body>${html}</body></html>`;
    return normalizeAssetLinks(withBase);
  }, [content, assetsBase, needsPaperStyle, useDummyData]);

  // const editorHtml = useMemo(() => {
  //   if (!content) return "";
  //   // We apply the same wrapper logic here for the visual editor
  //   const wrapped = `<!doctype html><html><head>${PAPER_STYLE}</head><body><div class="paper-container">${content}</div></body></html>`;
  //   return normalizeAssetLinks(wrapped);
  // }, [content]);

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

  const handleResetToDefault = async () => {
    // 1. Confirm with the user (optional but safer)
    if (
      !window.confirm(
        "Are you sure? This will revert all unsaved changes to the original template file.",
      )
    )
      return;

    if (!selected) return;

    // 2. Re-load from the default template file (source of truth)
    let fileContent = "";
    try {
      setLoading(true);
      setSaving(true);
      const data = await templateService.getDefaultTemplate(selected);
      fileContent = data.content || "";
      await templateService.updateTemplate(selected, fileContent);
      setContent(fileContent);
      setOriginalContent(fileContent);
      setError("");
    } catch (err) {
      setError(
        "Failed to reload default template. Ensure backend has templates_defaults.",
      );
      return;
    } finally {
      setSaving(false);
      setLoading(false);
    }

    // 3. Force the Iframe to re-render with the 'Paper' shell if needed
    if (viewMode === "visual" && iframeRef.current?.contentDocument) {
      const doc = iframeRef.current.contentDocument;

      // Construct the reset HTML with the Paper Shell logic
      let resetHtml = normalizeAssetLinks(fileContent);
      if (useDummyData) {
        resetHtml = applyDummyTemplateData(resetHtml);
      }

      if (needsPaperStyle) {
        resetHtml = `
        <!DOCTYPE html>
        <html>
          <head>${INJECTED_PAPER_STYLE}</head>
          <body>
            <div class="paper-shell">${resetHtml}</div>
          </body>
        </html>`;
      }

      doc.open();
      doc.write(resetHtml);
      doc.close();

      // Re-enable editing
      setTimeout(() => {
        if (iframeRef.current?.contentDocument) {
          iframeRef.current.contentDocument.designMode = "on";
        }
      }, 50);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      let nextContent = content;

      if (viewMode === "visual" && iframeRef.current?.contentDocument) {
        if (useDummyData) {
          setError("Disable dummy data before saving from Visual editor.");
          setSaving(false);
          return;
        }
        const doc = iframeRef.current.contentDocument;

        if (needsPaperStyle) {
          // Only grab what is INSIDE the paper shell
          const shell = doc.querySelector(".paper-shell");
          nextContent = shell ? shell.innerHTML : doc.body.innerHTML;
        } else {
          nextContent = doc.documentElement.outerHTML;
          const baseTag = `<base href="${assetsBase}">`;
          nextContent = nextContent.replace(baseTag, "");
        }

        nextContent = nextContent.replaceAll(assetsBase, "");
      }

      await templateService.updateTemplate(selected, nextContent, {
        target: saveTarget === "default" ? "defaults" : undefined,
      });
      if (viewMode !== "visual") setContent(nextContent);
      setSuccess(
        saveTarget === "default"
          ? "Default template saved."
          : "Template saved.",
      );
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
  };

  const handleIframeLoad = () => {
    setTimeout(() => {
      const doc = iframeRef.current?.contentDocument;
      if (doc) doc.designMode = useDummyData ? "off" : "on";
    }, 50);
  };

  useEffect(() => {
    if (viewMode !== "visual") return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.designMode = useDummyData ? "off" : "on";
  }, [useDummyData, viewMode, selected]);

  const handleOpenPreview = () => {
    if (
      viewMode === "visual" &&
      !useDummyData &&
      iframeRef.current?.contentDocument
    ) {
      const doc = iframeRef.current.contentDocument;
      let live = doc.documentElement.outerHTML;
      live = live.replace(`<base href="${assetsBase}">`, "");
      live = live.replaceAll(assetsBase, "");
      setContent(live);
    }
    setPreviewOpen(true);
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
            <label className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md gap-2 ">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={useDummyData}
                onChange={(e) => setUseDummyData(e.target.checked)}
              />
              View with Sample Data
            </label>
            <button
              onClick={handleResetToDefault}
              disabled={!originalContent || saving}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Reset to Default
            </button>
            <button
              onClick={handleOpenPreview}
              disabled={!content}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Preview
            </button>
            <div className="relative">
              <button
                onClick={() => setSaveMenuOpen((open) => !open)}
                disabled={!selected || saving}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              {saveMenuOpen && !saving && (
                <div className="absolute right-0 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveTarget("template");
                      setSaveMenuOpen(false);
                      handleSave();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Save Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaveTarget("default");
                      setSaveMenuOpen(false);
                      handleSave();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Save as New Default
                  </button>
                </div>
              )}
            </div>
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
              <label className="block -mt-3 text-xs font-medium text-gray-600 mb-1">
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
                  key={selected}
                  ref={iframeRef}
                  title="template-editor"
                  srcDoc={editorHtml}
                  onLoad={handleIframeLoad}
                  className="w-full h-[720px] border border-gray-300 rounded-md mt-2 bg-white"
                />
                <div className="flex justify-between items-center">
                  <p className="text-[11px] text-gray-400">
                    Editing the real template file from the backend.
                  </p>

                  {useDummyData && (
                    <p className="text-[11px] text-amber-600">
                      Dummy data is on. Visual editing is disabled while
                      previewing placeholders.
                    </p>
                  )}
                </div>
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
