# Lớp chi tiết cho thành phố multiplayer (Blender 4.2, chạy qua blender MCP: execute_blender_code).
# Sinh: city_details (đồ đạc phố/công viên), building_<id>__roof (chi tiết mái, mờ cùng toà nhà), city_backdrop (nền xa),
# + bản sao các prop Kenney (đèn giao thông, máy bán hàng, thùng rác lớn...). Không đụng vào city.glb.
# Tiền đề: đã import vào scene các GLB Kenney: traffic-light, road-sign-stop, construction-cone, construction-barrier, dumpster,
# vending-machine, claw-machine, arcade-machine (xem README). Toạ độ layout là không gian three.js (x, z); Blender: x = x, y = -z.
# In ra JSON vật cản (x, z, r) để gen_nav.py chặn ô đi bộ (art/blender/city_details_obstacles.json).
import bpy, bmesh, math, random, json
from mathutils import Matrix, Vector

B = [
  dict(id="school", cx=-20, cz=-20, w=14, d=11, h=6.0, door="+z", roof="flat", style="tower"),
  dict(id="office", cx=0, cz=-20, w=12, d=10, h=10.0, door="+z", roof="flat", style="office"),
  dict(id="cafe", cx=20, cz=-20, w=11, d=9, h=4.5, door="+z", roof="flat", style="cafe"),
  dict(id="market", cx=-20, cz=0, w=14, d=10, h=4.5, door="+x", roof="gable", style="market"),
  dict(id="gym", cx=20, cz=0, w=13, d=10, h=5.0, door="-x", roof="flat", style="gym"),
  dict(id="home", cx=-20, cz=20, w=12, d=10, h=6.0, door="-z", roof="gable", style="home"),
  dict(id="bar", cx=0, cz=20, w=12, d=10, h=5.0, door="-z", roof="flat", style="bar"),
  dict(id="arcade", cx=20, cz=20, w=12, d=10, h=5.5, door="-z", roof="flat", style="arcade"),
]
HALF = 30
DIR3 = {"+z": (0, 1), "-z": (0, -1), "+x": (1, 0), "-x": (-1, 0)}
ROT = {"-z": 0.0, "+z": math.pi, "+x": -math.pi / 2, "-x": math.pi / 2}
rng = random.Random(77)

# ---------- dọn lần chạy trước ----------
for ob in list(bpy.data.objects):
    if ob.name.startswith(("city_details", "city_backdrop", "building_", "kc_")) or ob.get("cd_gen"):
        bpy.data.objects.remove(ob, do_unlink=True)
for me in list(bpy.data.meshes):
    if me.users == 0:
        bpy.data.meshes.remove(me)

# ---------- vật liệu ----------
def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hex_rgba(h):
    return (srgb_to_lin(int(h[0:2], 16)), srgb_to_lin(int(h[2:4], 16)), srgb_to_lin(int(h[4:6], 16)), 1.0)
def ensure_mat(name, hx, emit=None, strength=0.0, rough=0.9):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hex_rgba(hx); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = 0.0
    if emit:
        b.inputs["Emission Color"].default_value = hex_rgba(emit); b.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = hex_rgba(hx)
    return m
PAL = ["F2994A", "5B9BD5", "8E6FD1", "F4D35E", "EF7BA1", "6BBF7A", "F6EBD9", "B98558", "D1604D", "4FB3A9", "4A5568", "BFE3F2"]
for i, hx in enumerate(PAL):
    if "pal_%02d" % (i + 1) not in bpy.data.materials:
        ensure_mat("pal_%02d" % (i + 1), hx)
ensure_mat("mat_leaf", "62B06D"); ensure_mat("mat_grass2", "A5D6A0"); ensure_mat("mat_water", "5BB8E0", rough=0.3)
ensure_mat("mat_sand", "E8D3A3"); ensure_mat("mat_white", "F5F3EC"); ensure_mat("mat_dark", "2D3340"); ensure_mat("mat_stone", "9AA3AE")
ensure_mat("mat_asphalt", "3B4150"); ensure_mat("mat_leaf2", "4E9A5B")
ensure_mat("mat_lamp", "FFF1C2", emit="FFD27A", strength=1.0)
ensure_mat("mat_neon", "FF8FB8", emit="FF4F9A", strength=1.0)
ensure_mat("mat_window", "F6EBD9", emit="FFD98A", strength=0.2)
MATS = ["pal_%02d" % i for i in range(1, 13)] + ["mat_leaf", "mat_leaf2", "mat_grass2", "mat_water", "mat_sand", "mat_white", "mat_dark",
        "mat_stone", "mat_asphalt", "mat_lamp", "mat_neon", "mat_window"]
IDX = {n: i for i, n in enumerate(MATS)}

# ---------- primitive (bmesh), mọi hàm nhận tên vật liệu ----------
def _tag(verts, mat):
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = IDX[mat]
def add_box(bm, sx, sy, sz, cx, cy, cz, mat, rot=0.0):
    vs = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    c, s = math.cos(rot), math.sin(rot)
    for v in vs:
        x, y, z = v.co.x * sx, v.co.y * sy, v.co.z * sz
        v.co = Vector((x * c - y * s + cx, x * s + y * c + cy, z + cz))
    _tag(vs, mat)
def add_cyl(bm, r1, r2, depth, cx, cy, cz, mat, segs=8, axis="z"):
    vs = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r1, radius2=r2, depth=depth)["verts"]
    for v in vs:
        x, y, z = v.co.x, v.co.y, v.co.z
        if axis == "y": x, y, z = x, -z, y
        elif axis == "x": x, y, z = z, y, -x
        v.co = Vector((x + cx, y + cy, z + cz))
    _tag(vs, mat)
def add_ico(bm, r, cx, cy, cz, mat, sz=1.0, sub=1):
    vs = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)["verts"]
    for v in vs:
        v.co = Vector((v.co.x + cx, v.co.y + cy, v.co.z * sz + cz))
    _tag(vs, mat)
def add_text(bm, text, size, cx, cy, cz, mat):
    cu = bpy.data.curves.new("tmp_txt", "FONT")
    cu.body = text; cu.size = size; cu.extrude = 0.04; cu.align_x = "CENTER"; cu.align_y = "CENTER"
    ob = bpy.data.objects.new("tmp_txt", cu); bpy.context.collection.objects.link(ob)
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    v0 = len(bm.verts); f0 = len(bm.faces)
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    for v in bm.verts[v0:]:
        x, y, z = v.co.x, v.co.y, v.co.z
        v.co = Vector((-x + cx, z + cy, y + cz))
    for f in bm.faces[f0:]:
        f.material_index = IDX[mat]
    bpy.data.objects.remove(ob); bpy.data.curves.remove(cu); bpy.data.meshes.remove(me)

