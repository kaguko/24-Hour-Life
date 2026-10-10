# Dựng thành phố mini 60x60m trong Blender 4.2 (chạy qua blender MCP: execute_blender_code).
# Bố cục lấy từ art/blender/city_layout.json (đã dán vào LAYOUT bên dưới). Toạ độ layout là không gian three.js (x, z),
# Blender: x = x, y = -z. Đường lấy từ Kenney City Kit Roads (CC0); toà nhà, cây, đèn dựng bằng primitive + bảng màu pal_*.
# Tiền đề: đã import road-straight.glb và road-crossroad.glb; đã có các material pal_01..pal_12, mat_window, mat_lamp, mat_door, mat_grass, mat_pavement.
import bpy, bmesh, math, random
from mathutils import Matrix, Vector

LAYOUT = {
  "world": 60, "road_tile_scale": 2, "roads": {"x": [-9, 9], "z": [-9, 9]},
  "buildings": [
    {"id": "school", "sign": "SCHOOL", "cx": -20, "cz": -20, "w": 14, "d": 11, "h": 6.0, "wall": "pal_09", "roof": "pal_07", "accent": "pal_04", "door": "+z", "roof_type": "flat", "style": "tower"},
    {"id": "office", "sign": "OFFICE", "cx": 0, "cz": -20, "w": 12, "d": 10, "h": 10.0, "wall": "pal_02", "roof": "pal_11", "accent": "pal_12", "door": "+z", "roof_type": "flat", "style": "office"},
    {"id": "cafe", "sign": "CAFE", "cx": 20, "cz": -20, "w": 11, "d": 9, "h": 4.5, "wall": "pal_07", "roof": "pal_08", "accent": "pal_05", "door": "+z", "roof_type": "flat", "style": "cafe"},
    {"id": "market", "sign": "MARKET", "cx": -20, "cz": 0, "w": 14, "d": 10, "h": 4.5, "wall": "pal_06", "roof": "pal_07", "accent": "pal_04", "door": "+x", "roof_type": "gable", "style": "market"},
    {"id": "gym", "sign": "GYM", "cx": 20, "cz": 0, "w": 13, "d": 10, "h": 5.0, "wall": "pal_10", "roof": "pal_11", "accent": "pal_01", "door": "-x", "roof_type": "flat", "style": "gym"},
    {"id": "home", "sign": "HOME", "cx": -20, "cz": 20, "w": 12, "d": 10, "h": 6.0, "wall": "pal_07", "roof": "pal_09", "accent": "pal_10", "door": "-z", "roof_type": "gable", "style": "home"},
    {"id": "bar", "sign": "BAR", "cx": 0, "cz": 20, "w": 12, "d": 10, "h": 5.0, "wall": "pal_08", "roof": "pal_11", "accent": "pal_05", "door": "-z", "roof_type": "flat", "style": "bar"},
    {"id": "arcade", "sign": "ARCADE", "cx": 20, "cz": 20, "w": 12, "d": 10, "h": 5.5, "wall": "pal_03", "roof": "pal_11", "accent": "pal_04", "door": "-z", "roof_type": "flat", "style": "arcade"},
  ],
  "park": {"cx": 0, "cz": 0, "size": 16, "plaza_radius": 3.5},
}
W = LAYOUT["world"]; HALF = W / 2; RS = LAYOUT["road_tile_scale"]
rng = random.Random(24)

# ---------- dọn scene (giữ 2 tấm đường mẫu) ----------
KEEP = {"road-straight", "road-crossroad"}
for ob in list(bpy.data.objects):
    if ob.name not in KEEP:
        bpy.data.objects.remove(ob, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.cameras, bpy.data.lights, bpy.data.actions, bpy.data.curves):
    for d in list(coll):
        if d.users == 0:
            coll.remove(d)

def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hex_rgba(h):
    return (srgb_to_lin(int(h[0:2], 16)), srgb_to_lin(int(h[2:4], 16)), srgb_to_lin(int(h[4:6], 16)), 1.0)
