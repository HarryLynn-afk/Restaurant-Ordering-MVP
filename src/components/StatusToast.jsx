const STATUS_BG = {
  success: 'bg-green-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

const StatusToast = ({ headline, tone, onDismiss }) => (
  <div
    className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-medium max-w-xs w-full animate-bounce-in ${STATUS_BG[tone] || STATUS_BG.info}`}
    style={{ animation: 'slideDown 0.3s ease-out' }}
  >
    <span className="flex-1 text-center">{headline}</span>
    <button onClick={onDismiss} className="opacity-70 hover:opacity-100 shrink-0">✕</button>
  </div>
);

export default StatusToast;