def face(dx, dz):
    """Góc quay Z để +y cục bộ của prop hướng theo (dx, dz) trong không gian three."""
    return math.atan2(-dx, -dz)
def FR(b, u, t):
    """Khung toà nhà: u dọc mặt tiền, t = khoảng cách ra phía trước từ mặt tiền (âm = phía sau). Trả về (x, z) three."""
    dx, dz = DIR3[b["door"]]; px, pz = -dz, dx
    return b["cx"] + dx * (b["d"] / 2 + t) + px * u, b["cz"] + dz * (b["d"] / 2 + t) + pz * u
def polar(deg, r):
    a = math.radians(deg); return math.cos(a) * r, math.sin(a) * r

# ---------- kiểm tra chỗ trống (đồng bộ với gen_nav.py) ----------
def footprint(b):
    ex, ez = (b["w"], b["d"]) if b["door"] in ("+z", "-z") else (b["d"], b["w"])
    return b["cx"], b["cz"], ex, ez
def tree_points():
    pts = []
    for i in range(12):
        a = math.radians(i * 30 + 15); pts.append((math.cos(a) * 6.4, math.sin(a) * 6.4))
    for b in B:
        dx, dz = DIR3[b["door"]]; depth, lateral = b["d"], b["w"]
        bx, bz = b["cx"] - dx * (depth / 2 + 2.3), b["cz"] - dz * (depth / 2 + 2.3); px, pz = -dz, dx
        for k in (-0.32, 0.32): pts.append((bx + px * lateral * k, bz + pz * lateral * k))
        for k in (-1, 1):
            pts.append((b["cx"] + dx * (depth / 2 + 2.6) + px * k * (lateral / 2 + 1.2), b["cz"] + dz * (depth / 2 + 2.6) + pz * k * (lateral / 2 + 1.2)))
    out = []
    for (x, z) in pts:
        inside = any(abs(x - cx) < ex / 2 + 0.8 and abs(z - cz) < ez / 2 + 0.8 for cx, cz, ex, ez in map(footprint, B))
        if not inside and abs(x) <= HALF - 1 and abs(z) <= HALF - 1: out.append((x, z))
    return out
TREES = tree_points()
OBS = []      # vật cản cứng (x, z, r): xuất ra JSON cho nav
SOFT = [(sx * 3.46, sz * 3.46, 0.7) for sx in (-1, 1) for sz in (-1, 1)]   # ghế quanh quảng trường có sẵn
skipped = []
WHY = [""]
def free(x, z, r):
    if abs(x) > HALF - 0.9 or abs(z) > HALF - 0.9: WHY[0] = "edge"; return False
    for b in B:
        cx, cz, ex, ez = footprint(b)
        if abs(x - cx) < ex / 2 + r + 0.05 and abs(z - cz) < ez / 2 + r + 0.05: WHY[0] = "bld:" + b["id"]; return False
        dx, dz = DIR3[b["door"]]
        t = (x - cx) * dx + (z - cz) * dz - b["d"] / 2; u = (x - cx) * (-dz) + (z - cz) * dx
        if abs(u) < 2.4 + r * 0.6 and -0.6 < t < 4.2 + r * 0.6: WHY[0] = "door:" + b["id"]; return False      # vùng trống trước cửa
    for tx, tz in TREES:
        if math.hypot(x - tx, z - tz) < r + 0.45: WHY[0] = "tree"; return False
    for ox, oz, orad in OBS + SOFT:
        if math.hypot(x - ox, z - oz) < r + orad: WHY[0] = "obs@%.1f,%.1f" % (ox, oz); return False
    if abs(x) < 8 and abs(z) < 8:                                           # công viên: chừa lối đi chữ thập, quảng trường
        if abs(x) < 1.3 + r * 0.4 or abs(z) < 1.3 + r * 0.4: WHY[0] = "path"; return False
        if math.hypot(x, z) < 3.5 + r * 0.55: WHY[0] = "plaza"; return False
        if math.hypot(x, z - 4.5) < 0.9 + r * 0.6: WHY[0] = "parkdoor"; return False
    return True

def new_bm(): return bmesh.new()
def merge(tgt, t, matrix=None):
    """Gộp bmesh tạm t vào tgt (tuỳ chọn biến đổi trước), rồi giải phóng t."""
    if matrix is not None: bmesh.ops.transform(t, matrix=matrix, verts=t.verts)
    me = bpy.data.meshes.new("tmp"); t.to_mesh(me); t.free(); tgt.from_mesh(me); bpy.data.meshes.remove(me)
def place(tgt, fn, x, z, rot=0.0, *a, y0=0.0, **k):
    sc = k.pop("sc", 1.0)
    t = bmesh.new(); fn(t, *a, **k)
    merge(tgt, t, Matrix.Translation((x, -z, y0)) @ Matrix.Rotation(rot, 4, "Z") @ Matrix.Scale(sc, 4))
def put(fn, x, z, rot=0.0, r=0.5, *a, solid=True, force=False, **k):
    if not force and not free(x, z, r):
        skipped.append((fn.__name__, round(x, 1), round(z, 1), WHY[0])); return False
    place(D, fn, x, z, rot, *a, **k)
    if solid: OBS.append((round(x, 2), round(z, 2), r))
    return True

# ---------- prop tự dựng (gốc ở chân, mặt trước +y) ----------
def bench(bm, mat="pal_08"):
    add_box(bm, 1.6, 0.46, 0.1, 0, 0, 0.5, mat); add_box(bm, 1.6, 0.08, 0.46, 0, -0.22, 0.78, mat)
    for sx in (-0.68, 0.68): add_box(bm, 0.1, 0.4, 0.5, sx, 0, 0.25, "pal_11")
def bin_(bm, mat="pal_10"):
    add_cyl(bm, 0.26, 0.22, 0.75, 0, 0, 0.375, mat, 8); add_cyl(bm, 0.29, 0.29, 0.07, 0, 0, 0.78, "pal_11", 8)
def planter(bm, flowers=("pal_05", "pal_04", "pal_01")):
    add_box(bm, 1.3, 0.55, 0.45, 0, 0, 0.225, "pal_08"); add_box(bm, 1.14, 0.4, 0.06, 0, 0, 0.46, "pal_07")
    add_box(bm, 1.14, 0.4, 0.1, 0, 0, 0.45, "pal_11")
    for i in range(6):
        add_ico(bm, 0.2, -0.5 + i * 0.2, 0.08 * ((-1) ** i), 0.62, "mat_leaf", 0.9)
        add_ico(bm, 0.09, -0.5 + i * 0.2, 0.08 * ((-1) ** i), 0.82, flowers[i % len(flowers)], 1.0, 1)
