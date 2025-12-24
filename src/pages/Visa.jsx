import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import "./Visa.css";
import toast, { Toaster } from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";

const API = process.env.REACT_APP_API_URL || "https://backend-rh.azurewebsites.net";

/** -------------------------------------------------------
 * Helpers
 * ------------------------------------------------------ */
function isDocumentSatisfied(doc) {
  if (doc.mode === "UPLOAD") return doc.status === "UPLOADED";
  if (doc.mode === "PHYSICAL") return doc.status === "RECEIVED_PHYSICAL";
  return false;
}

function getDocumentType(docCode) {
  switch (docCode) {
    case "PASSEPORT_ORIGINAL":
    case "PHOTOS":
    case "COPIE_PAGE_1_PASSEPORT":
      return "À apporter";

    case "ASSURANCE":
    case "BILLET_AVION":
      return "Email spécifique";

    case "RESERVATION_HOTEL":
      return "Booking.com";

    case "FRAIS_VISA":
      return "France-Visas";

    case "ATTESTATION_TRAVAIL":
    case "ORDRE_MISSION":
    case "INVITATION":
      return "Génération PDF";

    default:
      return "Upload PDF";
  }
}

function typeToCssClass(typeLabel) {
  return `type-${typeLabel.replace(/\s+/g, "-").toLowerCase()}`;
}

function isValidHttpUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** -------------------------------------------------------
 * i18n maps
 * ------------------------------------------------------ */
const getSteps = (t) => [
  { key: "DOCS", label: t("visaStepsDocsValidated") },
  { key: "PRET", label: t("visaStepsReadyToSubmit") },
  { key: "RESULT", label: t("visaStepsResult") },
];

const getDocumentStatusLabel = (t) => ({
  MISSING: t("docStatusMissing"),
  UPLOADED: t("docStatusUploaded"),
  REJECTED: t("docStatusRejected"),
  RECEIVED_PHYSICAL: t("docStatusReceivedPhysical"),
});

/** -------------------------------------------------------
 * UI Components
 * ------------------------------------------------------ */
function StatusPill({ status, t }) {
  let cls = "status-pill";
  if (status === "EN_COURS") cls += " status-warning";
  else if (status === "PRET_POUR_DEPOT") cls += " status-info";
  else if (status === "VISA_ACCORDE") cls += " status-success";
  else if (status === "VISA_REFUSE") cls += " status-danger";
  else cls += " status-info";

  const label =
    status === "EN_COURS"
      ? t("visaStatusInProgress")
      : status === "PRET_POUR_DEPOT"
      ? t("visaStatusReadyToSubmit")
      : status === "VISA_ACCORDE"
      ? t("visaStatusGranted")
      : status === "VISA_REFUSE"
      ? t("visaStatusRefused")
      : status;

  return <span className={cls}>{label}</span>;
}

