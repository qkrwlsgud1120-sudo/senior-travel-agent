import { useEffect, useState, type CSSProperties } from 'react';

const dotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 4,
  background: 'var(--color-muted)',
  animation: 'senior-travel-typing-dot 1s infinite ease-in-out',
};

// Most turns (quick questions, STEP1/STEP2) resolve in a second or two, but
// itinerary search/proposal can legitimately take 1-2 minutes (multiple
// Claude tool-use iterations + real place/route lookups). Showing this text
// immediately would make fast replies look needlessly alarming, so it only
// appears once a reply has actually been waiting a while.
const REASSURANCE_DELAY_MS = 5000;

export function TypingIndicator() {
  const [showReassurance, setShowReassurance] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowReassurance(true), REASSURANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ margin: '0.4rem 1rem 0.4rem 3.4rem' }}>
      <style>{`@keyframes senior-travel-typing-dot { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }`}</style>
      <div style={{ display: 'flex', gap: 6 }} aria-label="답변을 준비하고 있어요">
        <div style={dotStyle} />
        <div style={{ ...dotStyle, animationDelay: '0.15s' }} />
        <div style={{ ...dotStyle, animationDelay: '0.3s' }} />
      </div>
      {showReassurance && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', margin: '0.5rem 0 0' }}>
          일정을 준비하고 있어요. 실제 장소를 찾아보는 중이라 최대 2분 정도 걸릴 수 있어요. 잠시만 기다려 주세요.
        </p>
      )}
    </div>
  );
}