def bike_rack(bm):
    for i in range(4):
        add_box(bm, 0.07, 0.07, 0.6, -0.6 + i * 0.4, 0, 0.4, "pal_11")
        add_box(bm, 0.07, 0.07, 0.07, -0.6 + i * 0.4, 0, 0.72, "pal_11")
    add_box(bm, 1.5, 0.07, 0.07, 0, 0, 0.1, "pal_11")
def bike(bm, mat="pal_09"):
    for sy in (-0.42, 0.42): add_cyl(bm, 0.3, 0.3, 0.05, 0, sy, 0.3, "mat_dark", 10, axis="x")
    add_box(bm, 0.05, 0.9, 0.05, 0, 0, 0.55, mat, 0.0); add_box(bm, 0.05, 0.05, 0.4, 0, 0.35, 0.5, mat); add_box(bm, 0.4, 0.05, 0.05, 0, 0.42, 0.78, "pal_11")
    add_box(bm, 0.16, 0.3, 0.05, 0, -0.3, 0.78, "pal_11")
def hydrant(bm):
    add_cyl(bm, 0.17, 0.2, 0.55, 0, 0, 0.275, "pal_09", 8); add_cyl(bm, 0.2, 0.0, 0.18, 0, 0, 0.64, "pal_09", 8)
    add_box(bm, 0.5, 0.12, 0.12, 0, 0, 0.4, "pal_09")
def mailbox(bm, mat="pal_02"):
    add_box(bm, 0.1, 0.1, 0.9, 0, 0, 0.45, "pal_08"); add_box(bm, 0.45, 0.3, 0.26, 0, 0, 1.0, mat)
    add_cyl(bm, 0.13, 0.13, 0.3, 0, 0, 1.13, mat, 8, axis="y"); add_box(bm, 0.04, 0.04, 0.2, 0.24, 0, 1.08, "pal_09")
def flagpole(bm, mat="pal_09"):
    add_cyl(bm, 0.1, 0.12, 0.3, 0, 0, 0.15, "pal_11", 8); add_cyl(bm, 0.045, 0.06, 6.0, 0, 0, 3.0, "pal_07", 6)
    add_ico(bm, 0.1, 0, 0, 6.05, "pal_04", 1, 1)
    add_box(bm, 1.1, 0.04, 0.7, 0.62, 0, 5.55, mat); add_box(bm, 0.5, 0.045, 0.7, 0.3, 0, 5.55, "pal_02")
def street_sign(bm, text="MAIN ST", col="pal_06"):
    add_cyl(bm, 0.045, 0.045, 3.0, 0, 0, 1.5, "pal_11", 6)
    add_box(bm, 1.9, 0.06, 0.42, 0, 0, 3.0, col)
    add_text(bm, text, 0.26, 0, 0.05, 3.0, "pal_07")
def pond(bm):
    add_cyl(bm, 1.25, 1.25, 0.08, 0, 0, 0.05, "mat_water", 16)
    for i in range(10):
        a = i * math.tau / 10 + 0.2; s = 0.18 + 0.1 * ((i * 7) % 3) / 3
        add_ico(bm, s, math.cos(a) * 1.35, math.sin(a) * 1.35, 0.1, "mat_stone", 0.7, 1)
    for (x, y) in ((0.4, 0.3), (-0.5, -0.2), (0.0, -0.6)):
        add_cyl(bm, 0.22, 0.22, 0.03, x, y, 0.1, "pal_06", 8)
    add_ico(bm, 0.08, 0.4, 0.3, 0.14, "pal_05", 1, 1)
    for (x, y) in ((1.0, 0.7), (1.15, 0.4), (0.9, 0.9)):
        add_cyl(bm, 0.025, 0.025, 0.7, x, y, 0.4, "pal_06", 5); add_cyl(bm, 0.05, 0.05, 0.2, x, y, 0.8, "pal_08", 5)
def flowerbed(bm, cols=("pal_05", "pal_04", "pal_01")):
    add_cyl(bm, 1.0, 1.0, 0.15, 0, 0, 0.075, "pal_08", 12); add_cyl(bm, 0.88, 0.88, 0.04, 0, 0, 0.16, "pal_09", 12)
    for i in range(18):
        a = i * 2.4; r = 0.15 + 0.7 * ((i * 13) % 7) / 7
        add_ico(bm, 0.17, math.cos(a) * r, math.sin(a) * r, 0.32, "mat_leaf", 0.8, 1)
        add_ico(bm, 0.1, math.cos(a) * r, math.sin(a) * r, 0.5, cols[i % len(cols)], 1, 1)
def swing(bm):
    for sx in (-1.1, 1.1):
        add_box(bm, 0.08, 0.08, 2.0, sx, -0.5, 1.0, "pal_01", 0.0); add_box(bm, 0.08, 0.08, 2.0, sx, 0.5, 1.0, "pal_01", 0.0)
    add_box(bm, 2.4, 0.1, 0.1, 0, 0, 2.0, "pal_01")
    for sx in (-0.5, 0.5):
        add_box(bm, 0.03, 0.03, 1.4, sx - 0.2, 0, 1.3, "pal_11"); add_box(bm, 0.03, 0.03, 1.4, sx + 0.2, 0, 1.3, "pal_11")
        add_box(bm, 0.5, 0.22, 0.05, sx, 0, 0.55, "pal_02")
def slide(bm):
    for sx in (-0.4, 0.4): add_box(bm, 0.07, 0.07, 1.5, sx, -0.6, 0.75, "pal_10"); add_box(bm, 0.05, 1.6, 0.05, sx, 0.4, 0.8, "pal_10", 0.0)
    add_box(bm, 1.0, 0.8, 0.07, 0, -0.6, 1.5, "pal_04")
    # mặt trượt: hộp nghiêng
    t = bmesh.new(); add_box(t, 0.8, 2.0, 0.06, 0, 0, 0, "pal_05")
    merge(bm, t, Matrix.Translation((0, 0.55, 0.8)) @ Matrix.Rotation(math.radians(-27), 4, "X"))
def sandbox(bm):
    add_box(bm, 1.6, 1.6, 0.18, 0, 0, 0.09, "pal_08"); add_box(bm, 1.4, 1.4, 0.2, 0, 0, 0.1, "mat_sand")
    add_cyl(bm, 0.18, 0.12, 0.2, 0.3, 0.2, 0.3, "pal_02", 6); add_cyl(bm, 0.1, 0.1, 0.1, -0.35, -0.25, 0.25, "pal_09", 6)
