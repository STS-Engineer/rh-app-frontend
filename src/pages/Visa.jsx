import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import "./Visa.css";
import toast, { Toaster } from "react-hot-toast";

const API = process.env.REACT_APP_API_URL || "https://backend-rh.azurewebsites.net";

/** -------------------------------------------------------
 * Constantes UI
 * ------------------------------------------------------ */
const STEPS = [
  { key: "DOCS", label: "Documents validés" },
  { key: "PRET", label: "Prêt pour dépôt" },
  { key: "RESULT", label: "Résultat visa" },
];

const DOCUMENT_STATUS_LABEL = {
  MISSING: "Manquant",
  UPLOADED: "Uploadé",
  REJECTED: "Refusé",
  RECEIVED_PHYSICAL: "Reçu physiquement",
};

const EMPTY_FORM = {
  employeeId: "",
  departureDate: "",
  returnDate: "",
  motif: "",
};

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
 * UI Components
 * ------------------------------------------------------ */
function StatusPill({ status }) {
  let cls = "status-pill";
  if (status === "EN_COURS") cls += " status-warning";
  else if (status === "PRET_POUR_DEPOT") cls += " status-info";
  else if (status === "VISA_ACCORDE") cls += " status-success";
  else if (status === "VISA_REFUSE") cls += " status-danger";
  else cls += " status-info";
  return <span className={cls}>{status}</span>;
}

