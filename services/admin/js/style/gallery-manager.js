export const galleryManageStyle = `
.gallery-manager-shell .menu-panel-wide { grid-column: 1 / -1; }
.gallery-preview-cell { width: 96px; }
.gallery-thumb {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  object-fit: cover;
  display: block;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(15,23,42,0.55);
}
.gallery-empty-thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 14px;
  background: rgba(255,255,255,0.06);
  color: #94a3b8;
}
.gallery-cols .col-preview { width: 96px; }
.gallery-cols .col-name { width: 30%; }
.gallery-cols .col-type { width: 12%; }
.gallery-cols .col-status { width: 12%; }
.gallery-cols .col-order { width: 10%; }
.gallery-cols .col-updated { width: 16%; }
.gallery-cols .col-actions { width: 14%; }
.gallery-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 20px;
}
.gallery-form-main, .gallery-form-preview {
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(15,23,42,0.36);
  border-radius: 18px;
  padding: 18px;
}
.gallery-form-main { display: flex; flex-direction: column; gap: 12px; }
.gallery-form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.field-label { font-weight: 600; color: #e2e8f0; font-size: 14px; }
.field-hint { margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6; }
.gallery-toggle { display: inline-flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 14px; }
.gallery-form-preview { display: flex; align-items: center; justify-content: center; min-height: 320px; }
.gallery-media-preview { width: 100%; max-height: 420px; object-fit: contain; border-radius: 14px; background: rgba(2,6,23,0.45); }
.gallery-media-placeholder {
  width: 100%; min-height: 320px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #94a3b8; background: radial-gradient(circle at top, rgba(59,130,246,0.2), rgba(15,23,42,0.45));
}
.gallery-media-placeholder i { font-size: 42px; color: #60a5fa; }
@media (max-width: 980px) {
  .gallery-form-grid { grid-template-columns: 1fr; }
  .gallery-form-preview { min-height: 260px; }
}
`;