def picnic(bm, umb="pal_09"):
    add_box(bm, 1.7, 0.8, 0.08, 0, 0, 0.78, "pal_08")
    for sy in (-0.7, 0.7): add_box(bm, 1.7, 0.3, 0.07, 0, sy, 0.48, "pal_08")
    for sx in (-0.65, 0.65): add_box(bm, 0.08, 1.8, 0.4, sx, 0, 0.4, "pal_08", 0.0)
    add_cyl(bm, 0.04, 0.04, 2.0, 0, 0, 1.8, "pal_07", 6); add_cyl(bm, 1.3, 0.0, 0.55, 0, 0, 2.7, umb, 8)
def food_cart(bm):
    add_box(bm, 1.5, 0.9, 0.7, 0, 0, 0.75, "pal_04"); add_box(bm, 1.6, 1.0, 0.08, 0, 0, 1.12, "pal_07")
    add_box(bm, 1.2, 0.3, 0.45, 0, 0.5, 0.95, "pal_12")
    for sx in (-0.6, 0.6): add_cyl(bm, 0.28, 0.28, 0.07, sx, -0.5, 0.3, "mat_dark", 10, axis="y")
    add_box(bm, 0.8, 0.05, 0.05, 0, 0.7, 0.35, "pal_11")
    add_cyl(bm, 0.04, 0.04, 1.6, 0.6, -0.3, 1.9, "pal_07", 6); add_cyl(bm, 1.1, 0.0, 0.45, 0.6, -0.3, 2.85, "pal_05", 8)
    add_text(bm, "SNACK", 0.2, 0, 0.47, 1.35, "pal_09")
def cafe_set(bm, umb="pal_05"):
    add_cyl(bm, 0.045, 0.045, 0.72, 0, 0, 0.36, "pal_11", 6); add_cyl(bm, 0.45, 0.45, 0.05, 0, 0, 0.74, "pal_07", 12)
    for a in (0.6, 3.4):
        cx, cy = math.cos(a) * 0.75, math.sin(a) * 0.75
        add_box(bm, 0.36, 0.36, 0.05, cx, cy, 0.46, "pal_08"); add_box(bm, 0.36, 0.06, 0.4, cx + 0.0, cy + 0.15, 0.7, "pal_08")
        for dx in (-0.12, 0.12): add_box(bm, 0.05, 0.05, 0.44, cx + dx, cy, 0.22, "pal_11")
    add_cyl(bm, 0.03, 0.03, 2.0, 0, 0, 1.4, "pal_07", 6); add_cyl(bm, 1.25, 0.0, 0.5, 0, 0, 2.25, umb, 8)
def crates(bm):
    for (x, y, z, s, m) in ((-0.5, 0, 0.3, 0.6, "pal_08"), (0.25, 0.05, 0.3, 0.6, "pal_08"), (-0.15, 0.0, 0.9, 0.55, "pal_08")):
        add_box(bm, s, s, s, x, y, z, m)
    for (x, y, z, m) in ((-0.5, 0, 0.7, "pal_01"), (-0.3, 0.1, 0.72, "pal_01"), (0.25, 0, 0.7, "pal_09"), (0.45, 0.1, 0.72, "pal_09"), (-0.15, 0, 1.22, "pal_06")):
        add_ico(bm, 0.17, x, y, z, m, 1, 1)
def barrel(bm, band="pal_11"):
    add_cyl(bm, 0.34, 0.3, 0.85, 0, 0, 0.425, "pal_08", 10)
    for z in (0.2, 0.65): add_cyl(bm, 0.345, 0.345, 0.06, 0, 0, z, band, 10)
def pullup(bm):
    for sx in (-0.9, 0.9): add_cyl(bm, 0.05, 0.05, 2.4, sx, 0, 1.2, "pal_11", 6)
    add_cyl(bm, 0.04, 0.04, 1.8, 0, 0, 2.3, "pal_01", 6, axis="x"); add_cyl(bm, 0.04, 0.04, 1.8, 0, 0, 1.7, "pal_01", 6, axis="x")
    add_box(bm, 2.2, 0.8, 0.06, 0, 0, 0.03, "pal_11")
def dumbbell_rack(bm):
    add_box(bm, 1.6, 0.5, 0.5, 0, 0, 0.25, "pal_11")
    for i in range(5):
        x = -0.6 + i * 0.3
        add_cyl(bm, 0.07, 0.07, 0.3, x, 0, 0.58, "pal_01" if i % 2 else "pal_09", 6, axis="y"); add_ico(bm, 0.1, x, 0.14, 0.58, "mat_dark", 1, 1); add_ico(bm, 0.1, x, -0.14, 0.58, "mat_dark", 1, 1)
def tire_stack(bm):
    for i in range(3): add_cyl(bm, 0.4, 0.4, 0.22, 0, 0, 0.11 + i * 0.22, "mat_dark", 10)
def picket(bm, n=6, col="pal_07"):
    for i in range(n): add_box(bm, 0.1, 0.05, 0.75, i * 0.5, 0, 0.375, col)
    add_box(bm, n * 0.5, 0.04, 0.07, (n - 1) * 0.25, 0.0, 0.25, col); add_box(bm, n * 0.5, 0.04, 0.07, (n - 1) * 0.25, 0.0, 0.55, col)
def doghouse(bm):
    add_box(bm, 0.9, 0.9, 0.6, 0, 0, 0.3, "pal_08"); add_box(bm, 1.1, 1.0, 0.07, 0, 0, 0.72, "pal_09", 0.0)
    add_box(bm, 0.36, 0.06, 0.36, 0, 0.46, 0.25, "mat_dark"); add_cyl(bm, 0.25, 0.0, 0.4, 0, 0, 0.82, "pal_09", 4)
def lantern_pole(bm, mat="pal_05"):                 # biển neon cho quán bar
    add_cyl(bm, 0.06, 0.07, 3.2, 0, 0, 1.6, "pal_11", 6); add_box(bm, 1.4, 0.1, 0.5, 0, 0.1, 3.0, "mat_dark")
    add_text(bm, "OPEN", 0.28, 0, 0.18, 3.0, "mat_neon")
def sandwich_board(bm, mat="pal_11"):
    for s in (-1, 1): add_box(bm, 0.65, 0.06, 0.95, 0, s * 0.18, 0.5, "pal_08", 0.0)
    add_box(bm, 0.55, 0.02, 0.8, 0, 0.215, 0.52, mat)
def bulbs(bm, length=6.0, n=9):                     # dây đèn: 2 cột + chuỗi bóng phát sáng
    for sx in (-length / 2, length / 2): add_cyl(bm, 0.05, 0.06, 3.0, sx, 0, 1.5, "pal_11", 6)
    for i in range(n):
        t = i / (n - 1); x = -length / 2 + t * length; sag = 0.4 * math.sin(t * math.pi)
        add_ico(bm, 0.09, x, 0, 2.9 - sag, "mat_lamp", 1, 1)
    add_box(bm, length, 0.015, 0.015, 0, 0, 2.78, "pal_11")
