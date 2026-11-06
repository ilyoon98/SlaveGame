# Simplified swordsman master

- Generator: built-in `image_gen` (not CLI/API fallback).
- Operation: reference-guided edit, `transparent_background: true`.
- Reference: `swordsman-original-comparison.png` (generated in this chat).
- Output: `swordsman-simple-master.png`.
- Date: 2026-11-06, Asia/Seoul.
- Local follow-up: Codixel pixel conversion and comparison board; 2dimg2motion baseline normalization. Neither operation creates character animation.

## Exact generation prompt

Use case: precise-object-edit / stylized-concept.
Create a simplified production reference of the SAME adult male swordsman shown in the provided character comparison board. The user likes this art style but says the character is too complicated and wants a side-scrolling game. Output ONLY ONE isolated complete full-body character with real transparent background. No portrait panel, no frame, no text, no grid. Change the design by a moderate simplification: keep recognizable tousled brown hair, red short scarf-cape, navy blue tunic, simple silver shoulder armor, brown gloves and boots. Remove all pouches, hanging straps, small buckles, armor engravings, layered plate subdivisions, cloth microtexture, chest insignia and decorative gold trim. Use large contiguous color shapes, one plain belt, one simple shoulder plate, about 2-3 flat shadow tones per material, clean dark contours. Keep adult fantasy RPG character charm and appealing expression; not a baby chibi, not photorealistic. Compact approximately four-and-a-half-head proportions suitable for subsequent 48x64 pixel conversion. Strict side view facing RIGHT, horizontal ground plane, both legs distinct, feet on the same baseline, relaxed ready pose. His visible near arm holds a plain single silver sword in front of his body with its tip angled up and right; empty far hand stays near waist, no shield, no scabbard. Sword must be clearly separated from face and torso by transparent space, full blade inside canvas. Short red cape falls behind him to mid thigh and has a very simple silhouette. His silhouette should fit comfortably inside a roughly 3:4 tall rectangle with generous transparent margins, complete boots, no cast shadow or ground. Match color identity of reference, simplify about half the ornamental detail, keep outline and shapes crisp and readable, no glowing effects.

## Review notes

- The design retains the brown hair, red cape, navy tunic and sword. Small pouches, straps and decorative armor pieces were removed.
- The result has a right-facing head and a slightly three-quarter torso, rather than a perfectly orthographic side view. Treat it as a baseline candidate, not a verified animation-ready turnaround.
- A 48×64 pixel preview lost too much facial information. The retained comparison uses a 64×80 canvas, 49×72 subject, 22 used opaque colors from a 24-color palette, and binary alpha.
- Codixel cleanup changed zero pixels. No cleanup improvement is claimed. Edge diagnostics are advisory: the hair, sword tip, clothing corners and gaps require visual judgment.
- No character motion, limb ownership, foot contact, or loop continuity has been validated yet.
