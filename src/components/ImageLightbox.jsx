const ImageLightbox = ({ src, open, onClose }) => {
  if (!open || !src) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <img src={src} alt="" className="max-w-full max-h-full rounded-xl" />
    </div>
  );
};

export default ImageLightbox;
