let _handler = null;

export const onUndoTrigger = (handler) => {
  _handler = handler;
  return () => { if (_handler === handler) _handler = null; };
};

export const triggerUndo = (orderId, prevStatus) => {
  _handler?.(orderId, prevStatus);
};
