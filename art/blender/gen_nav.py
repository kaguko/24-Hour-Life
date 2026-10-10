"""Sinh city_nav.json (lưới đi bộ 1m + toạ độ cửa) từ city_layout.json.
Chạy: python art/blender/gen_nav.py  ->  apps/web/public/models/city_nav.json
Toạ độ là không gian three.js (x, z). Ô (i, j) có tâm tại x = -30 + i + 0.5, z = -30 + j + 0.5.
"""
import json, math, random
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
L = json.loads((ROOT / "art/blender/city_layout.json").read_text(encoding="utf-8"))
W = L["world"]; HALF = W // 2
DIR3 = {"+z": (0, 1), "-z": (0, -1), "+x": (1, 0), "-x": (-1, 0)}

def footprint(b):
    ex, ez = (b["w"], b["d"]) if b["door"] in ("+z", "-z") else (b["d"], b["w"])
    return b["cx"], b["cz"], ex, ez

# cùng thuật toán chọn vị trí cây với build_city.py (để lưới né đúng gốc cây)
def tree_points():
    pts = []
    for i in range(12):
        a = math.radians(i * 30 + 15); pts.append((math.cos(a) * 6.4, math.sin(a) * 6.4))
    for b in L["buildings"]:
        dx, dz = DIR3[b["door"]]; depth, lateral = b["d"], b["w"]
        bx, bz = b["cx"] - dx * (depth / 2 + 2.3), b["cz"] - dz * (depth / 2 + 2.3); px, pz = -dz, dx
        for k in (-0.32, 0.32): pts.append((bx + px * lateral * k, bz + pz * lateral * k))
        for k in (-1, 1):
            pts.append((b["cx"] + dx * (depth / 2 + 2.6) + px * k * (lateral / 2 + 1.2), b["cz"] + dz * (depth / 2 + 2.6) + pz * k * (lateral / 2 + 1.2)))
    out = []
    for (x, z) in pts:
        inside = any(abs(x - cx) < ex / 2 + 0.8 and abs(z - cz) < ez / 2 + 0.8 for cx, cz, ex, ez in map(footprint, L["buildings"]))
        if not inside and abs(x) <= HALF - 1 and abs(z) <= HALF - 1: out.append((x, z))
    return out

blocked = [[False] * W for _ in range(W)]
rects = [footprint(b) for b in L["buildings"]]
trees = tree_points()
pr = L["park"]["plaza_radius"]
for j in range(W):
    for i in range(W):
        x, z = -HALF + i + 0.5, -HALF + j + 0.5
        if any(abs(x - cx) < ex / 2 + 0.5 and abs(z - cz) < ez / 2 + 0.5 for cx, cz, ex, ez in rects): blocked[j][i] = True
        elif any(math.hypot(x - tx, z - tz) < 0.7 for tx, tz in trees): blocked[j][i] = True
        elif math.hypot(x - L["park"]["cx"], z - L["park"]["cz"]) < 1.9: blocked[j][i] = True   # chòi nghỉ giữa công viên

# Điểm đứng trước cửa: cách mặt tiền 2.4 m (qua mái hiên/bậc thềm) để nhân vật không bị mái che.
# (Empty door_<id> trong city.glb đánh dấu 1.3 m; client dùng toạ độ trong file nav này.)
DOOR_OFFSET = 2.4
doors = {}
for b in L["buildings"]:
    dx, dz = DIR3[b["door"]]
    doors[b["id"]] = {"x": b["cx"] + dx * (b["d"] / 2 + DOOR_OFFSET), "z": b["cz"] + dz * (b["d"] / 2 + DOOR_OFFSET), "facing": b["door"]}
doors["park"] = {"x": 0.0, "z": 4.5, "facing": "-z"}

def cell(x, z): return int(math.floor(z + HALF)), int(math.floor(x + HALF))
spawn = {"x": doors["home"]["x"], "z": doors["home"]["z"]}
sj, si = cell(spawn["x"], spawn["z"])
seen = {(sj, si)}; q = deque([(sj, si)])
while q:
    j, i = q.popleft()
    for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nj, ni = j + dj, i + di
        if 0 <= nj < W and 0 <= ni < W and not blocked[nj][ni] and (nj, ni) not in seen:
            seen.add((nj, ni)); q.append((nj, ni))
for name, d in doors.items():
    j, i = cell(d["x"], d["z"])
    assert not blocked[j][i], f"cửa {name} nằm trong ô bị chặn"
    assert (j, i) in seen, f"cửa {name} không tới được từ nhà"

nav = {
    "version": 1, "cell": 1, "origin": [-HALF, -HALF], "width": W, "height": W,
    "walk": ["".join("0" if blocked[j][i] else "1" for i in range(W)) for j in range(W)],
    "doors": {k: {"x": round(v["x"], 2), "z": round(v["z"], 2), "facing": v["facing"]} for k, v in doors.items()},
    # LocationId của domain -> cửa
    "locations": {k: k for k in ("home", "office", "school", "cafe", "gym", "park", "market", "bar")},
    "spawn": {"x": round(spawn["x"], 2), "z": round(spawn["z"], 2)},
}
out = ROOT / "apps/web/public/models/city_nav.json"
out.write_text(json.dumps(nav, separators=(",", ":")), encoding="utf-8")
walk = sum(row.count("1") for row in nav["walk"])
print(f"city_nav.json: {out.stat().st_size} bytes, walkable {walk}/{W*W}, reachable {len(seen)}, doors {list(doors)}")