def car(bm, body="pal_09", roof=None):
    add_box(bm, 1.7, 3.8, 0.55, 0, 0, 0.6, body); add_box(bm, 1.5, 2.0, 0.5, 0, -0.1, 1.12, roof or body)
    add_box(bm, 1.52, 1.6, 0.34, 0, -0.1, 1.14, "pal_12"); add_box(bm, 1.72, 0.1, 0.12, 0, 1.9, 0.5, "pal_11"); add_box(bm, 1.72, 0.1, 0.12, 0, -1.9, 0.5, "pal_11")
    for sx in (-0.88, 0.88):
        for sy in (-1.2, 1.2): add_cyl(bm, 0.34, 0.34, 0.2, sx, sy, 0.34, "mat_dark", 10, axis="x")
    for sx in (-0.55, 0.55): add_box(bm, 0.28, 0.06, 0.16, sx, 1.9, 0.72, "mat_lamp"); add_box(bm, 0.28, 0.06, 0.16, sx, -1.9, 0.72, "pal_09")
def bus_stop(bm):
    for sx in (-1.4, 1.4): add_box(bm, 0.08, 0.08, 2.4, sx, -0.5, 1.2, "pal_11")
    add_box(bm, 3.2, 1.3, 0.12, 0, -0.1, 2.45, "pal_02"); add_box(bm, 3.0, 0.05, 1.7, 0, -0.62, 1.3, "pal_12")
    for sx in (-1.4, 1.4): add_box(bm, 0.05, 1.0, 1.6, sx, -0.1, 1.2, "pal_12")
    add_box(bm, 1.8, 0.45, 0.07, 0, -0.35, 0.55, "pal_08"); add_box(bm, 0.5, 0.05, 0.8, 1.7, 0.7, 0.0, "pal_11")
    add_cyl(bm, 0.04, 0.04, 2.6, 1.9, 0.75, 1.3, "pal_11", 6); add_cyl(bm, 0.28, 0.28, 0.05, 1.9, 0.7, 2.5, "pal_02", 12, axis="y"); add_box(bm, 0.12, 0.03, 0.34, 1.9, 0.66, 2.5, "pal_07")
def statue(bm):
    add_box(bm, 1.2, 1.2, 0.5, 0, 0, 0.25, "pal_11"); add_box(bm, 0.8, 0.8, 0.5, 0, 0, 0.75, "mat_stone")
    add_ico(bm, 0.28, 0, 0, 1.3, "pal_04", 1.3, 1); add_ico(bm, 0.2, 0, 0, 1.75, "pal_04", 1, 1)
def ac_unit(bm):
    add_box(bm, 1.3, 0.9, 0.75, 0, 0, 0.375, "mat_stone"); add_cyl(bm, 0.32, 0.32, 0.05, 0.25, 0.46, 0.4, "mat_dark", 10, axis="y")
    add_box(bm, 0.4, 0.05, 0.5, -0.4, 0.46, 0.4, "pal_11")
def vent(bm):
    add_cyl(bm, 0.18, 0.18, 0.9, 0, 0, 0.45, "pal_11", 8); add_cyl(bm, 0.34, 0.1, 0.22, 0, 0, 1.0, "pal_11", 8)
def skylight(bm):
    add_box(bm, 1.6, 1.6, 0.35, 0, 0, 0.175, "pal_07"); add_box(bm, 1.4, 1.4, 0.4, 0, 0, 0.2, "pal_12")
def solar(bm):
    for i in range(3):
        t = bmesh.new(); add_box(t, 1.3, 0.9, 0.06, 0, 0, 0, "pal_02")
        add_box(t, 1.34, 0.04, 0.08, 0, 0, 0.0, "pal_07"); add_box(t, 0.04, 0.94, 0.08, 0, 0, 0.0, "pal_07")
        merge(bm, t, Matrix.Translation((i * 1.5, 0, 0.45)) @ Matrix.Rotation(math.radians(-30), 4, "X"))
        add_box(bm, 0.08, 0.08, 0.4, i * 1.5, 0.3, 0.2, "pal_11")
def weathervane(bm):
    add_cyl(bm, 0.03, 0.04, 1.0, 0, 0, 0.5, "pal_11", 5); add_box(bm, 0.5, 0.05, 0.05, 0, 0, 0.95, "pal_11"); add_box(bm, 0.3, 0.04, 0.2, 0.3, 0, 1.0, "pal_01"); add_ico(bm, 0.1, 0, 0, 1.25, "pal_04", 1, 1)
def rooftop_sign(bm, text, mat="mat_neon"):
    add_box(bm, len(text) * 0.65 + 0.6, 0.2, 1.3, 0, 0, 1.4, "mat_dark")
    for sx in (-1, 1): add_box(bm, 0.12, 0.12, 0.8, sx * (len(text) * 0.3), 0, 0.4, "pal_11")
    add_text(bm, text, 0.85, 0, 0.12, 1.4, mat)
def tree_small(bm, leaf="mat_leaf2", s=1.0):
    add_cyl(bm, 0.13 * s, 0.17 * s, 1.0 * s, 0, 0, 0.5 * s, "pal_08", 6); add_ico(bm, 0.8 * s, 0, 0, 1.7 * s, leaf, 1.05, 1)
def hedge(bm, n=3):
    for i in range(n): add_box(bm, 1.1, 0.7, 0.75, i * 1.0, 0, 0.375, "mat_leaf2"); add_ico(bm, 0.45, i * 1.0, 0, 0.85, "mat_leaf", 0.8, 1)

# ---------- Kenney: bản sao liên kết dữ liệu ----------
KC = bpy.data.collections.get("kenney_src") or bpy.data.collections.new("kenney_src")
if KC.name not in bpy.context.scene.collection.children:
    bpy.context.scene.collection.children.link(KC)
KENNEY = ["traffic-light", "road-sign-stop", "construction-cone", "construction-barrier", "dumpster", "vending-machine", "claw-machine", "arcade-machine"]
for n in KENNEY:
    ob = bpy.data.objects.get(n)
    if ob is None: continue
    for o in [ob] + list(ob.children_recursive):
        for c in list(o.users_collection): c.objects.unlink(o)
        KC.objects.link(o)
    ob["cd_src"] = True