function KpiCard({ label, value, type }) {
  return (
    <div className={`kpi-card ${type ? `kpi-${type}` : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function Stepper({ stepIndex }) {
  return (
    <div className="visa-stepper">
      {STEPS.map((s, idx) => {
        const state = idx < stepIndex ? "done" : idx === stepIndex ? "active" : "future";
        return (
          <div className={`visa-step ${state}`} key={s.key}>
            <div className="visa-step-dot">{idx < stepIndex ? "✓" : idx + 1}</div>
            <div className="visa-step-label">{s.label}</div>
            {idx < STEPS.length - 1 && (
              <div className={`visa-step-line ${idx < stepIndex ? "done" : ""}`} />
            )}
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
  label = "Nom & Prénom",
  required = false, 
  employees = [],
  loading = false,
  value,
  onChange,
  groupLabel = "Employees - STS",
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
          placeholder={loading ? "Chargement..." : ""}
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
            <path
              d="M16.5 16.5 21 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>

      {open && !loading && (
        <div className="emp-dropdown" role="listbox">
          <div className="emp-group">{groupLabel}</div>

          <div className="emp-list">
            {filtered.length === 0 ? (
              <div className="emp-empty">Aucun employé trouvé</div>
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
function Section({ title, sectionStatus, innerRef, dossiers, onOpen }) {
  const isAccorde = sectionStatus === "VISA_ACCORDE";
  const showProgress = sectionStatus === "EN_COURS" || sectionStatus === "PRET_POUR_DEPOT";
  const colCount = 5 + (showProgress ? 1 : 0) + (isAccorde ? 2 : 0) + 1;

  return (
    <div className="dossier-section" ref={innerRef}>
      <div className="dossier-section-header">
        <h2>{title}</h2>
        <span className="dossier-count-badge">
          {dossiers.length} {dossiers.length === 1 ? "dossier" : "dossiers"}
        </span>
      </div>

      <table className="visa-table">
        <thead>
          <tr>
            <th>Employé</th>
            <th>Statut</th>
            <th>Motif</th>
            <th>Départ</th>
            <th>Retour</th>
            {showProgress && <th>Progress</th>}
            {isAccorde && (
              <>
                <th>N° Visa</th>
                <th>Validité</th>
              </>
            )}
            <th>Actions</th>
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
                  {d.employee?.department && (
                    <div className="emp-cell-dept">{d.employee.department}</div>
                  )}
                </td>

                <td>
                  <StatusPill status={d.status} />
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
                      {d.visa?.dateDebut && d.visa?.dateFin
                        ? `${d.visa.dateDebut} → ${d.visa.dateFin}`
                        : "—"}
                    </td>
                  </>
                )}

                <td>
                  <button className="btn-link" onClick={() => onOpen(d.id)}>
                    Consulter
                  </button>
                </td>
              </tr>
            );
          })}

          {dossiers.length === 0 && (
            <tr>
              <td colSpan={colCount} className="empty">
                <div>📁</div>
                <div>Aucun dossier dans cette liste</div>
                <div>Créez un nouveau dossier pour commencer</div>
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
  dossier,
  onUpdateDocStatus,
  onUpdateDossierStatus,
  onUploadPdf,
  onGeneratePdf,
  onSendSpecificEmail,
  onOpenProtectedFile,     // ✅ NEW
  onOpenDossierPdf,        // ✅ NEW
}) {
  const [showVisaAccordeModal, setShowVisaAccordeModal] = useState(false);
  const [showPretDepotModal, setShowPretDepotModal] = useState(false);

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
    (dossier.status === "EN_COURS" || dossier.status === "PRET_POUR_DEPOT") &&
    allDocumentsProvided &&
    !isFinal;

  const canConfirmPretDepot =
    dossier.status === "EN_COURS" && allDocumentsProvided && !isFinal;

  const canDecideVisa = dossier.status === "PRET_POUR_DEPOT" && !isFinal;

  const stepIndex = useMemo(() => {
    const isFinalLocal = dossier.status === "VISA_ACCORDE" || dossier.status === "VISA_REFUSE";
    if (isFinalLocal) return STEPS.length;
    if (dossier.status === "PRET_POUR_DEPOT") return 2;
    return 0;
  }, [dossier.status]);

  const handlePretDepotClick = () => {
    if (!allDocumentsProvided) {
      toast.error("Tous les documents requis doivent être fournis avant de marquer comme prêt pour dépôt.");
      return;
    }
    setShowPretDepotModal(true);
  };

  const handlePrintDocuments = async () => {
    try {
      await onOpenDossierPdf(dossier.id);
      toast("Ouverture du PDF pour impression…");
    } catch (e) {
      toast.error(e.message || "Erreur impression PDF");
    }
  };

  const handleVisaAccordeSubmit = () => {
    if (!visaAccordeData.numeroVisa || !visaAccordeData.dateDebut || !visaAccordeData.dateFin) {
      toast.error("Merci de remplir numéro visa + dates de validité.");
      return;
    }

    onUpdateDossierStatus(dossier.id, "VISA_ACCORDE", {
      visaNumero: visaAccordeData.numeroVisa,
      visaDateDebut: visaAccordeData.dateDebut,
      visaDateFin: visaAccordeData.dateFin,
    });

    toast.success("Visa accordé : informations enregistrées.");
    setShowVisaAccordeModal(false);
    setVisaAccordeData({ numeroVisa: "", dateDebut: "", dateFin: "" });
  };

  const handleVisaRefuseClick = () => {
    if (!canDecideVisa) return;

    toast.custom(
      (t) => (
        <div className="toast-refuse">
          <h3 className="toast-refuse-title">Confirmer le refus de visa</h3>
          <p className="toast-refuse-text">Cette action est définitive. Le dossier sera clôturé.</p>

          <div className="toast-refuse-actions">
            <button className="toast-btn-cancel" onClick={() => toast.dismiss(t.id)}>
              Annuler
            </button>
            <button
              className="toast-btn-confirm-refuse"
              onClick={() => {
                toast.dismiss(t.id);
                onUpdateDossierStatus(dossier.id, "VISA_REFUSE");
                toast.success("Visa refusé : dossier clôturé.", { position: "top-right" });
              }}
            >
              Confirmer le refus
            </button>
          </div>
        </div>
      ),
      { position: "top-center", duration: Infinity }
    );
  };

  return (
    <>
      <section className="detail-grid">
        {/* LEFT */}
        <section className="card-detail">
          <div className="section-header">
            <h2>Résumé du dossier</h2>
          </div>

          <div className="detail-inner">
            <Stepper stepIndex={stepIndex} />

            <p className="detail-strong-line">
              <strong>{dossier.employee?.name}</strong> – {dossier.employee?.poste}
            </p>

            <p>
              Motif du déplacement : <strong>{dossier.motif || "—"}</strong>
            </p>

            <p>
              Date de départ : <strong>{dossier.departureDate}</strong>
            </p>

            <p>
              Date de retour : <strong>{dossier.returnDate}</strong>
            </p>

            <div className="status-block">
              <span className="label">Statut dossier :</span>
              <StatusPill status={dossier.status} />
            </div>

            <div className="progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${summary.progressPercent}%` }} />
              </div>
              <span className="progress-text">{summary.progressPercent}% des documents requis sont fournis</span>
            </div>

            <p className="muted">
              {summary.ok}/{summary.totalRequired} documents requis fournis – {summary.missing} manquants (
              {summary.physicalDocs} à apporter physiquement).
            </p>

            <div className="actions-stack">
              <div className="primary-action">
                <button
                  className="btn-primary"
                  disabled={!canOpenPretDepotModal}
                  title={
                    isFinal
                      ? "Dossier clôturé"
                      : !allDocumentsProvided
                      ? "Tous les documents requis doivent être fournis"
                      : ""
                  }
                  onClick={handlePretDepotClick}
                >
                  Prêt pour dépôt
                </button>
              </div>

              <div className="decision-block">
                <div className="decision-title">Décision visa</div>

                <div className="decision-actions">
                  <button className="btn-success" disabled={!canDecideVisa} onClick={() => setShowVisaAccordeModal(true)}>
                    Visa accordé
                  </button>

                  <button className="btn-danger" disabled={!canDecideVisa} onClick={handleVisaRefuseClick}>
                    Visa refusé
                  </button>
                </div>
              </div>
            </div>

            {!canDecideVisa && !isFinal && (
              <div className="detail-hint">
                <LockedHint text="Le résultat du visa est disponible après “Prêt pour dépôt”." />
              </div>
            )}

            {isFinal && (
              <div className="detail-hint">
                <LockedHint text="Dossier clôturé : résultat final verrouillé." />
              </div>
            )}
          </div>
        </section>

        <section className="card-detail">
          <div className="section-header">
            <h2>Documents du dossier</h2>
          </div>

          <table className="docs-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Actions</th>
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
                        {DOCUMENT_STATUS_LABEL[doc.status] || doc.status}
                      </span>
                    </td>

                    <td className="doc-actions">
                      {isFinal ? (
                        <span className="muted">Dossier clôturé</span>
                      ) : (
                        <>
                          {doc.mode === "PHYSICAL" && (
                            <button
                              className="btn-physical"
                              onClick={() => {
                                onUpdateDocStatus(doc.id, "RECEIVED_PHYSICAL");
                                toast.success("Document marqué comme reçu physiquement.");
                              }}
                            >
                              Reçu
                            </button>
                          )}

                          {(doc.code === "ASSURANCE" || doc.code === "BILLET_AVION") && (
                            <>
                              <button onClick={() => onSendSpecificEmail(doc)}>Envoi mail</button>
                              <button onClick={() => onUploadPdf(doc)}>Upload PDF</button>
                              <button
                                onClick={() => {
                                  if (!doc.fileUrl) return toast.error("Aucun PDF uploadé.");
                                  onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                }}
                              >
                                Aperçu
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
                                Remplir formulaire
                              </button>
                              <button onClick={() => onUploadPdf(doc)}>Upload récépissé</button>
                              <button
                                onClick={() => {
                                  if (!doc.fileUrl) return toast.error("Aucun récépissé PDF uploadé.");
                                  onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                }}
                              >
                                Aperçu PDF
                              </button>
                            </>
                          )}

                          {doc.code === "RESERVATION_HOTEL" && (
                            <>
                              <button
                                className="btn-booking"
                                onClick={() =>
                                  window.open("https://www.booking.com", "_blank", "noopener,noreferrer")
                                }
                              >
                                Réserver hôtel
                              </button>
                              <button onClick={() => onUploadPdf(doc)}>Upload PDF</button>
                              <button
                                onClick={() => {
                                  if (!doc.fileUrl) return toast.error("Aucun PDF de réservation uploadé.");
                                  onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                }}
                              >
                                Aperçu
                              </button>
                            </>
                          )}

                          {(doc.code === "ATTESTATION_TRAVAIL" ||
                            doc.code === "INVITATION" ||
                            doc.code === "ORDRE_MISSION") && (
                            <>
                              <button onClick={() => onGeneratePdf(doc)}>Générer PDF</button>
                              <button
                                onClick={() => {
                                  if (!doc.fileUrl) return toast.error("Aucun fichier généré.");
                                  onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                }}
                              >
                                Aperçu
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
                                <button onClick={() => onUploadPdf(doc)}>Upload PDF</button>
                                <button
                                  onClick={() => {
                                    if (!doc.fileUrl) return toast.error("Aucun PDF uploadé.");
                                    onOpenProtectedFile(doc.fileUrl).catch((e) => toast.error(e.message));
                                  }}
                                >
                                  Aperçu
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
              <h2>Visa Accordé - Dossier de {dossier.employee?.name}</h2>
              <button className="modal-close" onClick={() => setShowVisaAccordeModal(false)}>
                ✕
              </button>
            </div>

            <div className="create-form">
              {!canDecideVisa ? (
                <p className="error-text">Vous devez d’abord marquer le dossier comme “Prêt pour dépôt”.</p>
              ) : (
                <>
                  <div className="form-row">
                    <div>
                      <label>Numéro de visa</label>
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
                      <label>Date début validité</label>
                      <input
                        type="date"
                        value={visaAccordeData.dateDebut}
                        onChange={(e) => setVisaAccordeData((p) => ({ ...p, dateDebut: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label>Date fin validité</label>
                      <input
                        type="date"
                        value={visaAccordeData.dateFin}
                        onChange={(e) => setVisaAccordeData((p) => ({ ...p, dateFin: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-outline" onClick={() => setShowVisaAccordeModal(false)}>
                      Annuler
                    </button>

                    <button
                      type="button"
                      className="btn-success"
                      onClick={handleVisaAccordeSubmit}
                      disabled={!visaAccordeData.numeroVisa || !visaAccordeData.dateDebut || !visaAccordeData.dateFin}
                    >
                      Confirmer Visa Accordé
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
              <h2>Documents Prêts pour Dépôt - {dossier.employee?.name}</h2>
              <button className="modal-close" onClick={() => setShowPretDepotModal(false)}>
                ✕
              </button>
            </div>

            <div className="create-form">
              <div className="form-row">
                <div className="ready-docs-wrap">
                  <h3>Liste des documents fournis :</h3>

                  <ul className="ready-docs-list">
                    {(dossier.documents || [])
                      .filter((doc) => isDocumentSatisfied(doc))
                      .map((doc) => (
                        <li key={doc.id} className="ready-doc-item">
                          <strong>{doc.label}</strong>
                          <div className="ready-doc-meta">
                            Type: {getDocumentType(doc.code)} | Statut: {DOCUMENT_STATUS_LABEL[doc.status] || doc.status}
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-outline" onClick={handlePrintDocuments}>
                  🖨 Imprimer les documents
                </button>

                <button type="button" className="btn-outline" onClick={() => setShowPretDepotModal(false)}>
                  Annuler
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (!canConfirmPretDepot) return;
                    onUpdateDossierStatus(dossier.id, "PRET_POUR_DEPOT");
                    toast.success("Dossier marqué comme 'Prêt pour dépôt'.");
                    setShowPretDepotModal(false);
                  }}
                  disabled={!canConfirmPretDepot}
                >
                  Confirmer Prêt pour Dépôt
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
export default function Visa() {
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
        // credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        throw new Error("Non autorisé (401). Merci de vous reconnecter.");
      }
      if (!res.ok) {
        throw new Error(data?.message || `Erreur HTTP ${res.status}`);
      }
      return data;
    },
    [getAuthHeaders]
  );

  /** ✅ ouvrir fichier protégé (visa-pdfs / visa-generated) via blob */
  const openProtectedFile = useCallback(
    async (fileUrl) => {
      if (!fileUrl) throw new Error("URL fichier manquante.");
  
      if (!isValidHttpUrl(fileUrl)) {
        throw new Error("URL invalide.");
      }
      
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    },
    [getAuthHeaders]
  );

  /** ✅ ouvrir PDF complet dossier (protégé) */
    const openDossierPdf = useCallback(
    async (dossierId) => {
      const url = `${API}/api/visa-dossiers/${dossierId}/dossier-pdf`;
      const res = await fetch(url, { headers: { ...getAuthHeaders() } });

      if (res.status === 401) throw new Error("Non autorisé (401). Merci de vous reconnecter.");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Erreur HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      window.open(blobUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    },
    [getAuthHeaders]
  );
  
  /** ✅ Chargement employees */
  useEffect(() => {
    if (!API) {
      toast.error("REACT_APP_API_URL manquant (.env)");
      return;
    }

    (async () => {
      setEmployeesLoading(true);
      try {
        const data = await fetchJson(`${API}/api/employee`);
        setEmployees(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error(e.message || "Erreur chargement employees");
      } finally {
        setEmployeesLoading(false);
      }
    })();
  }, [fetchJson]);

  /** ✅ Refresh dossiers */
  const refreshDossiers = useCallback(async () => {
    if (!API) return;
    try {
      setPageLoading(true);
      const data = await fetchJson(`${API}/api/visa-dossiers`);
      setDossiers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Erreur chargement dossiers");
    } finally {
      setPageLoading(false);
    }
  }, [fetchJson]);

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
        toast.error(e.message || "Erreur ouverture dossier");
      }
    },
    [fetchJson]
  );

  /** ✅ Filtre dashboard */
  const filteredDossiers = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return dossiers;
    return dossiers.filter(
      (d) =>
        (d.employee?.name || "").toLowerCase().includes(term) ||
        (d.motif || "").toLowerCase().includes(term)
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
      setFormError("Merci de remplir tous les champs obligatoires.");
      toast.error("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (returnDate < departureDate) {
      setFormError("La date de retour doit être >= date de départ.");
      toast.error("La date de retour doit être >= date de départ.");
      return;
    }

    const emp = employees.find((x) => String(x.id) === String(employeeId));
    const employeeName = emp ? `${emp.prenom ?? ""} ${emp.nom ?? ""}`.trim() : "Employé";

    const loadingId = toast.loading("Création du dossier…");
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
        toast.success(`Dossier créé. Email envoyé à ${employeeName} (instructions + liste des documents requis).`, {
          duration: 9000,
        });
      } else {
        toast.error(
          `Dossier créé, mais email NON envoyé à ${employeeName}. ${data?.emailError ? `Raison : ${data.emailError}` : ""}`,
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
      toast.error(err.message || "Erreur création dossier");
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
      toast.error(e.message || "Erreur mise à jour document");
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
      toast.error(e.message || "Erreur mise à jour dossier");
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
      form.append("pdfFile", file); // ✅ IMPORTANT

      const loadingId = toast.loading("Upload du PDF…");
      try {
        const res = await fetch(`${API}/api/visa-documents/${doc.id}/upload`, {
          method: "POST",
          body: form,
          headers: { ...getAuthHeaders() }, // ✅ IMPORTANT
          // credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        toast.dismiss(loadingId);

        if (res.status === 401) throw new Error("Non autorisé (401). Merci de vous reconnecter.");
        if (!res.ok) throw new Error(data?.message || "Erreur upload");

        toast.success("PDF uploadé avec succès.");
        await openDossier(selectedDossierId);
      } catch (e) {
        toast.dismiss(loadingId);
        toast.error(e.message || "Erreur upload");
      }
    };
    input.click();
  }

  /** ✅ generate PDF (en réalité backend renvoie fileUrl doc/docx) */
  async function generatePdf(doc) {
    const dossier = selectedDossier;
    if (!dossier) return;

    const employeId = dossier.employee?.id;
    if (!employeId) {
      toast.error("Employé introuvable dans le dossier.");
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
      toast.error("Génération non disponible pour ce document.");
      return;
    }

    const loadingId = toast.loading("Génération…");
    try {
      const data = await fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.dismiss(loadingId);

      toast.success("Fichier généré avec succès.");

      if (data?.fileUrl) {
        // ✅ route protégée → ouvrir via blob
        await openProtectedFile(data.fileUrl);
      }

      await openDossier(selectedDossierId);
    } catch (e) {
      toast.dismiss(loadingId);
      toast.error(e.message || "Erreur génération");
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
      toast.error("Envoi mail non disponible pour ce document.");
      return;
    }

    const loadingId = toast.loading("Envoi de l’email…");
    try {
      await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId: selectedDossierId }),
      });
      toast.dismiss(loadingId);
      toast.success("Email envoyé ✅");
    } catch (e) {
      toast.dismiss(loadingId);
      toast.error(`Email non envoyé ❌ : ${e.message}`);
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
              <h1 className="page-title">Dossiers Visa France</h1>
              <p className="page-subtitle">Chargement…</p>
            </div>
          </div>
          <div className="loading" style={{ padding: 24 }}>
            <div className="loading-spinner" />
            <p>Chargement des dossiers visa…</p>
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
            style: {
              background: "#ecfdf5",
              color: "#065f46",
              borderLeft: "7px solid #16a34a",
            },
            iconTheme: { primary: "#16a34a", secondary: "#ecfdf5" },
          },
          error: {
            style: {
              background: "#fef2f2",
              color: "#7f1d1d",
              borderLeft: "7px solid #dc2626",
            },
            iconTheme: { primary: "#dc2626", secondary: "#fef2f2" },
          },
          loading: {
            style: {
              background: "#eff6ff",
              color: "#1e3a8a",
              borderLeft: "7px solid #2563eb",
            },
          },
        }}
      />

      <div className="main">
        <div className="page-header-card">
          <div className="page-header-icon">📋</div>

          <div className="page-header-text">
            <h1 className="page-title">Dossiers Visa France</h1>
            <p className="page-subtitle">
              {selectedDossier ? "Suivi détaillé du dossier visa" : "Gestion des demandes de visa professionnel - Tableau de bord"}
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
              ← Retour au dashboard
            </button>
          )}
        </div>

        {!selectedDossier && (
          <div className="page-toolbar">
            <div className="toolbar-left">
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder="Rechercher un employé ou un motif..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="toolbar-center">
              <span className="toolbar-count">
                {filteredDossiers.length} {filteredDossiers.length === 1 ? "dossier trouvé" : "dossiers trouvés"}
              </span>
            </div>

            <div className="toolbar-right">
              <div className="status-filter-wrapper">
                <select defaultValue="" onChange={handleStatusJump}>
                  <option value="">Statut</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="PRET_POUR_DEPOT">Prêt pour dépôt</option>
                  <option value="VISA_ACCORDE">Visa accordé</option>
                  <option value="VISA_REFUSE">Visa refusé</option>
                </select>
              </div>

              <button className="btn-primary" onClick={handleOpenCreate}>
                + Nouveau dossier
              </button>
            </div>
          </div>
        )}

        {!selectedDossier && isCreating && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Créer un nouveau dossier visa</h2>
                <button className="modal-close" onClick={handleCancelCreate}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDossier} className="create-form">
                <div className="form-row">
                  <div>
                    <EmployeeSearchSelect
                      label="Nom & Prénom"
                      required
                      employees={employees}
                      loading={employeesLoading}
                      value={newDossierForm.employeeId}
                      onChange={(employeeId) => setNewDossierForm((p) => ({ ...p, employeeId }))}
                      groupLabel="Employees - STS"
                    />
                  </div>

                  <div>
                    <label>
                      Motif du déplacement <span className="required">*</span>
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
                      Date de départ <span className="required">*</span>
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
                      Date de retour <span className="required">*</span>
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
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary">
                    Créer le dossier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {!selectedDossier && (
          <>
            <section className="kpi-grid">
              <KpiCard label="Dossiers en cours" value={stats.enCours} type="warning" />
              <KpiCard label="Prêts pour dépôt" value={stats.pretDepot} type="info" />
              <KpiCard label="Visa accordé" value={stats.visaAccorde} type="success" />
              <KpiCard label="Visa refusé" value={stats.visaRefuse} type="danger" />
            </section>

            <div className="dossiers-container">
              <Section title="📋 Dossiers en cours" sectionStatus="EN_COURS" innerRef={enCoursRef} dossiers={dossiersEnCours} onOpen={openDossier} />
              <Section title="✅ Dossiers prêts pour dépôt" sectionStatus="PRET_POUR_DEPOT" innerRef={pretDepotRef} dossiers={dossiersPretDepot} onOpen={openDossier} />
              <Section title="🎉 Visa accordé" sectionStatus="VISA_ACCORDE" innerRef={visaAccordeRef} dossiers={dossiersVisaAccorde} onOpen={openDossier} />
              <Section title="❌ Visa refusé" sectionStatus="VISA_REFUSE" innerRef={visaRefuseRef} dossiers={dossiersVisaRefuse} onOpen={openDossier} />
            </div>
          </>
        )}

        {selectedDossier && (
          <DossierDetail
            dossier={selectedDossier}
            onUpdateDocStatus={updateDocStatus}
            onUpdateDossierStatus={updateDossierStatus}
            onUploadPdf={uploadPdf}
            onGeneratePdf={generatePdf}
            onSendSpecificEmail={sendSpecificEmail}
            onOpenProtectedFile={openProtectedFile}
            onOpenDossierPdf={openDossierPdf}
          />
        )}
      </div>
    </div>
  );
}
