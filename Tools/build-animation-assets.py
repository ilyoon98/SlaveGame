"""Normalize model-generated animation cells without inventing or warping poses.

All scaling and registration are explicit in the source manifest. A sheet uses
one scale; optional translations are recorded and never change pose geometry.
The final game atlas is emitted by build-animation-assets.cjs using Codixel.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
KEYS = [2, 5, 8, 11]
INBETWEENS = [1, 3, 4, 6, 7, 9, 10, 12]


def rel(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def source_path(value: str) -> Path:
    p = Path(value)
    return p if p.is_absolute() else ROOT / p


def bbox(image: Image.Image):
    return image.getchannel("A").getbbox()


def inspect_sheet(file: Path, columns: int, rows: int) -> dict:
    image = Image.open(file).convert("RGBA")
    result = {"file": rel(file), "size": image.size, "cells": []}
    for i in range(columns * rows):
        x0 = round(i % columns * image.width / columns)
        y0 = round(i // columns * image.height / rows)
        x1 = round((i % columns + 1) * image.width / columns)
        y1 = round((i // columns + 1) * image.height / rows)
        cell = image.crop((x0, y0, x1, y1))
        b = bbox(cell)
        result["cells"].append({"cell": i, "rect": [x0, y0, x1-x0, y1-y0], "bbox": b,
            "edgeTouch": b is not None and (b[0] == 0 or b[1] == 0 or b[2] == cell.width or b[3] == cell.height)})
    return result


def sheet_contact(images: list[Image.Image], labels: list[str], output: Path, scale=0.5):
    w, h = images[0].size
    dw, dh = round(w * scale), round(h * scale)
    cols, gap, label_h = 4, 12, 22
    canvas = Image.new("RGB", (cols * (dw + gap) + gap, ((len(images)+cols-1)//cols)*(dh+label_h+gap)+gap), "#e7e5df")
    draw = ImageDraw.Draw(canvas)
    for i, image in enumerate(images):
        x, y = gap + (i % cols)*(dw+gap), gap + (i // cols)*(dh+label_h+gap)
        draw.text((x, y+3), labels[i], fill="#242a30")
        tile = Image.new("RGBA", image.size, "white")
        tile.alpha_composite(image)
        canvas.paste(tile.convert("RGB").resize((dw, dh), Image.Resampling.NEAREST), (x, y+label_h))
    canvas.save(output)


def gif_preview(images: list[Image.Image], durations: list[int], output: Path):
    frames = []
    for image in images:
        bg = Image.new("RGBA", image.size, "white")
        bg.alpha_composite(image)
        frames.append(bg.convert("RGB"))
    # GIF timing has10ms precision. Round cumulative boundaries so55ms frames
    # alternate60/50ms instead of changing a770ms attack to700ms or840ms.
    elapsed, last_tick, delays = 0, 0, []
    for duration in durations:
        elapsed += duration
        tick = int(elapsed / 10 + 0.5)
        delays.append((tick-last_tick)*10)
        last_tick = tick
    frames[0].save(output, save_all=True, append_images=frames[1:], duration=delays, loop=0, disposal=2, optimize=False)


def normalize(manifest_path: Path):
    spec = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    canonical = spec.get("canonical", {"width":640,"height":560,"pivot":[320,500]})
    size = (canonical["width"], canonical["height"])
    pivot = canonical["pivot"]
    out_root = source_path(spec.get("normalizedOutput", "Art/AnimationWork/normalized"))
    out_root.mkdir(parents=True, exist_ok=True)
    base_path = source_path(spec["baseline"]["file"])
    base = Image.open(base_path).convert("RGBA")
    base_anchor = spec["baseline"]["anchor"]
    baseline = Image.new("RGBA", size)
    baseline.alpha_composite(base, (round(pivot[0]-base_anchor[0]), round(pivot[1]-base_anchor[1])))
    baseline.save(out_root / "baseline.png")
    if bbox(baseline) is None:
        raise ValueError("Empty baseline")
    report = {"kind":"generated-animation-normalization", "sourceManifest":rel(manifest_path),
        "canonical":canonical, "baseline":{"file":rel(base_path),"anchor":base_anchor,"scale":1,
        "bbox":bbox(baseline)}, "actions":{}, "artworkMethod":"Whole-character image_gen frames; local split, registration and packing only.",
        "registrationPolicy":spec.get("registrationPolicy", "Explicit shared scale and anchor per sheet; vertical ground registration only.")}
    for action, action_spec in spec["actions"].items():
        frames: dict[int, Image.Image] = {0: baseline.copy(), 13: baseline.copy()}
        sources = {0:{"source":rel(base_path),"kind":"exact translated baseline"},13:{"source":"frame00","kind":"exact copy"}}
        for sheet in action_spec["sheets"]:
            p = source_path(sheet["file"])
            image = Image.open(p).convert("RGBA")
            alpha_floor = int(sheet.get("alphaFloor", 0))
            if alpha_floor:
                image.putalpha(image.getchannel("A").point(lambda value: 0 if value < alpha_floor else value))
            cols, rows = sheet["columns"], sheet["rows"]
            if len(sheet["indices"]) != cols*rows:
                raise ValueError(f"{p}: indices do not match grid")
            scale = float(sheet.get("scale", 1))
            anchor = sheet["anchor"]
            offsets = sheet.get("offsets", {})
            for i, frame_index in enumerate(sheet["indices"]):
                if frame_index in frames:
                    raise ValueError(f"Duplicate frame {action}:{frame_index}")
                x0,y0 = round(i%cols*image.width/cols), round(i//cols*image.height/rows)
                x1,y1 = round((i%cols+1)*image.width/cols), round((i//cols+1)*image.height/rows)
                cell = image.crop((x0,y0,x1,y1))
                b = bbox(cell)
                if b is None:
                    raise ValueError(f"{p} cell {i} is empty")
                if b[0] == 0 or b[1] == 0 or b[2] == cell.width or b[3] == cell.height:
                    raise ValueError(f"{p} cell {i} touches cell edge: {b}; inspect source/gutters")
                if scale != 1:
                    cell = cell.resize((round(cell.width*scale), round(cell.height*scale)),Image.Resampling.LANCZOS)
                offset = offsets.get(str(frame_index), [0,0])
                origin = [round(pivot[0]-anchor[0]*scale+offset[0]), round(pivot[1]-anchor[1]*scale+offset[1])]
                result = Image.new("RGBA",size)
                result.alpha_composite(cell, tuple(origin))
                out_bbox = bbox(result)
                if out_bbox is None or out_bbox[0] == 0 or out_bbox[1] == 0 or out_bbox[2] == size[0] or out_bbox[3] == size[1]:
                    raise ValueError(f"{action}:{frame_index} output clipped {out_bbox}")
                ground_shift = 0
                if sheet.get("registerGround", True):
                    ground_shift = int(pivot[1] - out_bbox[3])
                    shifted = Image.new("RGBA",size)
                    shifted.alpha_composite(result,(0,ground_shift))
                    result = shifted
                    out_bbox = bbox(result)
                frames[frame_index] = result
                sources[frame_index] = {"file":rel(p),"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"cell":i,
                    "rect":[x0,y0,x1-x0,y1-y0],"sourceBBox":b,"sharedScale":scale,"sourceAnchor":anchor,"alphaFloor":alpha_floor,
                    "explicitOffset":offset,"origin":origin,"groundRegistrationY":ground_shift,"outputBBox":out_bbox,
                    "registrationNote":sheet.get("registrationNote", "Shared sheet registration; no per-frame resize or horizontal fitting.")}
        expected = [0,2,5,8,11,13] if spec.get("allowKeyposesOnly") else list(range(14))
        if sorted(frames) != expected:
            raise ValueError(f"{action}: missing frames {set(range(14))-set(frames)}")
        action_out=out_root/action
        full=action_out/"fullframe"
        key=action_out/"keyframe"
        full.mkdir(parents=True,exist_ok=True)
        key.mkdir(parents=True,exist_ok=True)
        prefix=f"swordsman-{action}"
        for i in sorted(frames):
            frames[i].save(full/f"{prefix}_{i:02d}.png")
            if i in KEYS:
                frames[i].save(key/f"{prefix}_{i:02d}.png")
        # Preserve byte equality even if a future PNG encoder writes variable metadata.
        (full/f"{prefix}_13.png").write_bytes((full/f"{prefix}_00.png").read_bytes())
        ordered=[frames[i] for i in sorted(frames)]
        indices=sorted(frames)
        durations=[action_spec["duration"]*((indices[k+1] if k+1<len(indices) else 14)-i) for k,i in enumerate(indices)]
        gif_preview(ordered,durations,action_out/"preview.gif")
        sheet_contact(ordered,[f"{action} {i:02d}" for i in sorted(frames)],action_out/"contact-sheet.png")
        report["actions"][action]={"frameCount":len(frames),"stage":"keyposes-only" if spec.get("allowKeyposesOnly") else "complete-14-frames","keyframeIndices":KEYS,"anchorIndices":[0,2,5,8,11,13],
            "segmentInsertions":[1,2,2,2,1],"duration":action_spec["duration"],"loop":action_spec.get("loop",True),
            "hitTime":action_spec.get("hitTime"),"previewBackground":"#FFFFFF","coordinateSpace":"screen-space",
            "activeLimb":"screen-right sword arm","activeShoulder":"original sword-arm shoulder",
            "anchorLimb":"screen-left empty arm","weaponHand":"screen-right hand from the baseline",
            "frames":sources,"bottomRange":[min(bbox(f)[3] for f in ordered),max(bbox(f)[3] for f in ordered)]}
        (action_out/"manifest.json").write_text(json.dumps(report["actions"][action],ensure_ascii=False,indent=2),encoding="utf-8")
    report_path=out_root/"normalization-report.json"
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    subprocess.run(["node",str(ROOT/"Tools/build-animation-assets.cjs"),str(out_root),str(manifest_path)],check=True,cwd=ROOT)
    print(json.dumps({"normalized":rel(out_root),"report":rel(report_path)},ensure_ascii=False))


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("manifest",nargs="?",default="Art/AnimationWork/sources.json")
    parser.add_argument("--inspect")
    parser.add_argument("--columns",type=int,default=2)
    parser.add_argument("--rows",type=int,default=2)
    args=parser.parse_args()
    if args.inspect:
        print(json.dumps(inspect_sheet(source_path(args.inspect),args.columns,args.rows),indent=2))
    else:
        normalize(source_path(args.manifest))