KCOUNT = {}
def kenney(name, x, z, rot, scale, r=0.4, solid=True, force=False):
    src = bpy.data.objects.get(name)
    if src is None: skipped.append((name, "missing")); return False
    if not force and not free(x, z, r): skipped.append((name, round(x, 1), round(z, 1), WHY[0])); return False
    n = KCOUNT[name] = KCOUNT.get(name, 0) + 1
    root = None; mp = {}
    for o in [src] + list(src.children_recursive):
        c = o.copy(); c.name = "kc_%s_%d_%s" % (name, n, o.name[:12]); c["cd_gen"] = True
        bpy.context.scene.collection.objects.link(c); mp[o] = c
    for o, c in mp.items():
        if o.parent is not None:
            c.parent = mp[o.parent]; c.matrix_parent_inverse = o.matrix_parent_inverse.copy()
    root = mp[src]
    e0 = src.rotation_quaternion.to_euler() if src.rotation_mode == "QUATERNION" else src.rotation_euler   # glTF nhập vào dùng quaternion
    root.rotation_mode = "XYZ"
    root.location = (x, -z, 0)
    root.rotation_euler = (e0.x, e0.y, e0.z + rot + math.pi)   # Kenney (glTF): mặt trước là -Y trong Blender; prop tự dựng là +Y
    root.scale = (src.scale.x * scale, src.scale.y * scale, src.scale.z * scale)
    if solid: OBS.append((round(x, 2), round(z, 2), r))
    return True

# =====================================================================
D = new_bm()
# ---------- công viên ----------
# 8 ô trống giữa lối đi / ghế quảng trường / vòng cây (góc 25 + 90k và 65 + 90k, r = 5)
put(swing, *polar(25, 5.0), math.radians(120), 1.0)
put(slide, *polar(65, 5.0), math.radians(200), 0.9)
put(picnic, *polar(115, 5.0), 0.0, 1.0)
put(food_cart, *polar(155, 5.0), math.radians(-60), 0.9)
put(pond, *polar(205, 5.0), 0.0, 1.0, sc=0.8)
put(flowerbed, *polar(245, 5.0), 0.0, 0.9, sc=0.9)
put(flowerbed, *polar(295, 5.0), 0.0, 0.9, sc=0.9, cols=("pal_04", "pal_01", "pal_07"))
put(statue, *polar(335, 5.0), 0.0, 0.6)
put(sandbox, *polar(25, 7.3), 0.0, 0.8)
for ang, rot in ((0, 90), (90, 180), (180, 270), (270, 0)):
    x, z = polar(ang + 30, 7.35)
    put(bench, x, z, face(-x, -z), 0.8)
for ang in (45, 135, 225, 315):
    x, z = polar(ang, 7.3); put(bin_, x, z, 0.0, 0.3)
for sx, sz in ((-1, -1), (1, -1), (-1, 1), (1, 1)):                                     # bụi cây 4 góc công viên
    put(hedge, sx * 7.0 - 1.0 if sx < 0 else sx * 7.0 - 1.0, sz * 7.4, 0.0, 1.3, 3, force=True)

# ---------- phố: biển tên, đèn giao thông, vòi nước, hộp thư, thùng rác, trạm xe buýt ----------
for (sx, sz, txt) in ((-1, -1, "MAIN ST"), (1, -1, "PARK AVE"), (-1, 1, "OAK ST"), (1, 1, "ELM ST")):
    x, z = sx * 10.6, sz * 7.6
    put(street_sign, x, z, math.pi / 2 * (1 if sx > 0 else -1), 0.25, txt, force=True)
for sx in (-1, 1):
    for sz in (-1, 1):
        kenney("traffic-light", sx * 7.6, sz * 7.6, face(sx, sz) , 7.0, 0.25, force=True)         # góc công viên, quay ra ngã tư
        kenney("traffic-light", sx * 10.4, sz * 10.4, face(-sx, -sz), 7.0, 0.25, force=True)
for sx, sz in ((-1, -1), (1, 1), (1, -1), (-1, 1)):
    kenney("road-sign-stop", sx * 10.5, sz * 12.2, face(0, -sz), 7.0, 0.25, force=True)
for (x, z) in ((11.3, -10.8), (-11.3, 10.8), (-10.8, -11.3), (10.8, 11.3)):
    put(hydrant, x, z, 0.0, 0.25)
for (x, z) in ((11.4, 10.8), (-11.4, -10.8), (10.8, -11.4), (-10.8, 11.4)):
    put(mailbox, x, z, math.pi / 2, 0.3)
put(bus_stop, 11.4, -5.2, face(-1, 0), 1.0)
put(bus_stop, -11.4, 5.2, face(1, 0), 1.0)
for (x, z) in ((11.8, -8.7), (-11.8, 8.7), (-8.7, -11.8), (8.7, 11.8)):
    put(bin_, x, z, 0.0, 0.3)
for (x, z, rot, body, roofc) in ((9.0, -26.2, 0.0, "pal_02", None), (-9.0, 25.5, math.pi, "pal_04", "pal_11"), (26.0, 9.0, math.pi / 2, "pal_09", "pal_07"), (-26.5, -9.0, -math.pi / 2, "pal_10", None)):
    put(car, x, z, rot, 1.6, body, roofc, force=True)

