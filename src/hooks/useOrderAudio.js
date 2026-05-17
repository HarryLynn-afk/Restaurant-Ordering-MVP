import { useEffect, useRef, useCallback } from 'react';

export default function useOrderAudio() {
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  const playChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const play = () => {
        [[880, 0], [1100, 0.18]].forEach(([freq, delay]) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.5);
        });
      };
      if (ctx.state === 'suspended') {
        ctx.resume().then(play).catch(() => {});
      } else {
        play();
      }
    } catch {
      // Audio feedback is best-effort and should never block status updates.
    }
  }, []);

  return { playChime };
}
