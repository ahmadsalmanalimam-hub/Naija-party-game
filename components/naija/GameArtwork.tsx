'use client';

import React from 'react';

interface GameArtworkProps {
  gameId: string;
  className?: string;
}

export function GameArtwork({ gameId, className = '' }: GameArtworkProps) {
  switch (gameId) {
    case 'danfo_rush':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#1E293B" />
          <rect x="0" y="90" width="240" height="40" fill="#334155" />
          <line x1="0" y1="68" x2="240" y2="68" stroke="#FDE047" strokeWidth="4" strokeDasharray="18 14" />
          {/* Speed lines */}
          <line x1="18" y1="45" x2="55" y2="45" stroke="#22D3EE" strokeWidth="4" strokeLinecap="round" />
          <line x1="10" y1="60" x2="42" y2="60" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
          {/* Cartoon Danfo Bus */}
          <rect x="64" y="34" width="122" height="58" rx="14" fill="#FACC15" stroke="#0F172A" strokeWidth="5" />
          <rect x="74" y="44" width="32" height="20" rx="4" fill="#E0F2FE" stroke="#0F172A" strokeWidth="3" />
          <rect x="112" y="44" width="32" height="20" rx="4" fill="#E0F2FE" stroke="#0F172A" strokeWidth="3" />
          <rect x="150" y="44" width="26" height="22" rx="4" fill="#BAE6FD" stroke="#0F172A" strokeWidth="3" />
          <rect x="64" y="70" width="122" height="9" fill="#0F172A" />
          <circle cx="92" cy="94" r="13" fill="#0F172A" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="158" cy="94" r="13" fill="#0F172A" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="92" cy="94" r="4" fill="#94A3B8" />
          <circle cx="158" cy="94" r="4" fill="#94A3B8" />
          {/* Nitro flame */}
          <path d="M58 68 L30 58 L40 68 L28 78 Z" fill="#F97316" stroke="#0F172A" strokeWidth="2.5" />
        </svg>
      );

    case 'lagos_crossing':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#10B981" />
          <rect x="0" y="28" width="240" height="74" fill="#334155" />
          {[32, 76, 120, 164, 208].map((x) => (
            <rect key={x} x={x} y="56" width="22" height="18" rx="3" fill="#F8FAFC" opacity="0.85" />
          ))}
          {/* Cars */}
          <rect x="26" y="34" width="54" height="24" rx="8" fill="#EF4444" stroke="#0F172A" strokeWidth="4" />
          <rect x="152" y="72" width="60" height="24" rx="8" fill="#FACC15" stroke="#0F172A" strokeWidth="4" />
          {/* Hopping runner */}
          <circle cx="120" cy="108" r="14" fill="#3B82F6" stroke="#0F172A" strokeWidth="4" />
          <circle cx="115" cy="104" r="2.5" fill="#FFFFFF" />
          <circle cx="125" cy="104" r="2.5" fill="#FFFFFF" />
          <path d="M120 88 L120 72 M112 79 L120 71 L128 79" stroke="#22D3EE" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'jollof_master':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#7C2D12" />
          <circle cx="120" cy="65" r="56" fill="#9A3412" />
          {/* Flying tomatoes & rice */}
          <circle cx="52" cy="34" r="12" fill="#EF4444" stroke="#0F172A" strokeWidth="3.5" />
          <circle cx="188" cy="36" r="12" fill="#FACC15" stroke="#0F172A" strokeWidth="3.5" />
          <ellipse cx="184" cy="90" rx="14" ry="9" fill="#FDE047" stroke="#0F172A" strokeWidth="3.5" />
          {/* Steaming Pot */}
          <path d="M74 62 H166 L158 106 C156 113, 84 113, 82 106 Z" fill="#DC2626" stroke="#0F172A" strokeWidth="4.5" />
          <ellipse cx="120" cy="62" rx="46" ry="12" fill="#F97316" stroke="#0F172A" strokeWidth="4" />
          <ellipse cx="120" cy="61" rx="34" ry="7" fill="#FDE68A" />
          <path d="M98 42 Q94 28 104 20" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.8" />
          <path d="M122 39 Q118 24 128 16" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.8" />
          <path d="M144 43 Q140 30 150 22" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.8" />
        </svg>
      );

    case 'bumper_cars':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#0369A1" />
          <ellipse cx="120" cy="70" rx="96" ry="48" fill="#1E293B" stroke="#F59E0B" strokeWidth="5" />
          {/* Red Car */}
          <circle cx="84" cy="68" r="24" fill="#EF4444" stroke="#0F172A" strokeWidth="4.5" />
          <circle cx="84" cy="68" r="12" fill="#FCA5A5" stroke="#0F172A" strokeWidth="3" />
          {/* Blue Car */}
          <circle cx="152" cy="68" r="24" fill="#3B82F6" stroke="#0F172A" strokeWidth="4.5" />
          <circle cx="152" cy="68" r="12" fill="#93C5FD" stroke="#0F172A" strokeWidth="3" />
          {/* Impact Star */}
          <path d="M118 36 L124 54 L140 50 L126 66 L136 82 L118 72 L102 82 L110 66 L96 50 L112 54 Z" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
        </svg>
      );

    case 'rising_lava':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#EA580C" />
          <circle cx="40" cy="108" r="10" fill="#FDE047" opacity="0.6" />
          <circle cx="204" cy="28" r="8" fill="#FDE047" opacity="0.6" />
          {/* Floating Safe Tiles */}
          <rect x="34" y="34" width="52" height="36" rx="8" fill="#10B981" stroke="#0F172A" strokeWidth="4" />
          <rect x="94" y="48" width="52" height="36" rx="8" fill="#F59E0B" stroke="#0F172A" strokeWidth="4" />
          <rect x="154" y="34" width="52" height="36" rx="8" fill="#10B981" stroke="#0F172A" strokeWidth="4" />
          {/* Player jumping */}
          <circle cx="120" cy="40" r="15" fill="#22D3EE" stroke="#0F172A" strokeWidth="4" />
          <circle cx="115" cy="37" r="2.5" fill="#0F172A" />
          <circle cx="125" cy="37" r="2.5" fill="#0F172A" />
        </svg>
      );

    case 'sumo_battle':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#312E81" />
          <ellipse cx="120" cy="72" rx="92" ry="44" fill="#FDE68A" stroke="#FFFFFF" strokeWidth="5" />
          <circle cx="88" cy="64" r="25" fill="#EF4444" stroke="#0F172A" strokeWidth="4.5" />
          <circle cx="152" cy="64" r="25" fill="#10B981" stroke="#0F172A" strokeWidth="4.5" />
          <path d="M108 60 L132 60" stroke="#FDE047" strokeWidth="6" strokeLinecap="round" />
          <circle cx="88" cy="59" r="3" fill="#FFFFFF" />
          <circle cx="152" cy="59" r="3" fill="#FFFFFF" />
        </svg>
      );

    case 'air_hockey':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#0F172A" />
          <rect x="14" y="14" width="212" height="102" rx="12" fill="#0E7490" stroke="#22D3EE" strokeWidth="4" />
          <line x1="120" y1="14" x2="120" y2="116" stroke="#A5F3FC" strokeWidth="3" opacity="0.6" />
          <circle cx="120" cy="65" r="22" fill="none" stroke="#A5F3FC" strokeWidth="3" opacity="0.6" />
          <circle cx="62" cy="65" r="18" fill="#EF4444" stroke="#0F172A" strokeWidth="4" />
          <circle cx="178" cy="65" r="18" fill="#3B82F6" stroke="#0F172A" strokeWidth="4" />
          <circle cx="120" cy="65" r="11" fill="#FDE047" stroke="#0F172A" strokeWidth="3.5" />
        </svg>
      );

    case 'street_football':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#059669" />
          <rect x="16" y="16" width="208" height="98" rx="8" fill="none" stroke="#FFFFFF" strokeWidth="3.5" opacity="0.8" />
          <line x1="120" y1="16" x2="120" y2="114" stroke="#FFFFFF" strokeWidth="3" opacity="0.7" />
          <circle cx="120" cy="65" r="20" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.7" />
          {/* Goalposts */}
          <rect x="6" y="42" width="12" height="46" rx="3" fill="#EF4444" stroke="#0F172A" strokeWidth="3" />
          <rect x="222" y="42" width="12" height="46" rx="3" fill="#3B82F6" stroke="#0F172A" strokeWidth="3" />
          {/* Football */}
          <circle cx="120" cy="65" r="17" fill="#FFFFFF" stroke="#0F172A" strokeWidth="4" />
          <polygon points="120,54 128,61 125,71 115,71 112,61" fill="#0F172A" />
        </svg>
      );

    case 'ludo':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#F8FAFC" />
          <rect x="22" y="12" width="70" height="48" rx="8" fill="#EF4444" stroke="#0F172A" strokeWidth="3.5" />
          <rect x="148" y="12" width="70" height="48" rx="8" fill="#3B82F6" stroke="#0F172A" strokeWidth="3.5" />
          <rect x="22" y="70" width="70" height="48" rx="8" fill="#FACC15" stroke="#0F172A" strokeWidth="3.5" />
          <rect x="148" y="70" width="70" height="48" rx="8" fill="#10B981" stroke="#0F172A" strokeWidth="3.5" />
          {/* Big Dice */}
          <rect x="95" y="40" width="50" height="50" rx="12" fill="#FFFFFF" stroke="#0F172A" strokeWidth="4.5" />
          <circle cx="109" cy="54" r="4.5" fill="#0F172A" />
          <circle cx="131" cy="54" r="4.5" fill="#0F172A" />
          <circle cx="120" cy="65" r="4.5" fill="#EF4444" />
          <circle cx="109" cy="76" r="4.5" fill="#0F172A" />
          <circle cx="131" cy="76" r="4.5" fill="#0F172A" />
        </svg>
      );

    case 'ayo':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#78350F" />
          <rect x="16" y="18" width="208" height="94" rx="20" fill="#B45309" stroke="#0F172A" strokeWidth="4.5" />
          {[46, 83, 120, 157, 194].map((x) => (
            <React.Fragment key={x}>
              <circle cx={x} cy="46" r="14" fill="#451A03" stroke="#0F172A" strokeWidth="3" />
              <circle cx={x - 3} cy="45" r="3.5" fill="#FDE68A" />
              <circle cx={x + 4} cy="48" r="3.5" fill="#FACC15" />
              <circle cx={x} cy="84" r="14" fill="#451A03" stroke="#0F172A" strokeWidth="3" />
              <circle cx={x - 3} cy="83" r="3.5" fill="#34D399" />
              <circle cx={x + 4} cy="86" r="3.5" fill="#FDE68A" />
            </React.Fragment>
          ))}
        </svg>
      );

    case 'suya_chef':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#7C2D12" />
          <rect x="28" y="68" width="184" height="44" rx="12" fill="#1E293B" stroke="#0F172A" strokeWidth="4.5" />
          <ellipse cx="120" cy="70" rx="82" ry="12" fill="#F97316" />
          {/* Suya skewers */}
          <line x1="65" y1="90" x2="88" y2="28" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" />
          <rect x="65" y="42" width="22" height="14" rx="4" transform="rotate(-68 76 49)" fill="#DC2626" stroke="#0F172A" strokeWidth="3" />
          <line x1="115" y1="90" x2="125" y2="22" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" />
          <rect x="108" y="38" width="24" height="15" rx="4" transform="rotate(-82 120 45)" fill="#B91C1C" stroke="#0F172A" strokeWidth="3" />
          <line x1="168" y1="90" x2="152" y2="28" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" />
          <rect x="148" y="42" width="22" height="14" rx="4" transform="rotate(-108 159 49)" fill="#EA580C" stroke="#0F172A" strokeWidth="3" />
          <circle cx="96" cy="28" r="5" fill="#FACC15" />
          <circle cx="144" cy="24" r="4" fill="#FDE047" />
        </svg>
      );

    case 'drum_master':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#4C1D95" />
          <path d="M72 30 Q120 55 168 30 L156 104 Q120 82 84 104 Z" fill="#D97706" stroke="#0F172A" strokeWidth="4.5" />
          <ellipse cx="120" cy="30" rx="48" ry="12" fill="#FDE68A" stroke="#0F172A" strokeWidth="4" />
          <ellipse cx="120" cy="104" rx="36" ry="9" fill="#F59E0B" stroke="#0F172A" strokeWidth="4" />
          <path d="M84 36 L94 98 M108 40 L110 98 M132 40 L130 98 M156 36 L146 98" stroke="#FEF3C7" strokeWidth="2.5" />
          <circle cx="42" cy="48" r="11" fill="#22D3EE" stroke="#0F172A" strokeWidth="3.5" />
          <circle cx="198" cy="46" r="11" fill="#FACC15" stroke="#0F172A" strokeWidth="3.5" />
          <circle cx="194" cy="86" r="9" fill="#F43F5E" stroke="#0F172A" strokeWidth="3.5" />
        </svg>
      );

    case 'gokart_race':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#15803D" />
          <rect x="20" y="16" width="200" height="98" rx="48" fill="none" stroke="#334155" strokeWidth="32" />
          <rect x="20" y="16" width="200" height="98" rx="48" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="10 10" />
          <rect x="108" y="88" width="12" height="32" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
          {/* Red & Blue Karts */}
          <rect x="64" y="14" width="32" height="18" rx="6" fill="#EF4444" stroke="#0F172A" strokeWidth="3.5" />
          <circle cx="80" cy="23" r="5" fill="#FDE047" />
          <rect x="140" y="96" width="32" height="18" rx="6" fill="#3B82F6" stroke="#0F172A" strokeWidth="3.5" />
          <circle cx="156" cy="105" r="5" fill="#FFFFFF" />
        </svg>
      );

    case 'boat_race':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#0369A1" />
          <path d="M12 36 Q38 28 64 36 T116 36 T168 36 T220 36" fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
          <path d="M18 98 Q46 90 74 98 T130 98 T186 98 T230 98" fill="none" stroke="#7DD3FC" strokeWidth="4" strokeLinecap="round" />
          {/* Speedboat */}
          <path d="M58 50 L152 50 L192 66 L152 82 L58 82 Z" fill="#FACC15" stroke="#0F172A" strokeWidth="4.5" />
          <polygon points="104,56 146,56 164,66 146,76 104,76" fill="#E0F2FE" stroke="#0F172A" strokeWidth="3" />
          <path d="M24 58 L54 54 L46 66 L54 78 L24 72 Z" fill="#22D3EE" stroke="#0F172A" strokeWidth="2.5" />
        </svg>
      );

    case 'battle_tank':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#365314" />
          <rect x="104" y="42" width="32" height="46" rx="6" fill="#92400E" stroke="#0F172A" strokeWidth="3.5" />
          {/* Tank 1 */}
          <rect x="28" y="46" width="44" height="34" rx="7" fill="#EF4444" stroke="#0F172A" strokeWidth="4" />
          <rect x="52" y="59" width="34" height="8" rx="3" fill="#CBD5E1" stroke="#0F172A" strokeWidth="3" />
          <circle cx="50" cy="63" r="10" fill="#DC2626" stroke="#0F172A" strokeWidth="3" />
          {/* Tank 2 */}
          <rect x="168" y="46" width="44" height="34" rx="7" fill="#3B82F6" stroke="#0F172A" strokeWidth="4" />
          <rect x="154" y="59" width="34" height="8" rx="3" fill="#CBD5E1" stroke="#0F172A" strokeWidth="3" />
          <circle cx="190" cy="63" r="10" fill="#2563EB" stroke="#0F172A" strokeWidth="3" />
          <circle cx="120" cy="24" r="7" fill="#FACC15" stroke="#0F172A" strokeWidth="3" />
        </svg>
      );

    case 'king_of_hill':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#312E81" />
          <ellipse cx="120" cy="82" rx="92" ry="38" fill="#10B981" stroke="#0F172A" strokeWidth="4" />
          <ellipse cx="120" cy="70" rx="54" ry="22" fill="#FACC15" stroke="#0F172A" strokeWidth="4" />
          {/* Crown */}
          <polygon
            points="92,58 98,30 112,44 120,24 128,44 142,30 148,58"
            fill="#FDE047"
            stroke="#0F172A"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="54" cy="90" r="12" fill="#EF4444" stroke="#0F172A" strokeWidth="3.5" />
          <circle cx="186" cy="90" r="12" fill="#3B82F6" stroke="#0F172A" strokeWidth="3.5" />
        </svg>
      );

    case 'penalty_shootout':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#15803D" />
          <rect x="40" y="20" width="160" height="72" fill="#166534" stroke="#FFFFFF" strokeWidth="6" />
          <line x1="80" y1="20" x2="80" y2="92" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
          <line x1="120" y1="20" x2="120" y2="92" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
          <line x1="160" y1="20" x2="160" y2="92" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
          <line x1="40" y1="56" x2="200" y2="56" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
          {/* Keeper gloves */}
          <circle cx="150" cy="58" r="11" fill="#FACC15" stroke="#0F172A" strokeWidth="3.5" />
          {/* Ball */}
          <circle cx="82" cy="86" r="16" fill="#FFFFFF" stroke="#0F172A" strokeWidth="4" />
          <polygon points="82,78 88,83 86,90 78,90 76,83" fill="#0F172A" />
        </svg>
      );

    case 'basketball':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#7C2D12" />
          <rect x="132" y="16" width="84" height="58" rx="8" fill="#F8FAFC" stroke="#0F172A" strokeWidth="4" />
          <rect x="156" y="34" width="36" height="24" fill="none" stroke="#EF4444" strokeWidth="4" />
          <line x1="150" y1="62" x2="198" y2="62" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
          <path d="M154 64 L162 94 L186 94 L194 64" fill="none" stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="72" cy="56" r="26" fill="#F97316" stroke="#0F172A" strokeWidth="4.5" />
          <path d="M46 56 Q72 44 98 56 M72 30 Q84 56 72 82" fill="none" stroke="#0F172A" strokeWidth="3" />
        </svg>
      );

    case 'connect_four':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#1E3A8A" />
          <rect x="34" y="16" width="172" height="98" rx="14" fill="#2563EB" stroke="#0F172A" strokeWidth="4.5" />
          {[0, 1, 2, 3, 4].map((c) =>
            [0, 1, 2].map((r) => {
              const isRed = (c === 1 && r === 2) || (c === 2 && r === 1) || (c === 3 && r === 0);
              const isYel = (c === 2 && r === 2) || (c === 3 && r === 2) || (c === 1 && r === 1);
              return (
                <circle
                  key={`${c}-${r}`}
                  cx={60 + c * 30}
                  cy={38 + r * 28}
                  r="10"
                  fill={isRed ? '#EF4444' : isYel ? '#FACC15' : '#0F172A'}
                  stroke="#0F172A"
                  strokeWidth="2.5"
                />
              );
            })
          )}
        </svg>
      );

    case 'snake_and_ladders':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#14532D" />
          <rect x="26" y="16" width="188" height="98" rx="12" fill="#FEF3C7" stroke="#0F172A" strokeWidth="4" />
          {/* Ladder */}
          <line x1="60" y1="102" x2="90" y2="28" stroke="#D97706" strokeWidth="5" strokeLinecap="round" />
          <line x1="80" y1="102" x2="110" y2="28" stroke="#D97706" strokeWidth="5" strokeLinecap="round" />
          <line x1="68" y1="84" x2="88" y2="84" stroke="#B45309" strokeWidth="4" />
          <line x1="76" y1="62" x2="96" y2="62" stroke="#B45309" strokeWidth="4" />
          <line x1="84" y1="42" x2="104" y2="42" stroke="#B45309" strokeWidth="4" />
          {/* Snake */}
          <path d="M174 30 Q142 52 178 72 T148 106" fill="none" stroke="#16A34A" strokeWidth="11" strokeLinecap="round" />
          <circle cx="174" cy="30" r="8" fill="#15803D" stroke="#0F172A" strokeWidth="2.5" />
        </svg>
      );

    case 'memory_match':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#5B21B6" />
          <rect x="28" y="20" width="52" height="90" rx="10" fill="#22D3EE" stroke="#0F172A" strokeWidth="4" />
          <polygon points="54,48 60,60 72,62 63,70 65,82 54,76 43,82 45,70 36,62 48,60" fill="#FACC15" stroke="#0F172A" strokeWidth="2.5" />
          <rect x="94" y="20" width="52" height="90" rx="10" fill="#FACC15" stroke="#0F172A" strokeWidth="4" />
          <polygon points="120,48 126,60 138,62 129,70 131,82 120,76 109,82 111,70 102,62 114,60" fill="#EF4444" stroke="#0F172A" strokeWidth="2.5" />
          <rect x="160" y="20" width="52" height="90" rx="10" fill="#A855F7" stroke="#0F172A" strokeWidth="4" />
          <text x="186" y="75" textAnchor="middle" fontSize="30" fontWeight="900" fill="#FFFFFF" fontFamily="sans-serif">?</text>
        </svg>
      );

    case 'math_battle':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#0369A1" />
          <rect x="24" y="18" width="192" height="94" rx="14" fill="#0F172A" stroke="#FACC15" strokeWidth="4.5" />
          <text x="120" y="76" textAnchor="middle" fontSize="34" fontWeight="900" fill="#22D3EE" fontFamily="monospace">
            7 × 8 = ?
          </text>
          <circle cx="48" cy="40" r="9" fill="#EF4444" />
          <circle cx="192" cy="92" r="9" fill="#10B981" />
        </svg>
      );

    case 'tug_of_war':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#CA8A04" />
          <rect x="0" y="88" width="240" height="42" fill="#854D0E" />
          <line x1="120" y1="26" x2="120" y2="112" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="6 6" />
          <line x1="20" y1="68" x2="220" y2="68" stroke="#FEF3C7" strokeWidth="10" strokeLinecap="round" />
          <polygon points="120,76 110,98 130,98" fill="#FACC15" stroke="#0F172A" strokeWidth="3" />
          <circle cx="52" cy="54" r="18" fill="#EF4444" stroke="#0F172A" strokeWidth="4" />
          <circle cx="188" cy="54" r="18" fill="#3B82F6" stroke="#0F172A" strokeWidth="4" />
        </svg>
      );

    case 'hot_potato':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#991B1B" />
          <path d="M120 38 Q134 18 152 24" fill="none" stroke="#FDE047" strokeWidth="5" strokeLinecap="round" />
          <circle cx="155" cy="24" r="7" fill="#FACC15" />
          <circle cx="120" cy="74" r="36" fill="#EA580C" stroke="#0F172A" strokeWidth="5" />
          <circle cx="107" cy="68" r="4" fill="#0F172A" />
          <circle cx="133" cy="68" r="4" fill="#0F172A" />
          <path d="M108 86 Q120 78 132 86" fill="none" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    case 'fastest_finger':
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#BE185D" />
          <rect x="16" y="16" width="96" height="44" rx="10" fill="#EF4444" stroke="#0F172A" strokeWidth="3.5" />
          <rect x="128" y="16" width="96" height="44" rx="10" fill="#3B82F6" stroke="#0F172A" strokeWidth="3.5" />
          <rect x="16" y="70" width="96" height="44" rx="10" fill="#10B981" stroke="#0F172A" strokeWidth="3.5" />
          <rect x="128" y="70" width="96" height="44" rx="10" fill="#FACC15" stroke="#0F172A" strokeWidth="3.5" />
          <polygon points="128,24 102,68 122,68 110,106 144,58 122,58" fill="#FFFFFF" stroke="#0F172A" strokeWidth="4" />
        </svg>
      );

    case 'quick_quiz':
    default:
      return (
        <svg viewBox="0 0 240 130" className={className} aria-hidden="true">
          <rect width="240" height="130" rx="14" fill="#4338CA" />
          <rect x="20" y="20" width="92" height="38" rx="10" fill="#22D3EE" stroke="#0F172A" strokeWidth="3.5" />
          <rect x="128" y="20" width="92" height="38" rx="10" fill="#FACC15" stroke="#0F172A" strokeWidth="3.5" />
          <rect x="20" y="72" width="92" height="38" rx="10" fill="#10B981" stroke="#0F172A" strokeWidth="3.5" />
          <rect x="128" y="72" width="92" height="38" rx="10" fill="#EF4444" stroke="#0F172A" strokeWidth="3.5" />
          <circle cx="120" cy="65" r="26" fill="#FFFFFF" stroke="#0F172A" strokeWidth="4.5" />
          <text
            x="120"
            y="75"
            textAnchor="middle"
            fontSize="30"
            fontWeight="900"
            fill="#4338CA"
            fontFamily="sans-serif"
          >
            ?
          </text>
        </svg>
      );
  }
}