# ---------- chi tiết quanh từng toà nhà ----------
for b in B:
    dx, dz = DIR3[b["door"]]; fr = face(dx, dz); bk = face(-dx, -dz); w = b["w"]; s = b["style"]
    # đầu hồi mặt trước: chậu cây hai bên cửa (đặt sát tường để không chắn đường)
    for k in (-1, 1):
        x, z = FR(b, k * 3.4, 0.55); put(planter, x, z, fr, 0.45, ("pal_05", "pal_04", "pal_01") if k < 0 else ("pal_03", "pal_07", "pal_05"))
    if s == "tower":
        x, z = FR(b, 5.2, 1.9); put(flagpole, x, z, fr, 0.25)
        x, z = FR(b, -5.0, 1.6); put(bike_rack, x, z, fr, 0.5)
        for i in range(3):
            x, z = FR(b, -5.8 + i * 0.5, 1.6); put(bike, x, z, fr + math.pi / 2, 0.3, "pal_%02d" % (9, 2, 4)[i], solid=False, force=True)
        x, z = FR(b, 4.0, 1.4); put(bench, x, z, fr, 0.55)
    elif s == "office":
        x, z = FR(b, -4.6, 1.5); put(bike_rack, x, z, fr, 0.5)
        x, z = FR(b, 4.6, 1.5); put(bench, x, z, fr, 0.55)
        x, z = FR(b, 5.7, 0.5); put(bin_, x, z, 0.0, 0.3)
    elif s == "cafe":
        for k in (-1, 1):
            x, z = FR(b, k * 4.0, 2.0); put(cafe_set, x, z, fr, 1.0, "pal_05" if k < 0 else "pal_04")
        x, z = FR(b, -2.9, 3.0); put(sandwich_board, x, z, fr, 0.4)
    elif s == "market":
        for k, m in ((-1, 0), (1, 1)):
            x, z = FR(b, k * 4.4, 1.5); put(crates, x, z, fr, 0.9)
        x, z = FR(b, 2.9, 2.2); put(barrel, x, z, 0.0, 0.4)
        x, z = FR(b, -2.9, 2.2); put(barrel, x, z, 0.0, 0.4, "pal_09")
        x, z = FR(b, 2.9, 2.8); put(sandwich_board, x, z, fr, 0.4, "pal_06")
        kenney("vending-machine", *FR(b, 6.0, 1.1), fr, 2.7, 0.5)
    elif s == "gym":
        x, z = FR(b, -4.6, 1.8); put(pullup, x, z, fr, 0.9)
        x, z = FR(b, 4.4, 1.4); put(dumbbell_rack, x, z, fr, 0.8)
        x, z = FR(b, 5.3, 0.8); put(tire_stack, x, z, 0.0, 0.45)
        kenney("vending-machine", *FR(b, -6.0, 0.9), fr, 2.7, 0.5)
    elif s == "home":
        for side in (-1, 1):
            x, z = FR(b, side * 3.4 + (0 if side > 0 else -2.0), 1.6)
            put(picket, x, z, fr, 0.7, 4, "pal_08", solid=True)
        x, z = FR(b, -w / 2 - 1.8, 0.6); put(doghouse, x, z, fr, 0.6)
        x, z = FR(b, 5.2, 0.9); put(mailbox, x, z, fr, 0.3, "pal_09")
        x, z = FR(b, 2.9, 3.1); put(bin_, x, z, 0.0, 0.3)
    elif s == "bar":
        x, z = FR(b, 4.6, 1.6); put(lantern_pole, x, z, fr, 0.3)
        x, z = FR(b, -5.0, 0.9); put(barrel, x, z, 0.0, 0.4, "pal_05"); x, z = FR(b, -5.0, 1.8); put(barrel, x, z, 0.0, 0.4, "pal_05")
        x, z = FR(b, -5.4, 2.4); put(bench, x, z, fr, 0.8, "pal_11")
        x, z = FR(b, 2.9, 3.2); put(sandwich_board, x, z, fr, 0.4, "pal_05")
        x, z = FR(b, 0.0, 3.8); place(D, bulbs, x, z, fr, 6.8, 11)    # dây đèn ngang mặt tiền
    elif s == "arcade":
        for k, nm in ((-1, "claw-machine"), (1, "arcade-machine")):
            kenney(nm, *FR(b, k * 4.6, 0.9), fr, 2.5, 0.45)
        kenney("vending-machine", *FR(b, 3.1, 0.9), fr, 2.7, 0.45)
        x, z = FR(b, -5.6, 0.9); put(bin_, x, z, 0.0, 0.3, "pal_03")
    # lưng toà nhà: thùng rác lớn, cây
    if s in ("cafe", "market", "bar", "gym", "arcade", "office"):
        kenney("dumpster", *FR(b, 0.0, -b["d"] - 1.1), bk, 5.8, 0.8)
    if s in ("school", "home", "tower"):
        x, z = FR(b, w * 0.2, -b["d"] - 1.0); put(bench, x, z, bk, 0.55)
    x, z = FR(b, -w * 0.2, -b["d"] - 1.0); put(bin_, x, z, 0.0, 0.3)

# vài hộp nón/rào công trường: bên sườn phải thư viện cho vui — vá đường gần hông phố đông
for i in range(3):
    kenney("construction-cone", 12.4 + i * 1.0, -12.4, 0.0, 7.0, 0.2, solid=True, force=True)
kenney("construction-barrier", 14.8, -12.4, 0.0, 6.5, 0.4, force=True)

# ---------- viền thế giới: hàng rào gỗ thấp, chừa chỗ đường + trụ chắn ----------
EDGE = HALF - 0.35
road_gaps = (-9, 9)
def fence_seg(bm):               # một nhịp dài 2 m, gốc ở đầu nhịp, chạy theo +x
    add_box(bm, 0.14, 0.14, 1.0, 0, 0, 0.5, "pal_08")
    add_box(bm, 2.0, 0.07, 0.08, 1.0, 0, 0.82, "pal_08"); add_box(bm, 2.0, 0.07, 0.08, 1.0, 0, 0.5, "pal_08")
def bollard(bm):
    add_cyl(bm, 0.12, 0.12, 0.7, 0, 0, 0.35, "pal_04", 6); add_cyl(bm, 0.13, 0.13, 0.08, 0, 0, 0.6, "pal_11", 6)
for k in range(-15, 15):
    a = k * 2.0                                                       # nhịp [a, a + 2]
    if any(abs(a + 1.0 - g) < 2.1 for g in road_gaps): continue
    place(D, fence_seg, a, -EDGE, 0.0)                                 # bắc (z = -EDGE)
    place(D, fence_seg, a, EDGE, 0.0)                                  # nam
    place(D, fence_seg, EDGE, a + 2.0, math.pi / 2)                    # đông: chạy theo z
    place(D, fence_seg, -EDGE, a + 2.0, math.pi / 2)                   # tây
for g in road_gaps:
    for off in (-1.5, 1.5):
        for sgn in (-1, 1):
            place(D, bollard, g + off, sgn * EDGE, 0.0); place(D, bollard, sgn * EDGE, g + off, 0.0)

# ---------- vạch qua đường (ở 4 nhánh của mỗi ngã tư) ----------
CZ = 0.012
for ix in (-9, 9):
    for iz in (-9, 9):
        for off in (-2.9, 2.9):
            zb = bmesh.new()
            for i in range(-2, 3): add_box(zb, 0.3, 0.9, 0.012, i * 0.4, 0, CZ, "pal_07")
            merge(D, zb, Matrix.Translation((ix, -(iz + off), 0.0)))
            zb = bmesh.new()
            for i in range(-2, 3): add_box(zb, 0.9, 0.3, 0.012, 0, i * 0.4, CZ, "pal_07")
            merge(D, zb, Matrix.Translation((ix + off, -iz, 0.0)))

