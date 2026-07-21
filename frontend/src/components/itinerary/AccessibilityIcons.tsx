import type { AccessibilityInfo } from '@travel-ai/shared';

const ITEMS: Array<{
  key: keyof AccessibilityInfo;
  icon: string;
  label: (info: AccessibilityInfo) => string;
  show: (info: AccessibilityInfo) => boolean;
}> = [
  {
    key: 'hasElevator',
    icon: '🛗',
    label: () => '엘리베이터 있음',
    show: (info) => info.hasElevator === true,
  },
  {
    key: 'stairsCount',
    icon: '🪜',
    label: (info) => (info.stairsCount === 0 ? '계단 없음' : `계단 ${info.stairsCount}개`),
    show: (info) => info.stairsCount !== undefined,
  },
  {
    key: 'hasRestArea',
    icon: '🪑',
    label: () => '중간에 쉴 곳 있음',
    show: (info) => info.hasRestArea === true,
  },
  {
    key: 'hasShade',
    icon: '⛱️',
    label: () => '그늘/실내 대기 공간 있음',
    show: (info) => info.hasShade === true,
  },
  {
    key: 'restroomNearby',
    icon: '🚻',
    label: () => '화장실 가까움',
    show: (info) => info.restroomNearby === true,
  },
];

export function AccessibilityIcons({ info }: { info?: AccessibilityInfo }) {
  if (!info) return null;

  const visible = ITEMS.filter((item) => item.show(info));
  if (visible.length === 0 && !info.notes) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
      {visible.map((item) => (
        <span
          key={item.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.25rem 0.6rem',
            borderRadius: 999,
            background: 'var(--color-fill)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text)',
          }}
        >
          <span aria-hidden="true">{item.icon}</span>
          <span>{item.label(info)}</span>
        </span>
      ))}
      {info.notes && (
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>{info.notes}</span>
      )}
    </div>
  );
}