function KpiCard({ label, value, type }) {
  return (
    <div className={`kpi-card ${type ? `kpi-${type}` : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function Stepper({ stepIndex, steps }) {
  return (
    <div className="visa-stepper">
      {steps.map((s, idx) => {
        const state = idx < stepIndex ? "done" : idx === stepIndex ? "active" : "future";
        return (
          <div className={`visa-step ${state}`} key={s.key}>
            <div className="visa-step-dot">{idx < stepIndex ? "✓" : idx + 1}</div>
            <div className="visa-step-label">{s.label}</div>
            {idx < steps.length - 1 && <div className={`visa-step-line ${idx < stepIndex ? "done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

function LockedHint({ text }) {
  return (
    <span className="locked-hint" title={text}>
      🔒 {text}
    </span>
  );
}

/** -------------------------------------------------------
 * ✅ EmployeeSearchSelect (filtre PRENOM/NOM)
 * ------------------------------------------------------ */
function EmployeeSearchSelect({
  t,
  label,
  required = false,
  employees = [],
  loading = false,
  value,
  onChange,
  groupLabel,
}) {
  const rootRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const emp = employees.find((e) => String(e.id) === String(value));
    if (!value) setQuery("");
    else if (emp) setQuery(`${emp.prenom ?? ""} ${emp.nom ?? ""}`.trim());
  }, [value, employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;

    return employees.filter((emp) => {
      const prenom = (emp.prenom ?? "").toLowerCase();
      const nom = (emp.nom ?? "").toLowerCase();
      const full = `${prenom} ${nom}`.trim();
      return prenom.includes(q) || nom.includes(q) || full.includes(q);
    });
  }, [employees, query]);

  useEffect(() => {
    function handleDown(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, []);

  function selectEmp(emp) {
    onChange(String(emp.id));
    setQuery(`${emp.prenom ?? ""} ${emp.nom ?? ""}`.trim());
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        selectEmp(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="emp-select" ref={rootRef}>
      <label className="emp-label">
        {label} {required && <span className="required">*</span>}
      </label>

      <div className={`emp-inputWrap ${open ? "is-open" : ""}`}>
        <input
          className="emp-input"
          type="text"
          value={query}
          placeholder={loading ? t("loading") : ""}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
            if (value) onChange("");
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />

        <span className="emp-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </div>

      {open && !loading && (
        <div className="emp-dropdown" role="listbox">
          <div className="emp-group">{groupLabel}</div>

          <div className="emp-list">
            {filtered.length === 0 ? (
              <div className="emp-empty">{t("visaNoEmployeeFound")}</div>
            ) : (
              filtered.map((emp, idx) => {
                const name = `${emp.prenom ?? ""} ${emp.nom ?? ""}`.trim();
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    className={`emp-item ${isActive ? "is-active" : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectEmp(emp)}
                    role="option"
                    aria-selected={String(value) === String(emp.id)}
                  >
                    {name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** -------------------------------------------------------
 * Section Dashboard (liste de dossiers par statut)
 * ------------------------------------------------------ */
function Section({ t, title, sectionStatus, innerRef, dossiers, onOpen }) {
  const isAccorde = sectionStatus === "VISA_ACCORDE";
  const showProgress = sectionStatus === "EN_COURS" || sectionStatus === "PRET_POUR_DEPOT";
  const colCount = 5 + (showProgress ? 1 : 0) + (isAccorde ? 2 : 0) + 1;

  return (
    <div className="dossier-section" ref={innerRef}>
      <div className="dossier-section-header">
        <h2>{title}</h2>
        <span className="dossier-count-badge">
          {dossiers.length} {dossiers.length === 1 ? t("visaOneFile") : t("visaManyFiles")}
        </span>
      </div>

      <table className="visa-table">
        <thead>
          <tr>
            <th>{t("visaEmployee")}</th>
            <th>{t("visaStatus")}</th>
            <th>{t("visaReason")}</th>
            <th>{t("visaDeparture")}</th>
            <th>{t("visaReturn")}</th>
            {showProgress && <th>{t("visaProgress")}</th>}
            {isAccorde && (
              <>
                <th>{t("visaVisaNumberShort")}</th>
                <th>{t("visaValidity")}</th>
              </>
            )}
            <th>{t("visaActions")}</th>
          </tr>
        </thead>

        <tbody>
          {dossiers.map((d) => {
            const totalRequired = d.progress?.totalDocs ?? 0;
            const okDocs = d.progress?.okDocs ?? 0;
            const progressPercent = d.progress?.percent ?? 0;

            return (
              <tr key={d.id}>
                <td>
                  <div className="emp-cell-name">{d.employee?.name}</div>
                  <div className="emp-cell-role">{d.employee?.poste}</div>
                  {d.employee?.department && <div className="emp-cell-dept">{d.employee.department}</div>}
                </td>

                <td>
                  <StatusPill status={d.status} t={t} />
                </td>

                <td>{d.motif || "—"}</td>
                <td>{d.departureDate}</td>
                <td>{d.returnDate}</td>

                {showProgress && (
                  <td>
                    <div className="progress-container">
                      <div className="progress-row">
                        <span className="progress-count">
                          {okDocs}/{totalRequired || 0}
                        </span>
                        <span className="progress-pct">{progressPercent}%</span>
                      </div>

                      <div className="progress-bar-small">
                        <div className="progress-fill-small" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </td>
                )}

                {isAccorde && (
                  <>
                    <td>{d.visa?.numero || "—"}</td>
                    <td>
                      {d.visa?.dateDebut && d.visa?.dateFin ? `${d.visa.dateDebut} → ${d.visa.dateFin}` : "—"}
                    </td>
                  </>
                )}

                <td>
                  <button className="btn-link" onClick={() => onOpen(d.id)}>
                    {t("visaConsult")}
                  </button>
                </td>
              </tr>
            );
          })}

          {dossiers.length === 0 && (
            <tr>
              <td colSpan={colCount} className="empty">
                <div>📁</div>
                <div>{t("visaNoFileInList")}</div>
                <div>{t("visaCreateNewToStart")}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** -------------------------------------------------------
 * Détail d’un dossier visa
 * ------------------------------------------------------ */
function DossierDetail({
  t,
  dossier,
  onUpdateDocStatus,
  onUpdateDossierStatus,
  onUploadPdf,
  onGeneratePdf,
  onSendSpecificEmail,
  onOpenProtectedFile,
  onOpenDossierPdf,
  steps,
  docStatusLabelMap,
}) {
  const [showVisaAccordeModal, setShowVisaAccordeModal] = useState(false);
  const [showPretDepotModal, setShowPretDepotModal] = useState(false);
  const [showVisaRefuseModal, setShowVisaRefuseModal] = useState(false);

  const [visaAccordeData, setVisaAccordeData] = useState({
    numeroVisa: "",
    dateDebut: "",
    dateFin: "",
  });

  const summary = useMemo(() => {
    const docs = dossier.documents || [];
    const totalRequired = docs.length;
    const ok = docs.filter(isDocumentSatisfied).length;
    const missing = docs.filter((d) => !isDocumentSatisfied(d)).length;
    const physicalDocs = docs.filter((d) => d.mode === "PHYSICAL").length;

    const progressPercent = totalRequired > 0 ? Math.round((ok / totalRequired) * 100) : 0;
    return { totalRequired, ok, missing, physicalDocs, progressPercent };
  }, [dossier]);

  const allDocumentsProvided = useMemo(() => {
    const requiredDocs = dossier.documents || [];
    return requiredDocs.every(isDocumentSatisfied);
  }, [dossier]);

  const isFinal = dossier.status === "VISA_ACCORDE" || dossier.status === "VISA_REFUSE";

  const canOpenPretDepotModal =
    (dossier.status === "EN_COURS" || dossier.status === "PRET_POUR_DEPOT") && allDocumentsProvided && !isFinal;

  const canConfirmPretDepot = dossier.status === "EN_COURS" && allDocumentsProvided && !isFinal;

  const canDecideVisa = dossier.status === "PRET_POUR_DEPOT" && !isFinal;

  const stepIndex = useMemo(() => {
    const isFinalLocal = dossier.status === "VISA_ACCORDE" || dossier.status === "VISA_REFUSE";
    if (isFinalLocal) return steps.length;
    if (dossier.status === "PRET_POUR_DEPOT") return 2;
    return 0;
  }, [dossier.status, steps.length]);

  const handlePretDepotClick = () => {
    if (!allDocumentsProvided) {
      toast.error(t("visaAllDocsRequiredBeforeReady"));
      return;
    }
    setShowPretDepotModal(true);
  };

  const handlePrintDocuments = async () => {
    try {
      await onOpenDossierPdf(dossier.id);
      toast(t("visaOpenPdfToPrint"));
    } catch (e) {
      toast.error(e.message || t("visaPrintPdfError"));
    }
  };

  const handleVisaAccordeSubmit = () => {
    if (!visaAccordeData.numeroVisa || !visaAccordeData.dateDebut || !visaAccordeData.dateFin) {
      toast.error(t("visaFillVisaNumberAndDates"));
      return;
    }

    onUpdateDossierStatus(dossier.id, "VISA_ACCORDE", {
      visaNumero: visaAccordeData.numeroVisa,
      visaDateDebut: visaAccordeData.dateDebut,
      visaDateFin: visaAccordeData.dateFin,
    });

    toast.success(t("visaGrantedSaved"));
    setShowVisaAccordeModal(false);
    setVisaAccordeData({ numeroVisa: "", dateDebut: "", dateFin: "" });
  };

  const handleVisaRefuseClick = () => {
    if (!canDecideVisa) return;
    setShowVisaRefuseModal(true);
  };

  return (
    <>
      <section className="detail-grid">
        {/* LEFT */}
        <section className="card-detail">
          <div className="section-header">
            <h2>{t("visaFileSummary")}</h2>
          </div>

          <div className="detail-inner">
            <Stepper stepIndex={stepIndex} steps={steps} />

            <p className="detail-strong-line">
              <strong>{dossier.employee?.name}</strong> – {dossier.employee?.poste}
            </p>

            <p>
              {t("visaTripReason")} : <strong>{dossier.motif || "—"}</strong>
            </p>

            <p>
              {t("visaDeparture")} : <strong>{dossier.departureDate}</strong>
            </p>

            <p>
              {t("visaReturn")} : <strong>{dossier.returnDate}</strong>
            </p>

            <div className="status-block">
              <span className="label">{t("visaFileStatus")} :</span>
              <StatusPill status={dossier.status} t={t} />
            </div>

            <div className="progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${summary.progressPercent}%` }} />
              </div>
              <span className="progress-text">
                {summary.progressPercent}
                {t("visaDocsProvidedPct")}
              </span>
            </div>

            <p className="muted">
              {summary.ok}/{summary.totalRequired} {t("visaDocsProvidedCountLine")} – {summary.missing}{" "}
              {t("visaMissingDocs")} ({summary.physicalDocs} {t("visaPhysicalToBring")}).
            </p>

            <div className="actions-stack">
              <div className="primary-action">
                <button
                  className="btn-primary"
                  disabled={!canOpenPretDepotModal}
                  title={
                    isFinal
                      ? t("visaFileClosed")
                      : !allDocumentsProvided
                      ? t("visaAllDocsRequiredBeforeReady")
                      : ""
                  }
                  onClick={handlePretDepotClick}
                >
                  {t("visaReadyToSubmitBtn")}
                </button>
              </div>

              <div className="decision-block">
                <div className="decision-title">{t("visaDecisionTitle")}</div>

                <div className="decision-actions">
                  <button className="btn-success" disabled={!canDecideVisa} onClick={() => setShowVisaAccordeModal(true)}>
                    {t("visaGrantedBtn")}
                  </button>

                  <button className="btn-danger" disabled={!canDecideVisa} onClick={handleVisaRefuseClick}>
                    {t("visaRefusedBtn")}
                  </button>
                </div>
              </div>
            </div>

            {!canDecideVisa && !isFinal && (
              <div className="detail-hint">
                <LockedHint text={t("visaResultLockedHint")} />
              </div>
            )}

            {isFinal && (
              <div className="detail-hint">
                <LockedHint text={t("visaFileClosedHint")} />
              </div>
            )}
          </div>
        </section>

        <section className="card-detail">
          <div className="section-header">
            <h2>{t("visaFileDocs")}</h2>
          </div>

          <table className="docs-table">
            <thead>
              <tr>
                <th>{t("visaDoc")}</th>
                <th>{t("visaType")}</th>
                <th>{t("visaStatus")}</th>
                <th>{t("visaActions")}</th>
              </tr>
            </thead>

            <tbody>
              {(dossier.documents || []).map((doc) => {
                const typeLabel = getDocumentType(doc.code);
                const badgeClass = `document-type-badge ${typeToCssClass(typeLabel)}`;
                const isOk = isDocumentSatisfied(doc);

                return (
                  <tr key={doc.id} className={isOk ? "doc-row-ok" : "doc-row-pending"}>
                    <td className="doc-name-cell">
                      {isOk && <span className="doc-check">✓</span>}
                      {doc.label}
                    </td>

                    <td>
                      <span className={badgeClass}>{typeLabel}</span>
                    </td>

                    <td>
                      <span className={`doc-status doc-${doc.status}`}>
                        {docStatusLabelMap[doc.status] || doc.status}
                      </span>
                    </td>

                    <td className="doc-actions">
                      {isFinal ? (
                        <span className="muted">{t("visaFileClosed")}</span>
                      ) : (
                        <>
                          {doc.mode === "PHYSICAL" && (
                            <button
                              className="btn-physical"
                              onClick={() => {
                                onUpdateDocStatus(doc.id, "RECEIVED_PHYSICAL");
                                toast.success(t("docMarkedReceivedPhysical"));
                              }}
                            >
                              {t("visaReceivedBtn")}
                            </button>
                          )}

                          {(doc.code === "ASSURANCE" || doc.code === "BILLET_AVION") && (
                            <>
                              <button onClick={() => onSendSpecificEmail(doc)}>{t("visaSendEmailBtn")}</button>
                              <button onClick={() => onUploadPdf(doc)}>{t("visaUploadPdfBtn")}</button>
                              <button
                                onClick={() => {
                                  if (!doc.fileUrl) return toast.error(t("visaMissingPdf"));
                                  onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                }}
                              >
                                {t("visaPreviewBtn")}
                              </button>
                            </>
                          )}

                          {doc.code === "FRAIS_VISA" && (
                            <>
                              <button
                                onClick={() =>
                                  window.open(
                                    "https://france-visas.gouv.fr/fr-FR/web/france-visas/accueil",
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                {t("visaFillFormBtn")}
                              </button>
                              <button onClick={() => onUploadPdf(doc)}>{t("visaUploadReceiptBtn")}</button>
                              <button
                                onClick={() => {
                                  if (!doc.fileUrl) return toast.error(t("visaMissingReceiptPdf"));
                                  onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                }}
                              >
                                {t("visaPreviewPdfBtn")}
                              </button>
                            </>
                          )}

                          {doc.code === "RESERVATION_HOTEL" && (
                            <>
                              <button
                                className="btn-booking"
                                onClick={() => window.open("https://www.booking.com", "_blank", "noopener,noreferrer")}
                              >
                                {t("visaBookHotelBtn")}
                              </button>
                              <button onClick={() => onUploadPdf(doc)}>{t("visaUploadPdfBtn")}</button>
                              <button
                                onClick={() => {
                                  if (!doc.fileUrl) return toast.error(t("visaMissingBookingPdf"));
                                  onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                }}
                              >
                                {t("visaPreviewBtn")}
                              </button>
                            </>
                          )}

                          {(doc.code === "ATTESTATION_TRAVAIL" || doc.code === "INVITATION" || doc.code === "ORDRE_MISSION") && (
                            <>
                              <button onClick={() => onGeneratePdf(doc)}>{t("visaGeneratePdfBtn")}</button>
                              <button
                                onClick={() => {
                                  if (!doc.fileUrl) return toast.error(t("visaNoGeneratedFile"));
                                  onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                }}
                              >
                                {t("visaPreviewBtn")}
                              </button>
                            </>
                          )}

                          {doc.mode === "UPLOAD" &&
                            ![
                              "FRAIS_VISA",
                              "RESERVATION_HOTEL",
                              "ATTESTATION_TRAVAIL",
                              "INVITATION",
                              "ORDRE_MISSION",
                              "ASSURANCE",
                              "BILLET_AVION",
                            ].includes(doc.code) && (
                              <>
                                <button onClick={() => onUploadPdf(doc)}>{t("visaUploadPdfBtn")}</button>
                                <button
                                  onClick={() => {
                                    if (!doc.fileUrl) return toast.error(t("visaMissingPdf"));
                                    onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                  }}
                                >
                                  {t("visaPreviewBtn")}
                                </button>
                              </>
                            )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </section>

      {/* MODAL VISA ACCORDE */}
      {showVisaAccordeModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>
                {t("visaGrantedModalTitle")} {dossier.employee?.name}
              </h2>
              <button className="modal-close" onClick={() => setShowVisaAccordeModal(false)}>
                ✕
              </button>
            </div>

            <div className="create-form">
              {!canDecideVisa ? (
                <p className="error-text">{t("visaMustBeReadyToSubmitFirst")}</p>
              ) : (
                <>
                  <div className="form-row">
                    <div>
                      <label>{t("visaVisaNumber")}</label>
                      <input
                        type="text"
                        value={visaAccordeData.numeroVisa}
                        onChange={(e) => setVisaAccordeData((p) => ({ ...p, numeroVisa: e.target.value }))}
                        placeholder="Ex: F12345678"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div>
                      <label>{t("visaValidityStart")}</label>
                      <input
                        type="date"
                        value={visaAccordeData.dateDebut}
                        onChange={(e) => setVisaAccordeData((p) => ({ ...p, dateDebut: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label>{t("visaValidityEnd")}</label>
                      <input
                        type="date"
                        value={visaAccordeData.dateFin}
                        onChange={(e) => setVisaAccordeData((p) => ({ ...p, dateFin: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-outline" onClick={() => setShowVisaAccordeModal(false)}>
                      {t("visaCancel")}
                    </button>

                    <button
                      type="button"
                      className="btn-success"
                      onClick={handleVisaAccordeSubmit}
                      disabled={!visaAccordeData.numeroVisa || !visaAccordeData.dateDebut || !visaAccordeData.dateFin}
                    >
                      {t("visaConfirmGranted")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRET POUR DEPOT */}
      {showPretDepotModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>
                {t("visaReadyDocsModalTitle")} {dossier.employee?.name}
              </h2>
              <button className="modal-close" onClick={() => setShowPretDepotModal(false)}>
                ✕
              </button>
            </div>

            <div className="create-form">
              <div className="form-row">
                <div className="ready-docs-wrap">
                  <h3>{t("visaProvidedDocsList")}</h3>

                  <ul className="ready-docs-list">
                    {(dossier.documents || [])
                      .filter((doc) => isDocumentSatisfied(doc))
                      .map((doc) => (
                        <li key={doc.id} className="ready-doc-item">
                          <strong>{doc.label}</strong>
                          <div className="ready-doc-meta">
                            {t("visaType")}: {getDocumentType(doc.code)} | {t("visaStatus")}:{" "}
                            {docStatusLabelMap[doc.status] || doc.status}
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-outline" onClick={handlePrintDocuments}>
                  {t("visaPrintDocs")}
                </button>

                <button type="button" className="btn-outline" onClick={() => setShowPretDepotModal(false)}>
                  {t("visaCancel")}
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (!canConfirmPretDepot) return;
                    onUpdateDossierStatus(dossier.id, "PRET_POUR_DEPOT");
                    toast.success(t("visaReadyMarked"));
                    setShowPretDepotModal(false);
                  }}
                  disabled={!canConfirmPretDepot}
                >
                  {t("visaConfirmReadyToSubmit")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VISA REFUSÉ */}
      {showVisaRefuseModal && (
        <div className="modal-overlay" onMouseDown={() => setShowVisaRefuseModal(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {t("visaRefusedModalTitle")} {dossier.employee?.name}
              </h2>
              <button className="modal-close" onClick={() => setShowVisaRefuseModal(false)}>
                ✕
              </button>
            </div>

            <div className="create-form">
              <p className="toast-refuse-text" style={{ marginTop: 0 }}>
                {t("visaRefusedFinalWarning")}
              </p>

              <div className="form-actions">
                <button type="button" className="btn-outline" onClick={() => setShowVisaRefuseModal(false)}>
                  {t("visaCancel")}
                </button>

                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    onUpdateDossierStatus(dossier.id, "VISA_REFUSE");
                    toast.success(t("visaRefusedClosed"), { position: "top-right" });
                    setShowVisaRefuseModal(false);
                  }}
                >
                  {t("visaConfirmRefusal")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** -------------------------------------------------------
 * ✅ Page principale Visa
 * ------------------------------------------------------ */
const EMPTY_FORM = {
  employeeId: "",
  departureDate: "",
  returnDate: "",
  motif: "",
};

export default function Visa() {
  const { t } = useLanguage();

  const [dossiers, setDossiers] = useState([]);
  const [selectedDossierId, setSelectedDossierId] = useState(null);
  const [selectedDossier, setSelectedDossier] = useState(null);

  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newDossierForm, setNewDossierForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [pageLoading, setPageLoading] = useState(false);

  const enCoursRef = useRef(null);
  const pretDepotRef = useRef(null);
  const visaAccordeRef = useRef(null);
  const visaRefuseRef = useRef(null);

  const steps = useMemo(() => getSteps(t), [t]);
  const docStatusLabelMap = useMemo(() => getDocumentStatusLabel(t), [t]);

  // ✅ token helpers
  const getToken = useCallback(() => localStorage.getItem("token"), []);
  const getAuthHeaders = useCallback(() => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  /** ✅ fetch JSON avec Authorization */
  const fetchJson = useCallback(
    async (url, options = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...getAuthHeaders(),
        },
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        throw new Error(t("visaUnauthorized401"));
      }
      if (!res.ok) {
        throw new Error(data?.message || `Erreur HTTP ${res.status}`);
      }
      return data;
    },
    [getAuthHeaders, t]
  );

  /** ✅ ouvrir fichier */
  const openProtectedFile = useCallback(async (fileUrl) => {
    if (!fileUrl) throw new Error(t("visaMissingFileUrl"));
    if (!isValidHttpUrl(fileUrl)) throw new Error(t("visaInvalidUrl"));
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }, [t]);

  /** ✅ ouvrir PDF complet dossier */
  const openDossierPdf = useCallback((dossierId) => {
    const url = `${API}/api/visa-dossiers/${dossierId}/dossier-pdf`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  /** ✅ Chargement employees */
  useEffect(() => {
    if (!API) {
      toast.error(t("visaMissingApiEnv"));
      return;
    }

    (async () => {
      setEmployeesLoading(true);
      try {
        const data = await fetchJson(`${API}/api/employee`);
        setEmployees(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error(e.message || t("visaLoadingEmployeesError"));
      } finally {
        setEmployeesLoading(false);
      }
    })();
  }, [fetchJson, t]);

  /** ✅ Refresh dossiers */
  const refreshDossiers = useCallback(async () => {
    if (!API) return;
    try {
      setPageLoading(true);
      const data = await fetchJson(`${API}/api/visa-dossiers`);
      setDossiers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || t("visaLoadingFilesError"));
    } finally {
      setPageLoading(false);
    }
  }, [fetchJson, t]);

  useEffect(() => {
    refreshDossiers();
  }, [refreshDossiers]);

  /** ✅ Ouvrir dossier (détail) */
  const openDossier = useCallback(
    async (dossierId) => {
      try {
        const data = await fetchJson(`${API}/api/visa-dossiers/${dossierId}`);
        setSelectedDossierId(dossierId);
        setSelectedDossier(data);
      } catch (e) {
        toast.error(e.message || t("visaOpenFileError"));
      }
    },
    [fetchJson, t]
  );

  /** ✅ Filtre dashboard */
  const filteredDossiers = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return dossiers;
    return dossiers.filter(
      (d) =>
        (d.employee?.name || "").toLowerCase().includes(term) || (d.motif || "").toLowerCase().includes(term)
    );
  }, [dossiers, search]);

  const dossiersEnCours = filteredDossiers.filter((d) => d.status === "EN_COURS");
  const dossiersPretDepot = filteredDossiers.filter((d) => d.status === "PRET_POUR_DEPOT");
  const dossiersVisaAccorde = filteredDossiers.filter((d) => d.status === "VISA_ACCORDE");
  const dossiersVisaRefuse = filteredDossiers.filter((d) => d.status === "VISA_REFUSE");

  const stats = useMemo(
    () => ({
      enCours: dossiers.filter((d) => d.status === "EN_COURS").length,
      pretDepot: dossiers.filter((d) => d.status === "PRET_POUR_DEPOT").length,
      visaAccorde: dossiers.filter((d) => d.status === "VISA_ACCORDE").length,
      visaRefuse: dossiers.filter((d) => d.status === "VISA_REFUSE").length,
    }),
    [dossiers]
  );

  function handleOpenCreate() {
    setIsCreating(true);
    setFormError("");
    setNewDossierForm(EMPTY_FORM);
  }

  function handleCancelCreate() {
    setIsCreating(false);
    setFormError("");
    setNewDossierForm(EMPTY_FORM);
  }

  /** ✅ create dossier */
  async function handleCreateDossier(e) {
    e.preventDefault();
    const { employeeId, departureDate, returnDate, motif } = newDossierForm;

    if (!employeeId || !departureDate || !returnDate || !motif) {
      setFormError(t("visaFillAllRequired"));
      toast.error(t("visaFillAllRequired"));
      return;
    }
    if (returnDate < departureDate) {
      setFormError(t("visaReturnDateAfterDeparture"));
      toast.error(t("visaReturnDateAfterDeparture"));
      return;
    }

    const emp = employees.find((x) => String(x.id) === String(employeeId));
    const employeeName = emp ? `${emp.prenom ?? ""} ${emp.nom ?? ""}`.trim() : t("visaEmployeeGeneric");

    const loadingId = toast.loading(t("visaCreateFileLoading"));
    try {
      const data = await fetchJson(`${API}/api/visa-dossiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: Number(employeeId),
          motif,
          departureDate,
          returnDate,
        }),
      });

      toast.dismiss(loadingId);

      if (data?.emailSent) {
        toast.success(`${t("visaFileCreatedEmailSent")} ${employeeName}.`, { duration: 9000 });
      } else {
        toast.error(
          `${t("visaFileCreatedEmailNotSent")} ${employeeName}. ${data?.emailError ? `(${data.emailError})` : ""}`,
          { duration: 8000 }
        );
      }

      await refreshDossiers();
      await openDossier(data.id);
      setIsCreating(false);
      setNewDossierForm(EMPTY_FORM);
      setFormError("");
    } catch (err) {
      toast.dismiss(loadingId);
      setFormError(err.message);
      toast.error(err.message || t("visaCreateError"));
    }
  }

  /** ✅ update doc */
  async function updateDocStatus(docId, status, extra = {}) {
    try {
      await fetchJson(`${API}/api/visa-documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });

      if (selectedDossierId) await openDossier(selectedDossierId);
      else await refreshDossiers();
    } catch (e) {
      toast.error(e.message || t("visaUpdateDocError"));
    }
  }

  /** ✅ update dossier status */
  async function updateDossierStatus(dossierId, status, visaData = null) {
    try {
      await fetchJson(`${API}/api/visa-dossiers/${dossierId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(visaData || {}) }),
      });

      await refreshDossiers();
      await openDossier(dossierId);
    } catch (e) {
      toast.error(e.message || t("visaUpdateFileError"));
    }
  }

  /** ✅ upload PDF (avec Authorization) */
  async function uploadPdf(doc) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      const form = new FormData();
      form.append("pdfFile", file);

      const loadingId = toast.loading(t("visaPdfUploading"));
      try {
        const res = await fetch(`${API}/api/visa-documents/${doc.id}/upload`, {
          method: "POST",
          body: form,
          headers: { ...getAuthHeaders() },
        });

        const data = await res.json().catch(() => ({}));
        toast.dismiss(loadingId);

        if (res.status === 401) throw new Error(t("visaUnauthorized401"));
        if (!res.ok) throw new Error(data?.message || t("visaUploadError"));

        toast.success(t("visaPdfUploadedSuccess"));
        await openDossier(selectedDossierId);
      } catch (e) {
        toast.dismiss(loadingId);
        toast.error(e.message || t("visaUploadError"));
      }
    };
    input.click();
  }

  /** ✅ generate PDF */
  async function generatePdf(doc) {
    const dossier = selectedDossier;
    if (!dossier) return;

    const employeId = dossier.employee?.id;
    if (!employeId) {
      toast.error(t("visaEmployeeNotFoundInFile"));
      return;
    }

    let url = "";
    let body = {};

    if (doc.code === "ATTESTATION_TRAVAIL") {
      url = `${API}/api/attestation-travail`;
      body = { employeId, docId: doc.id };
    } else if (doc.code === "INVITATION") {
      url = `${API}/api/invitation-prise-en-charge`;
      body = {
        employeId,
        dateDebutSejour: dossier.departureDate,
        dateFinSejour: dossier.returnDate,
        docId: doc.id,
      };
    } else if (doc.code === "ORDRE_MISSION") {
      url = `${API}/api/ordre-mission`;
      body = {
        employeId,
        objectifMission: dossier.motif,
        dateDebutMission: dossier.departureDate,
        dateFinMission: dossier.returnDate,
        docId: doc.id,
      };
    } else {
      toast.error(t("visaGenerationNotAvailable"));
      return;
    }

    const loadingId = toast.loading(t("visaGenerating"));
    try {
      const data = await fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.dismiss(loadingId);

      toast.success(t("visaGeneratedSuccess"));

      if (data?.fileUrl) {
        await openProtectedFile(data.fileUrl);
      }

      await openDossier(selectedDossierId);
    } catch (e) {
      toast.dismiss(loadingId);
      toast.error(e.message || t("visaGenerationError"));
    }
  }

  /** ✅ send specific email */
  async function sendSpecificEmail(doc) {
    if (!selectedDossierId) return;

    const endpoint =
      doc.code === "ASSURANCE"
        ? `${API}/api/email/assurance`
        : doc.code === "BILLET_AVION"
        ? `${API}/api/email/billet`
        : null;

    if (!endpoint) {
      toast.error(t("visaEmailNotAvailable"));
      return;
    }

    const loadingId = toast.loading(t("visaSendingEmail"));
    try {
      await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId: selectedDossierId }),
      });
      toast.dismiss(loadingId);
      toast.success(t("visaEmailSent"));
    } catch (e) {
      toast.dismiss(loadingId);
      toast.error(`${t("visaEmailNotSent")} ${e.message}`);
    }
  }

  /** ✅ Jump vers section */
  function handleStatusJump(e) {
    const value = e.target.value;
    if (!value) return;

    const map = {
      EN_COURS: enCoursRef,
      PRET_POUR_DEPOT: pretDepotRef,
      VISA_ACCORDE: visaAccordeRef,
      VISA_REFUSE: visaRefuseRef,
    };

    map[value]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** ✅ Loading page */
  if (pageLoading && !selectedDossier) {
    return (
      <div className="layout">
        <Sidebar />
        <div className="main">
          <div className="page-header-card">
            <div className="page-header-icon">📋</div>
            <div className="page-header-text">
              <h1 className="page-title">{t("visaTitle")}</h1>
              <p className="page-subtitle">{t("loading")}</p>
            </div>
          </div>
          <div className="loading" style={{ padding: 24 }}>
            <div className="loading-spinner" />
            <p>{t("visaLoadingFiles")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            minWidth: "420px",
            maxWidth: "560px",
            padding: "18px 22px",
            fontSize: "1.05rem",
            fontWeight: "600",
            lineHeight: "1.5",
            borderRadius: "16px",
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.25)",
          },
          success: {
            style: { background: "#ecfdf5", color: "#065f46", borderLeft: "7px solid #16a34a" },
            iconTheme: { primary: "#16a34a", secondary: "#ecfdf5" },
          },
          error: {
            style: { background: "#fef2f2", color: "#7f1d1d", borderLeft: "7px solid #dc2626" },
            iconTheme: { primary: "#dc2626", secondary: "#fef2f2" },
          },
          loading: {
            style: { background: "#eff6ff", color: "#1e3a8a", borderLeft: "7px solid #2563eb" },
          },
        }}
      />

      <div className="main">
        <div className="page-header-card">
          <div className="page-header-text">
            <h1 className="page-title">📋 {t("visaTitle")}</h1>
            <p className="page-subtitle">
              {selectedDossier ? t("visaSubtitleDetail") : t("visaSubtitleDashboard")}
            </p>
          </div>

          {selectedDossier && (
            <button
              className="btn-outline"
              onClick={() => {
                setSelectedDossierId(null);
                setSelectedDossier(null);
                refreshDossiers();
              }}
            >
              ← {t("visaBackToDashboard")}
            </button>
          )}
        </div>

        {!selectedDossier && (
          <div className="page-toolbar">
            <div className="toolbar-left">
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder={t("visaSearchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="search-icon">🔍</span>
              </div>
            </div>

            <div className="toolbar-center">
              <span className="toolbar-count">
                {filteredDossiers.length}{" "}
                {filteredDossiers.length === 1 ? t("visaOneFileFound") : t("visaFilesFound")}
              </span>
            </div>

            <div className="toolbar-right">
              <div className="status-filter-wrapper">
                <select defaultValue="" onChange={handleStatusJump}>
                  <option value="">{t("visaFilterStatus")}</option>
                  <option value="EN_COURS">{t("visaStatusInProgress")}</option>
                  <option value="PRET_POUR_DEPOT">{t("visaStatusReadyToSubmit")}</option>
                  <option value="VISA_ACCORDE">{t("visaStatusGranted")}</option>
                  <option value="VISA_REFUSE">{t("visaStatusRefused")}</option>
                </select>
              </div>

              <button className="btn-primary" onClick={handleOpenCreate}>
                + {t("visaNewFile")}
              </button>
            </div>
          </div>
        )}

        {!selectedDossier && isCreating && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>{t("visaCreateNewFile")}</h2>
                <button className="modal-close" onClick={handleCancelCreate}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDossier} className="create-form">
                <div className="form-row">
                  <div>
                    <EmployeeSearchSelect
                      t={t}
                      label={t("visaFullName")}
                      required
                      employees={employees}
                      loading={employeesLoading}
                      value={newDossierForm.employeeId}
                      onChange={(employeeId) => setNewDossierForm((p) => ({ ...p, employeeId }))}
                      groupLabel={t("visaEmployeesGroupLabel")}
                    />
                  </div>

                  <div>
                    <label>
                      {t("visaReason")} <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="motif"
                      value={newDossierForm.motif}
                      onChange={(e) => setNewDossierForm((p) => ({ ...p, motif: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div>
                    <label>
                      {t("visaDeparture")} <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="departureDate"
                      value={newDossierForm.departureDate}
                      onChange={(e) => setNewDossierForm((p) => ({ ...p, departureDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>
                      {t("visaReturn")} <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="returnDate"
                      value={newDossierForm.returnDate}
                      onChange={(e) => setNewDossierForm((p) => ({ ...p, returnDate: e.target.value }))}
                    />
                  </div>
                </div>

                {formError && <p className="error-text">{formError}</p>}

                <div className="form-actions">
                  <button type="button" className="btn-outline" onClick={handleCancelCreate}>
                    {t("visaCancel")}
                  </button>
                  <button type="submit" className="btn-primary">
                    {t("visaCreateFile")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {!selectedDossier && (
          <>
            <section className="kpi-grid">
              <KpiCard label={t("visaKpiInProgress")} value={stats.enCours} type="warning" />
              <KpiCard label={t("visaKpiReadyToSubmit")} value={stats.pretDepot} type="info" />
              <KpiCard label={t("visaKpiGranted")} value={stats.visaAccorde} type="success" />
              <KpiCard label={t("visaKpiRefused")} value={stats.visaRefuse} type="danger" />
            </section>

            <div className="dossiers-container">
              <Section t={t} title={t("visaSectionInProgress")} sectionStatus="EN_COURS" innerRef={enCoursRef} dossiers={dossiersEnCours} onOpen={openDossier} />
              <Section t={t} title={t("visaSectionReadyToSubmit")} sectionStatus="PRET_POUR_DEPOT" innerRef={pretDepotRef} dossiers={dossiersPretDepot} onOpen={openDossier} />
              <Section t={t} title={t("visaSectionGranted")} sectionStatus="VISA_ACCORDE" innerRef={visaAccordeRef} dossiers={dossiersVisaAccorde} onOpen={openDossier} />
              <Section t={t} title={t("visaSectionRefused")} sectionStatus="VISA_REFUSE" innerRef={visaRefuseRef} dossiers={dossiersVisaRefuse} onOpen={openDossier} />
            </div>
          </>
        )}

        {selectedDossier && (
          <DossierDetail
            t={t}
            dossier={selectedDossier}
            onUpdateDocStatus={updateDocStatus}
            onUpdateDossierStatus={updateDossierStatus}
            onUploadPdf={uploadPdf}
            onGeneratePdf={generatePdf}
            onSendSpecificEmail={sendSpecificEmail}
            onOpenProtectedFile={openProtectedFile}
            onOpenDossierPdf={openDossierPdf}
            steps={steps}
            docStatusLabelMap={docStatusLabelMap}
          />
        )}
      </div>
    </div>
  );
}
