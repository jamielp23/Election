#!/usr/bin/env python3
"""
Generate src/data/mapGeo.json from map.svg.

The reference map (map.svg, an Adobe Illustrator export) holds the 36 states as
41 vector paths in layer "Layer_3" and their names as 36 <text> labels in
"Layer_4". Paths have no ids, so each state's name is resolved by which label
falls inside which path (point-in-polygon). The Bras-Panon Islands are drawn as
several island paths whose shared label sits in the inset box.

This script preserves every path's `d` string verbatim (geometry is never
modified) and only computes label anchor points + the coastline outline (the
union of the mainland states) for presentation.

Requires: svgpathtools, shapely.  Run:  python scripts/build_map_geo.py
"""
import json
import re
import xml.etree.ElementTree as ET
from collections import OrderedDict
from pathlib import Path

from shapely.geometry import Point, Polygon
from shapely.ops import unary_union
from svgpathtools import parse_path

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "map.svg"
OUT = ROOT / "src" / "data" / "mapGeo.json"

# SVG label text -> model.json state name (spellings differ in a few places).
NAME_MAP = {
    "MEDINA": "Medina", "QASSINES": "Qassines", "CAMBRIA": "Cambria",
    "CLAYMONT": "Claymont", "IRVING": "Irving", "ROCKWELL": "Rockwell",
    "PONDEREY": "Ponderay", "BRACKLEY": "Brackley", "SOUTHDELTANA": "South Deltana",
    "NORTHDELTANA": "North Deltana", "NORTHAGUIRRE": "North Aguirre",
    "SOUTHAGUIRRE": "South Aguirre", "BRAS-PANONISLANDS": "Bras-Panon Islands",
    "DEALE": "Deale", "ST. JULIAN": "St.Julian", "ESMOUR": "Esmour",
    "VAWDREY": "Vawdrey", "PENHURST": "Penshurst", "THORNTON": "Thornton",
    "ALMORAGE": "Almorange", "WITMIOTA": "Witmiota", "ANTHELLIER": "Antiheller",
    "KERSWELL": "Kerswell", "VANLEER": "Vanleer", "GLADSTONE": "Gladstone",
    "CHAMBERLAIN": "Chamberlain", "FAIRDOVER": "Fairdover", "BREMOND": "Bremond",
    "WYNHURST": "Wynhurst", "EIELSON": "Eielson", "STANHOPE": "Stanhope",
    "STRETTON": "Stretton", "RUNSWICK": "Runswick", "WENTWORTH": "Wentworth",
    "DUNHAM": "Dunham", "PLYHOLM": "Plyholm",
}


def tagname(e):
    return e.tag.split("}")[-1]


def text_content(t):
    parts = [t.text or ""] + [(s.text or "") + (s.tail or "") for s in t.iter() if s is not t]
    return "".join(parts).strip()


def translate(tr):
    m = re.search(r"translate\(([-\d.]+)[ ,]+([-\d.]+)\)", tr or "")
    return (float(m.group(1)), float(m.group(2))) if m else None


def poly_of(d):
    p = parse_path(d)
    n = max(80, int(p.length() / 5))
    pts = [(p.point(i / n).real, p.point(i / n).imag) for i in range(n + 1)]
    g = Polygon(pts)
    return g.buffer(0) if not g.is_valid else g


def ring_to_path(coords):
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in coords) + "Z"


def geom_to_path(geom):
    polys = geom.geoms if geom.geom_type == "MultiPolygon" else [geom]
    return "".join(ring_to_path(list(pg.exterior.coords)) for pg in polys)


def main():
    root = ET.parse(SVG).getroot()
    vb = root.get("viewBox")
    layers = {c.get("id"): c for c in root if tagname(c) == "g"}

    labels = [
        (text_content(t), translate(t.get("transform")))
        for t in layers["Layer_4"] if tagname(t) == "text"
    ]
    raw = [(p.get("d"), poly_of(p.get("d"))) for p in layers["Layer_3"] if tagname(p) == "path"]

    # Assign each path to a label by containment; unassigned paths are islands.
    path_label = [None] * len(raw)
    for name, pt in labels:
        for i, (_d, poly) in enumerate(raw):
            if poly.contains(Point(pt)) or poly.contains(Point(pt[0], pt[1] - 6)):
                path_label[i] = name
    for i, n in enumerate(path_label):
        if n is None:
            path_label[i] = "BRAS-PANONISLANDS"

    groups = OrderedDict()
    for i, (d, poly) in enumerate(raw):
        dn = NAME_MAP[path_label[i]]
        groups.setdefault(dn, {"paths": [], "polys": []})
        groups[dn]["paths"].append(d)
        groups[dn]["polys"].append(poly)

    data_names = [s["name"] for s in json.load(open(ROOT / "src/data/model.json"))["states"]]
    missing = set(data_names) - set(groups)
    extra = set(groups) - set(data_names)
    assert not missing and not extra, f"missing={missing} extra={extra}"

    labelpos = {NAME_MAP[n]: p for n, p in labels}
    states, mainland = [], []
    for dn, g in groups.items():
        union = unary_union(g["polys"])
        rp = union.representative_point()
        minx, miny, maxx, maxy = union.bounds
        island = dn == "Bras-Panon Islands"
        lx, ly = labelpos[dn] if island else (rp.x, rp.y)
        states.append({
            "name": dn, "paths": g["paths"],
            "labelX": round(lx, 1), "labelY": round(ly, 1),
            "bbox": [round(minx, 1), round(miny, 1), round(maxx, 1), round(maxy, 1)],
            "inset": island,
        })
        if not island:
            mainland.append(union)

    isl = next(s for s in states if s["inset"])
    b, pad = isl["bbox"], 18
    inset = {"x": round(b[0] - pad, 1), "y": round(b[1] - pad, 1),
             "w": round(b[2] - b[0] + 2 * pad, 1), "h": round(b[3] - b[1] + 2 * pad + 22, 1)}

    w, h = (float(x) for x in vb.split()[2:])
    out = {"viewBox": vb, "width": w, "height": h,
           "outline": geom_to_path(unary_union(mainland)), "inset": inset, "states": states}
    OUT.write_text(json.dumps(out))
    print(f"wrote {OUT.relative_to(ROOT)}: {len(states)} states, "
          f"{sum(len(s['paths']) for s in states)} paths preserved")


if __name__ == "__main__":
    main()