def ensure_mat(name, hx, emit=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hex_rgba(hx); b.inputs["Roughness"].default_value = 0.9; b.inputs["Metallic"].default_value = 0.0
    if emit:
        b.inputs["Emission Color"].default_value = hex_rgba(emit); b.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = hex_rgba(hx)
    return m
ensure_mat("mat_neon", "FF8FB8", emit="FF4F9A", strength=1.0)
ensure_mat("mat_leaf", "62B06D")
ensure_mat("mat_grass2", "A5D6A0")

# ---------- primitive helpers (bmesh) ----------
def _tag(verts, mi):
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = mi
def add_box(bm, sx, sy, sz, cx, cy, cz, mi):
    vs = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    for v in vs:
        v.co = Vector((v.co.x * sx + cx, v.co.y * sy + cy, v.co.z * sz + cz))
    _tag(vs, mi)
def add_cyl(bm, r1, r2, depth, cx, cy, cz, mi, segs=8):
    vs = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r1, radius2=r2, depth=depth)["verts"]
    for v in vs:
        v.co = Vector((v.co.x + cx, v.co.y + cy, v.co.z + cz))
    _tag(vs, mi)
def add_ico(bm, r, cx, cy, cz, mi, sz=1.0):
    vs = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)["verts"]
    for v in vs:
        v.co = Vector((v.co.x + cx, v.co.y + cy, v.co.z * sz + cz))
    _tag(vs, mi)
def add_gable(bm, w, d, cx, cy, z0, rh, mi):
    # sống mái chạy theo trục x
    A0 = bm.verts.new((cx - w / 2, cy - d / 2, z0)); B0 = bm.verts.new((cx - w / 2, cy + d / 2, z0)); C0 = bm.verts.new((cx - w / 2, cy, z0 + rh))
    A1 = bm.verts.new((cx + w / 2, cy - d / 2, z0)); B1 = bm.verts.new((cx + w / 2, cy + d / 2, z0)); C1 = bm.verts.new((cx + w / 2, cy, z0 + rh))
    fs = [bm.faces.new(x) for x in ((A0, C0, B0), (A1, B1, C1), (A0, A1, C1, C0), (B0, C0, C1, B1), (A0, B0, B1, A1))]
    bmesh.ops.recalc_face_normals(bm, faces=fs)
    for f in fs:
        f.material_index = mi
def add_text(bm, text, size, cx, cy, cz, mi):
    cu = bpy.data.curves.new("tmp_txt", "FONT")
    cu.body = text; cu.size = size; cu.extrude = 0.04; cu.align_x = "CENTER"; cu.align_y = "CENTER"
    ob = bpy.data.objects.new("tmp_txt", cu); bpy.context.collection.objects.link(ob)
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    v0 = len(bm.verts); f0 = len(bm.faces)
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    for v in bm.verts[v0:]:
        x, y, z = v.co.x, v.co.y, v.co.z
        v.co = Vector((-x + cx, z + cy, y + cz))   # dựng thẳng, quay mặt về +y (không đảo hướng pháp tuyến)
    for f in bm.faces[f0:]:
        f.material_index = mi
    bpy.data.objects.remove(ob); bpy.data.curves.remove(cu); bpy.data.meshes.remove(me)
def to_object(name, bm, mat_names, loc=(0, 0, 0), rot=0.0):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for mn in mat_names:
        me.materials.append(bpy.data.materials[mn] if isinstance(mn, str) else mn)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = (0, 0, rot)
    return ob

DIR3 = {"+z": (0, 1), "-z": (0, -1), "+x": (1, 0), "-x": (-1, 0)}
# cửa hướng +y cục bộ; quay quanh Z để ra hướng thật (three +z = Blender -y)
ROT = {"-z": 0.0, "+z": math.pi, "+x": -math.pi / 2, "-x": math.pi / 2}

