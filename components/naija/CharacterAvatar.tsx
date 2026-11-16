'use client';

import React, { useId } from 'react';
import { CHARACTERS, OUTFITS, PLAYER_COLORS } from '@/lib/naija/catalog';
import { AccessoryId, CharacterId, OutfitId, PlayerColorKey } from '@/lib/naija/types';

export type AvatarMood = 'happy' | 'focused' | 'shocked' | 'victory' | 'defeat';

interface CharacterAvatarProps {
  characterId: CharacterId;
  outfitId: OutfitId;
  accessoryId: AccessoryId;
  colorKey: PlayerColorKey;
  mood?: AvatarMood;
  size?: number;
  className?: string;
}

export function CharacterAvatar({
  characterId,
  outfitId,
  accessoryId,
  colorKey,
  mood = 'happy',
  size = 64,
  className = '',
}: CharacterAvatarProps) {
  const rawId = useId();
  const gradientId = `bg-${rawId.replace(/:/g, '')}`;
  const char = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];
  const outfit = OUTFITS.find((o) => o.id === outfitId) || OUTFITS[0];
  const pColor = PLAYER_COLORS[colorKey] || PLAYER_COLORS.red;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label={`${char.name} avatar`}
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={pColor.hex} />
          <stop offset="100%" stopColor={pColor.darkHex} />
        </radialGradient>
      </defs>

      {/* 3D Cartoon Circular Base */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill={`url(#${gradientId})`}
        stroke="#FFFFFF"
        strokeWidth="4"
      />

      {/* Outfit Shoulders */}
      <path
        d="M19 88 C22 68, 34 64, 50 64 C66 64, 78 68, 81 88 Z"
        fill={outfit.primary}
        stroke="#0F172A"
        strokeWidth="2.5"
      />
      <path d="M38 66 L50 75 L62 66" fill="none" stroke={outfit.trim} strokeWidth="3.5" strokeLinecap="round" />

      {/* Neck */}
      <rect x="43" y="54" width="14" height="14" rx="5" fill={char.skin} />

      {/* Hair Back for buns/afro/braids */}
      {char.hairStyle === 'afro' && (
        <circle cx="50" cy="36" r="26" fill={char.hair} />
      )}
      {char.hairStyle === 'buns' && (
        <>
          <circle cx="29" cy="24" r="9" fill={char.hair} />
          <circle cx="71" cy="24" r="9" fill={char.hair} />
        </>
      )}
      {char.hairStyle === 'braids' && (
        <>
          <rect x="24" y="34" width="8" height="28" rx="4" fill={char.hair} />
          <rect x="68" y="34" width="8" height="28" rx="4" fill={char.hair} />
        </>
      )}

      {/* Ears */}
      <circle cx="28" cy="43" r="5" fill={char.skin} />
      <circle cx="72" cy="43" r="5" fill={char.skin} />

      {/* Head */}
      <rect
        x="30"
        y="22"
        width="40"
        height="40"
        rx="19"
        fill={char.skin}
        stroke="#0F172A"
        strokeWidth="2.2"
      />

      {/* Hair Top */}
      {char.hairStyle === 'fade' && (
        <path d="M31 32 C31 20, 69 20, 69 32 C62 27, 38 27, 31 32 Z" fill={char.hair} />
      )}
      {char.hairStyle === 'twists' && (
        <path d="M29 33 C28 18, 72 18, 71 33 C66 25, 58 29, 50 25 C42 29, 34 25, 29 33 Z" fill={char.hair} />
      )}
      {char.hairStyle === 'cap_hair' && (
        <path d="M30 33 C30 19, 70 19, 70 33 Z" fill={char.hair} />
      )}
      {(char.hairStyle === 'buns' || char.hairStyle === 'braids') && (
        <path d="M30 34 C32 20, 68 20, 70 34 C60 28, 40 28, 30 34 Z" fill={char.hair} />
      )}

      {/* Eyes & Expressions */}
      {mood === 'victory' ? (
        <>
          <path d="M38 41 Q41 37 44 41" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M56 41 Q59 37 62 41" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
        </>
      ) : mood === 'defeat' ? (
        <>
          <path d="M37 38 L44 43 M44 38 L37 43" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M56 38 L63 43 M63 38 L56 43" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" />
        </>
      ) : mood === 'shocked' ? (
        <>
          <circle cx="41" cy="40" r="4.5" fill="#FFFFFF" stroke="#111827" strokeWidth="1.5" />
          <circle cx="59" cy="40" r="4.5" fill="#FFFFFF" stroke="#111827" strokeWidth="1.5" />
          <circle cx="41" cy="40" r="1.8" fill="#111827" />
          <circle cx="59" cy="40" r="1.8" fill="#111827" />
        </>
      ) : (
        <>
          <circle cx="41" cy="40" r="3.4" fill="#111827" />
          <circle cx="59" cy="40" r="3.4" fill="#111827" />
          <circle cx="42" cy="39" r="1.1" fill="#FFFFFF" />
          <circle cx="60" cy="39" r="1.1" fill="#FFFFFF" />
        </>
      )}

      {/* Eyebrows for focused */}
      {mood === 'focused' && (
        <>
          <path d="M36 34 L45 36" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M64 34 L55 36" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}

      {/* Mouth */}
      {mood === 'happy' || mood === 'victory' ? (
        <path d="M41 50 Q50 58 59 50" fill={mood === 'victory' ? '#FFFFFF' : 'none'} stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
      ) : mood === 'shocked' ? (
        <ellipse cx="50" cy="52" rx="4" ry="5" fill="#7F1D1D" stroke="#111827" strokeWidth="1.8" />
      ) : mood === 'defeat' ? (
        <path d="M42 54 Q50 48 58 54" fill="none" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <line x1="44" y1="51" x2="56" y2="51" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" />
      )}

      {/* Accessories */}
      {accessoryId === 'shades' && (
        <g>
          <rect x="33" y="36" width="14" height="9" rx="3" fill="#0F172A" stroke="#FBBF24" strokeWidth="1.5" />
          <rect x="53" y="36" width="14" height="9" rx="3" fill="#0F172A" stroke="#FBBF24" strokeWidth="1.5" />
          <line x1="47" y1="40" x2="53" y2="40" stroke="#FBBF24" strokeWidth="2" />
        </g>
      )}
      {accessoryId === 'cap' && (
        <g>
          <path d="M30 28 C32 14, 68 14, 70 28 Z" fill="#EF4444" stroke="#0F172A" strokeWidth="2" />
          <rect x="24" y="25" width="16" height="5" rx="2.5" fill="#B91C1C" stroke="#0F172A" strokeWidth="1.5" />
        </g>
      )}
      {accessoryId === 'headphones' && (
        <g>
          <path d="M27 40 C27 16, 73 16, 73 40" fill="none" stroke="#38BDF8" strokeWidth="4" />
          <rect x="23" y="35" width="7" height="15" rx="3.5" fill="#0284C7" stroke="#0F172A" strokeWidth="1.5" />
          <rect x="70" y="35" width="7" height="15" rx="3.5" fill="#0284C7" stroke="#0F172A" strokeWidth="1.5" />
        </g>
      )}
      {accessoryId === 'whistle' && (
        <g transform="translate(53, 68)">
          <rect x="0" y="0" width="12" height="7" rx="3" fill="#FDE047" stroke="#0F172A" strokeWidth="1.5" />
        </g>
      )}
      {accessoryId === 'crown' && (
        <path
          d="M34 23 L38 11 L45 18 L50 9 L55 18 L62 11 L66 23 Z"
          fill="#FBBF24"
          stroke="#78350F"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
