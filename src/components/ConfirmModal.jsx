const ConfirmModal = ({ open, title, message, confirmLabel, cancelLabel, onConfirm, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
        <div className="space-y-1">
          <h3 className="font-bold text-foreground text-lg">{title}</h3>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-border py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