# ---------- toà nhà ----------
# slot vật liệu: 0 tường, 1 mái, 2 nhấn, 3 cửa, 4 cửa sổ, 5 đá tối, 6 kem (chữ), 7 neon
def build_building(b):
    bm = bmesh.new(); w, d, h = b["w"], b["d"], b["h"]; fy = d / 2; style = b["style"]
    add_box(bm, w + 0.3, d + 0.3, 0.5, 0, 0, 0.25, 5)           # chân tường
    add_box(bm, w, d, h, 0, 0, h / 2, 0)                          # thân
    if b["roof_type"] == "gable":
        add_gable(bm, w + 0.8, d + 0.8, 0, 0, h, 2.2, 1)
    else:
        add_box(bm, w + 0.6, d + 0.6, 0.4, 0, 0, h + 0.2, 1)
    add_box(bm, 1.8, 0.2, 2.6, 0, fy, 1.8, 3)                     # cửa
    add_box(bm, 3.0, 1.0, 0.18, 0, fy + 0.5, 3.35, 2)             # mái hiên nhỏ
    rows = max(1, int(h // 3.2))
    for r in range(rows):
        z = 2.4 + r * 3.0
        xs = [-w * 0.33, w * 0.33] if r == 0 else [-w * 0.33, 0, w * 0.33]
        for x in xs:
            add_box(bm, 1.6, 0.14, 1.5, x, fy, z, 4)
        for y in (-d * 0.22, d * 0.22):
            for sx in (-1, 1):
                add_box(bm, 0.14, 1.6, 1.5, sx * w / 2, y, z, 4)
    if style == "tower":
        add_box(bm, 3.2, 3.2, 3.4, 0, 0, h + 0.4 + 1.7, 0)
        add_box(bm, 3.8, 3.8, 0.3, 0, 0, h + 0.4 + 3.55, 1)
        add_box(bm, 1.7, 0.12, 1.7, 0, 1.62, h + 0.4 + 1.9, 2)
    elif style == "office":
        add_cyl(bm, 1.2, 1.2, 1.8, -w * 0.25, -d * 0.2, h + 0.4 + 0.9, 5, 8)
        add_box(bm, 0.15, 0.15, 3.0, w * 0.3, -d * 0.2, h + 0.4 + 1.5, 5)
        add_box(bm, w * 0.9, 0.12, 0.5, 0, fy + 0.07, h - 0.6, 2)
    elif style == "cafe":
        add_box(bm, w * 0.7, 2.4, 0.2, 0, fy + 1.2, 3.35, 2)
        for sx in (-1, 1):
            add_cyl(bm, 0.08, 0.08, 0.8, sx * 2.6, fy + 3.2, 0.4, 5, 6)
            add_cyl(bm, 0.65, 0.65, 0.08, sx * 2.6, fy + 3.2, 0.84, 6, 10)
    elif style == "market":
        for i in range(6):
            add_box(bm, w / 6, 2.6, 0.18, -w / 2 + (i + 0.5) * w / 6, fy + 1.3, 3.4, 2 if i % 2 == 0 else 6)
        for sx in (-1, 1):
            add_box(bm, 1.0, 1.0, 1.0, sx * w * 0.38, fy + 1.3, 0.5, 5)
    elif style == "gym":
        add_box(bm, w + 0.1, d + 0.1, 0.7, 0, 0, h * 0.62, 2)
    elif style == "home":
        add_box(bm, 0.9, 0.9, 2.4, w * 0.28, -d * 0.15, h + 1.6, 5)
        add_box(bm, 3.4, 1.4, 0.15, w * 0.22, fy + 0.7, 3.3, 2)
    elif style == "bar":
        add_box(bm, 5.0, 0.12, 0.5, 0, fy + 0.18, 3.7, 7)
        for sx in (-1, 1):
            add_cyl(bm, 0.5, 0.5, 1.0, sx * w * 0.35, fy + 0.9, 0.5, 5, 8)
    elif style == "arcade":
        add_box(bm, 6.0, 0.25, 0.9, 0, fy + 0.15, 3.9, 4)
    zs = h - 0.55 if style in ("cafe", "market", "bar") else min(h - 1.1, 5.6)
    sw = max(3.2, len(b["sign"]) * 0.72 + 0.8)
    add_box(bm, sw, 0.3, 1.3, 0, fy + 0.2, zs, 5)
    add_text(bm, b["sign"], 0.85, 0, fy + 0.38, zs, 6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mats = [b["wall"], b["roof"], b["accent"], "mat_door", "mat_window", "pal_11", "pal_07", "mat_neon"]
    dx, dz = DIR3[b["door"]]
    return to_object("building_" + b["id"], bm, mats, loc=(b["cx"], -b["cz"], 0), rot=ROT[b["door"]])

# ---------- đường (ghép tấm Kenney thành 1 mesh) ----------
def build_roads():
    bm = bmesh.new()
    me_s = bpy.data.objects["road-straight"].data; me_c = bpy.data.objects["road-crossroad"].data
    mats = [me_s.materials[0], me_c.materials[0]]
    def add(me, x, y, rot, mi):
        v0 = len(bm.verts); bm.from_mesh(me); bm.verts.ensure_lookup_table()
        new = bm.verts[v0:]
        bmesh.ops.transform(bm, matrix=Matrix.Translation((x, y, 0)) @ Matrix.Rotation(rot, 4, "Z") @ Matrix.Scale(RS, 4), verts=new)
        _tag(new, mi)
    n = int(W / RS); centers = [-HALF + RS / 2 + i * RS for i in range(n)]
    xr, zr = LAYOUT["roads"]["x"], LAYOUT["roads"]["z"]
    for rx in xr:
        for cz in centers:
            if cz in zr: add(me_c, rx, -cz, 0, 1)
            else: add(me_s, rx, -cz, math.pi / 2, 0)
    for rz in zr:
        for cx in centers:
            if cx not in xr: add(me_s, cx, -rz, 0, 0)
    return to_object("city_roads", bm, mats)

# ---------- nền, vỉa hè, công viên ----------
bm = bmesh.new(); add_box(bm, W, W, 0.2, 0, 0, -0.11, 0); ground = to_object("city_ground", bm, ["mat_grass"])
bm = bmesh.new()
for b in LAYOUT["buildings"]:
    add_box(bm, 18, 18, 0.1, b["cx"], -b["cz"], 0.05, 0)
pave = to_object("city_pavement", bm, ["mat_pavement"])

pk = LAYOUT["park"]; bm = bmesh.new(); pr = pk["plaza_radius"]
add_box(bm, pk["size"], pk["size"], 0.06, pk["cx"], -pk["cz"], 0.03, 0)               # cỏ công viên
add_cyl(bm, pr, pr, 0.1, pk["cx"], -pk["cz"], 0.05, 1, 24)                              # quảng trường
for ang in (0, 90):                                                                       # lối đi chữ thập
    a = math.radians(ang)
    add_box(bm, 2.0 if ang == 0 else pk["size"], pk["size"] if ang == 0 else 2.0, 0.08, 0, 0, 0.04, 1)
for sx, sy in ((-2.2, -2.2), (2.2, -2.2), (-2.2, 2.2), (2.2, 2.2)):                      # chòi nghỉ: 4 cột + mái chóp
    add_cyl(bm, 0.12, 0.12, 2.6, sx * 0.64, sy * 0.64, 1.4, 2, 6)
add_cyl(bm, 2.4, 0.0, 1.3, 0, 0, 3.55, 3, 4)
for ang in range(0, 360, 90):                                                             # ghế băng quanh quảng trường
    a = math.radians(ang + 45); x, y = math.cos(a) * (pr + 1.4), math.sin(a) * (pr + 1.4)
    add_box(bm, 1.6, 0.5, 0.12, x, y, 0.5, 2); add_box(bm, 1.6, 0.1, 0.5, x, y + 0.25, 0.8, 2)
    add_box(bm, 0.1, 0.45, 0.45, x - 0.7, y, 0.25, 4); add_box(bm, 0.1, 0.45, 0.45, x + 0.7, y, 0.25, 4)
park = to_object("city_park", bm, ["mat_grass2", "mat_pavement", "pal_08", "pal_09", "pal_11"])

# ---------- cây ----------
def inside_building(x, z, margin=1.2):
    for b in LAYOUT["buildings"]:
        ex, ez = (b["w"], b["d"]) if b["door"] in ("+z", "-z") else (b["d"], b["w"])
        if abs(x - b["cx"]) < ex / 2 + margin and abs(z - b["cz"]) < ez / 2 + margin:
            return True
    return False
tree_pts = []
for i in range(12):
    a = math.radians(i * 30 + 15); r = 6.4
    tree_pts.append((math.cos(a) * r, math.sin(a) * r))
for b in LAYOUT["buildings"]:
    dx, dz = DIR3[b["door"]]
    depth = b["d"]; lateral = (b["w"])
    bx, bz = b["cx"] - dx * (depth / 2 + 2.3), b["cz"] - dz * (depth / 2 + 2.3)        # sau toà nhà
    px, pz = -dz, dx
    for k in (-0.32, 0.32):
        tree_pts.append((bx + px * lateral * k, bz + pz * lateral * k))
    for k in (-1, 1):                                                                        # hai bên cửa trước
        tree_pts.append((b["cx"] + dx * (depth / 2 + 2.6) + px * k * (lateral / 2 + 1.2), b["cz"] + dz * (depth / 2 + 2.6) + pz * k * (lateral / 2 + 1.2)))
bm = bmesh.new()
for (x, z) in tree_pts:
    if inside_building(x, z, 0.8) or abs(x) > HALF - 1 or abs(z) > HALF - 1:
        continue
    s = rng.uniform(0.85, 1.2)
    add_cyl(bm, 0.22 * s, 0.28 * s, 1.6 * s, x, -z, 0.8 * s, 0, 6)
    add_ico(bm, 1.3 * s, x, -z, 2.5 * s, 1, 1.05)
    add_ico(bm, 0.9 * s, x, -z, 3.3 * s, 1, 1.0)
trees = to_object("city_trees", bm, ["pal_08", "mat_leaf"])

# ---------- đèn đường ----------
bm = bmesh.new()
lamp_pts = []
for rx in LAYOUT["roads"]["x"]:
    for i, z in enumerate((-25, -15, -4, 4, 15, 25)):
        lamp_pts.append((rx + (1.7 if i % 2 == 0 else -1.7), z))
for rz in LAYOUT["roads"]["z"]:
    for i, x in enumerate((-25, -15, -4, 4, 15, 25)):
        lamp_pts.append((x, rz + (1.7 if i % 2 == 0 else -1.7)))
for (x, z) in lamp_pts:
    add_cyl(bm, 0.08, 0.1, 4.0, x, -z, 2.0, 0, 6)
    add_box(bm, 0.5, 0.5, 0.3, x, -z, 4.15, 1)
lamps = to_object("city_lamps", bm, ["pal_11", "mat_lamp"])

# ---------- đường + toà nhà + điểm cửa ----------
roads = build_roads()
doors = {}
for b in LAYOUT["buildings"]:
    build_building(b)
    dx, dz = DIR3[b["door"]]
    doors[b["id"]] = (b["cx"] + dx * (b["d"] / 2 + 1.3), b["cz"] + dz * (b["d"] / 2 + 1.3))
doors["park"] = (0.0, 4.5)
for name, (x, z) in doors.items():
    e = bpy.data.objects.new("door_" + name, None); e.empty_display_type = "ARROWS"; e.location = (x, -z, 0)
    bpy.context.collection.objects.link(e)

# bỏ tấm đường mẫu
for n in ("road-straight", "road-crossroad"):
    if n in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)

tot = 0
for ob in sorted(bpy.data.objects, key=lambda o: o.name):
    if ob.type == "MESH":
        tot += len(ob.data.polygons)
        print(f"{ob.name:20s} polys={len(ob.data.polygons):5d} mats={len(ob.data.materials)}")
print("TOTAL polys", tot, "doors", {k: (round(v[0], 1), round(v[1], 1)) for k, v in doors.items()})