# ---------- chi tiết mái (một object mỗi toà nhà, mờ cùng toà nhà) ----------
roof_objs = []
for b in B:
    R = new_bm(); h = b["h"]; w, d = b["w"], b["d"]; s = b["style"]
    if b["roof"] == "flat":
        top = h + 0.4
        for (cx, cy, sx, sy) in ((0, d / 2 + 0.3 - 0.06, w + 0.6, 0.12), (0, -d / 2 - 0.3 + 0.06, w + 0.6, 0.12)):
            add_box(R, sx, sy, 0.28, cx, cy, top + 0.14, "pal_07")
        for sx in (-1, 1): add_box(R, 0.12, d + 0.6, 0.28, sx * (w / 2 + 0.3 - 0.06), 0, top + 0.14, "pal_07")
        spots = {"tower": [(w * 0.3, -d * 0.25), (-w * 0.32, d * 0.2)], "office": [(w * 0.25, d * 0.2), (-w * 0.3, d * 0.28), (0, -d * 0.3)],
                 "cafe": [(w * 0.28, 0), (-w * 0.3, d * 0.2)], "gym": [(w * 0.25, -d * 0.2), (-w * 0.28, d * 0.2), (w * 0.05, d * 0.25)],
                 "bar": [(w * 0.3, -d * 0.2), (-w * 0.3, -d * 0.25)], "arcade": [(w * 0.3, -d * 0.25), (-w * 0.32, -d * 0.2)]}[s]
        fns = [ac_unit, vent, ac_unit, skylight]
        for i, (x, y) in enumerate(spots):
            t = bmesh.new(); fns[(i + (1 if s in ("gym", "cafe") else 0)) % 4](t)
            merge(R, t, Matrix.Translation((x, y, top)))
        if s in ("office", "gym"):
            t = bmesh.new(); solar(t); merge(R, t, Matrix.Translation((-1.5, -d * 0.1, top)))
        if s in ("bar", "arcade"):
            t = bmesh.new(); rooftop_sign(t, "BAR" if s == "bar" else "PLAY", "mat_neon")
            merge(R, t, Matrix.Translation((0, d / 2 - 0.5, top)))
    else:
        t = bmesh.new(); weathervane(t); merge(R, t, Matrix.Translation((w * 0.25 if s == "market" else -w * 0.28, 0, h + 2.2)))
    me = bpy.data.meshes.new("building_%s__roof" % b["id"]); R.to_mesh(me); R.free()
    for m in MATS: me.materials.append(bpy.data.materials[m])
    ob = bpy.data.objects.new("building_%s__roof" % b["id"], me); ob["cd_gen"] = True
    bpy.context.scene.collection.objects.link(ob); ob.location = (b["cx"], -b["cz"], 0); ob.rotation_euler = (0, 0, ROT[b["door"]])
    roof_objs.append(ob)

bmesh.ops.recalc_face_normals(D, faces=D.faces)
me = bpy.data.meshes.new("city_details"); D.to_mesh(me); D.free()
for m in MATS: me.materials.append(bpy.data.materials[m])
det = bpy.data.objects.new("city_details", me); det["cd_gen"] = True; bpy.context.scene.collection.objects.link(det)

# ---------- nền xa: đường kéo dài, khối nhà, cây, đồi ----------
BD = new_bm()
add_box(BD, 400, 400, 0.4, 0, 0, -0.35, "mat_grass2")
for rx in (-9, 9):
    add_box(BD, 2.0, 120, 0.05, rx, 0, -0.13, "mat_asphalt"); add_box(BD, 120, 2.0, 0.05, 0, rx, -0.13, "mat_asphalt")
    for k in range(-30, 31):
        if abs(k * 2.0) < 31: continue
        add_box(BD, 0.12, 0.9, 0.02, rx, k * 2.0, -0.1, "pal_07"); add_box(BD, 0.9, 0.12, 0.02, k * 2.0, rx, -0.1, "pal_07")
WALL = ["pal_07", "pal_07", "pal_08", "pal_09", "pal_10", "pal_11", "pal_02", "pal_12"]
def far_building(cx, cy, w, d, h, wall, roofc):
    add_box(BD, w, d, h, cx, cy, h / 2 - 0.1, wall); add_box(BD, w + 0.4, d + 0.4, 0.3, cx, cy, h, roofc)
    rows = max(1, int(h // 3.5))
    for r in range(rows):
        for i in range(3):
            x = cx + (i - 1) * w * 0.28
            add_box(BD, 1.0, 0.06, 1.1, x, cy + d / 2, 2.0 + r * 3.2, "mat_window"); add_box(BD, 1.0, 0.06, 1.1, x, cy - d / 2, 2.0 + r * 3.2, "mat_window")
for i in range(-6, 7):
    for j in range(-6, 7):
        cx, cy = i * 14.0, j * 14.0
        if abs(cx) < 46 and abs(cy) < 46: continue
        if abs(cx) > 95 or abs(cy) > 95: continue
        if rng.random() < 0.18: continue
        w, d = rng.uniform(5.5, 7.0), rng.uniform(5.5, 7.0); h = rng.choice([4.5, 5.5, 6.5, 8, 10]) * (1.0 if max(abs(cx), abs(cy)) < 66 else 1.7)
        far_building(cx + rng.uniform(-0.4, 0.4), cy + rng.uniform(-0.4, 0.4), w, d, h, rng.choice(WALL), rng.choice(["pal_11", "pal_09", "pal_08"]))
for k in range(70):                                                    # cây rải ngoài rìa
    a = rng.uniform(0, math.tau); r = rng.uniform(34, 90); x, y = math.cos(a) * r, math.sin(a) * r
    if abs(abs(x) - 9) < 2.4 or abs(abs(y) - 9) < 2.4: continue
    if abs(x) < 33 and abs(y) < 33: continue
    s_ = rng.uniform(0.9, 1.5)
    add_cyl(BD, 0.2 * s_, 0.27 * s_, 1.5 * s_, x, y, 0.75 * s_, "pal_08", 6); add_ico(BD, 1.3 * s_, x, y, 2.5 * s_, rng.choice(["mat_leaf", "mat_leaf2"]), 1.05, 1)
for k in range(14):                                                    # đồi xa
    a = k * math.tau / 14 + 0.15; r = 150
    add_ico(BD, rng.uniform(26, 38), math.cos(a) * r, math.sin(a) * r, -4, rng.choice(["mat_leaf2", "mat_leaf", "pal_10"]), 0.7, 2)
bmesh.ops.recalc_face_normals(BD, faces=BD.faces)
me = bpy.data.meshes.new("city_backdrop"); BD.to_mesh(me); BD.free()
for m in MATS: me.materials.append(bpy.data.materials[m])
bdo = bpy.data.objects.new("city_backdrop", me); bdo["cd_gen"] = True; bpy.context.scene.collection.objects.link(bdo)

# ---------- báo cáo ----------
print("details polys", len(det.data.polygons), "backdrop polys", len(bdo.data.polygons), "roof objs", len(roof_objs), "kenney clones", KCOUNT)
print("solid obstacles", len(OBS), "skipped", len(skipped), skipped[:30])
print("OBS_JSON", json.dumps(OBS, separators=(",", ":")))
