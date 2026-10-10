# 5 con vật meme low-poly dựng bằng bmesh + bảng màu pal_* (xem ARTBIBLE.md), chạy qua blender MCP (execute_blender_code).
# Mỗi con là một root empty "animal_<kind>" (chân chạm z=0, mặt hướng -Y của Blender = +Z của three.js) cùng các bộ phận
# đặt tên cố định để client làm hoạt hình bằng cách xoay/nhún từng bộ phận (không dùng armature):
#   body, head, ear_l, ear_r, tail, wing_l, wing_r, leg_l, leg_r, yuzu (con nào không có thì bỏ qua)
# Mỗi bộ phận có gốc (origin) ở khớp xoay nên xoay quanh gốc là đúng.
# Export từng con (chọn root + con cháu, use_selection=True) vào apps/web/public/models/animals/<kind>.glb (không Draco).
import bpy, bmesh, math
from mathutils import Vector, Matrix

for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)

def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hex_rgba(h):
    return (srgb_to_lin(int(h[0:2], 16)), srgb_to_lin(int(h[2:4], 16)), srgb_to_lin(int(h[4:6], 16)), 1.0)
PAL = {"pal_01": "F2994A", "pal_02": "5B9BD5", "pal_03": "8E6FD1", "pal_04": "F4D35E", "pal_05": "EF7BA1", "pal_06": "6BBF7A",
       "pal_07": "F6EBD9", "pal_08": "B98558", "pal_09": "D1604D", "pal_10": "4FB3A9", "pal_11": "4A5568", "pal_12": "BFE3F2"}
for n, h in PAL.items():
    m = bpy.data.materials.get(n) or bpy.data.materials.new(n); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = hex_rgba(h); b.inputs["Roughness"].default_value = 0.9; b.inputs["Metallic"].default_value = 0.0
    m.diffuse_color = hex_rgba(h)

# ---------- helper hình khối (toạ độ Blender: x phải, y phía sau, z lên; mặt trước là -y) ----------
def _tag(verts, mi):
    for f in {f for v in verts for f in v.link_faces}: f.material_index = mi
def box(bm, sx, sy, sz, cx, cy, cz, mi, rx=0.0, ry=0.0, rz=0.0):
    vs = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    rot = Matrix.Rotation(rz, 3, 'Z') @ Matrix.Rotation(ry, 3, 'Y') @ Matrix.Rotation(rx, 3, 'X')
    for v in vs:
        p = rot @ Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz)); v.co = Vector((p.x + cx, p.y + cy, p.z + cz))
    _tag(vs, mi)
def cone(bm, r1, r2, h, cx, cy, cz, mi, segs=8, rx=0.0, ry=0.0):
    vs = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r1, radius2=r2, depth=h)["verts"]
    rot = Matrix.Rotation(ry, 3, 'Y') @ Matrix.Rotation(rx, 3, 'X')
    for v in vs:
        p = rot @ v.co; v.co = Vector((p.x + cx, p.y + cy, p.z + cz))
    _tag(vs, mi)
def ico(bm, r, cx, cy, cz, mi, sx=1.0, sy=1.0, sz=1.0, sub=2):
    vs = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)["verts"]
    for v in vs: v.co = Vector((v.co.x * sx + cx, v.co.y * sy + cy, v.co.z * sz + cz))
    _tag(vs, mi)

def new_root(kind):
    root = bpy.data.objects.new("animal_" + kind, None)
    bpy.context.collection.objects.link(root)
    return root

def part(root, name, pivot, mats, build):
    """Một bộ phận: lưới dựng bởi build(bm) với toạ độ TƯƠNG ĐỐI so với pivot; đặt tại pivot (toạ độ root)."""
    bm = bmesh.new(); build(bm)
    me = bpy.data.meshes.new(root.name + "_" + name); bm.to_mesh(me); bm.free()
    for mn in mats: me.materials.append(bpy.data.materials[mn])
    for p in me.polygons: p.use_smooth = False
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.parent = root
    ob.location = pivot
    return ob

def eyes(bm, y, z, dx, size, mi, tilt=0.0, flat=1.0):
    for s in (-1, 1):
        box(bm, size, size * 0.5, size * flat, s * dx, y, z, mi, ry=s * tilt)

# ---------- 1. Mèo Cáu: mèo cam ngồi, lông mày cau ----------
def make_cat():
    root = new_root("cat")
    def body(bm):
        ico(bm, 0.27, 0, 0.03, 0.27, 0, 1.0, 1.05, 1.0)            # thân tròn
        ico(bm, 0.17, 0, -0.17, 0.22, 1, 1.0, 0.7, 1.0)             # ngực kem
        for s in (-1, 1):
            box(bm, 0.09, 0.14, 0.07, s * 0.1, -0.2, 0.04, 1)        # hai chân trước kem
            box(bm, 0.11, 0.18, 0.09, s * 0.19, 0.05, 0.06, 0)       # chân sau
        for i, z in enumerate((0.38, 0.28, 0.18)):
            box(bm, 0.5 - i * 0.05, 0.03, 0.035, 0, 0.27 - i * 0.02, z + 0.03, 2)  # sọc nâu trên lưng
    part(root, "body", (0, 0, 0), ["pal_01", "pal_07", "pal_08"], body)
    def head(bm):
        ico(bm, 0.2, 0, 0, 0, 0, 1.15, 1.0, 0.9)
        ico(bm, 0.095, 0, -0.14, -0.04, 1, 1.15, 0.8, 0.8)          # mõm kem
        box(bm, 0.045, 0.03, 0.03, 0, -0.205, -0.01, 2)               # mũi hồng/nâu
        for s in (-1, 1):
            box(bm, 0.07, 0.035, 0.04, s * 0.095, -0.18, 0.05, 3, ry=s * -0.45)   # mắt xếch, cau có
            box(bm, 0.1, 0.02, 0.02, s * 0.098, -0.19, 0.115, 2, ry=s * -0.55)   # lông mày cau
    part(root, "head", (0, -0.1, 0.52), ["pal_01", "pal_07", "pal_05", "pal_11"], head)
    for name, s in (("ear_l", -1), ("ear_r", 1)):
        part(root, name, (s * 0.12, -0.1, 0.7), ["pal_01", "pal_05"],
             lambda bm, s=s: (cone(bm, 0.075, 0.0, 0.14, 0, 0, 0.06, 0, 4), cone(bm, 0.04, 0.0, 0.1, 0, -0.03, 0.05, 1, 4)))
    def tail(bm):
        cone(bm, 0.045, 0.04, 0.2, 0, 0.1, 0.04, 0, 8, rx=math.radians(80))
        cone(bm, 0.04, 0.035, 0.18, 0, 0.22, 0.14, 0, 8, rx=math.radians(25))
        ico(bm, 0.05, 0, 0.26, 0.25, 2, 1, 1, 1, 1)
    part(root, "tail", (0, 0.25, 0.1), ["pal_01", "pal_07", "pal_08"], tail)
    return root

# ---------- 2. Capybara Chill: thân dài, mắt lim dim, quả quýt trên đầu ----------
def make_capybara():
    root = new_root("capybara")
    def body(bm):
        ico(bm, 0.36, 0, 0.12, 0.4, 0, 0.85, 1.55, 0.95)
        for sx in (-1, 1):
            for fy in (-0.28, 0.4):
                box(bm, 0.14, 0.17, 0.2, sx * 0.2, fy, 0.1, 0)
                box(bm, 0.15, 0.2, 0.04, sx * 0.2, fy - 0.01, 0.02, 1)  # bàn chân sậm
        box(bm, 0.2, 0.08, 0.1, 0, 0.72, 0.28, 0)                        # mông/đuôi cụt
    part(root, "body", (0, 0, 0), ["pal_08", "pal_11"], body)
    def head(bm):
        box(bm, 0.36, 0.36, 0.32, 0, -0.06, 0, 0)
        box(bm, 0.38, 0.14, 0.2, 0, -0.26, -0.08, 0)                     # mõm vuông
        box(bm, 0.22, 0.04, 0.09, 0, -0.34, -0.03, 1)                    # mũi đen bự
        for s in (-1, 1):
            box(bm, 0.075, 0.025, 0.02, s * 0.12, -0.24, 0.08, 1)         # mắt lim dim (một đường kẻ)
            box(bm, 0.095, 0.02, 0.02, s * 0.12, -0.245, 0.115, 0, rz=0.0)  # mí mắt trĩu
            box(bm, 0.07, 0.07, 0.06, s * 0.16, 0.05, 0.19, 0)            # tai tròn nhỏ
    part(root, "head", (0, -0.62, 0.55), ["pal_08", "pal_11"], head)
    def yuzu(bm):
        ico(bm, 0.085, 0, 0, 0.085, 0, 1, 1, 0.9)
        cone(bm, 0.015, 0.01, 0.04, 0, 0, 0.17, 1, 5)
    part(root, "yuzu", (0, -0.62, 0.71), ["pal_04", "pal_06"], yuzu)
    return root

# ---------- 3. Vịt Quạc: vịt vàng béo, mỏ dẹt ----------
def make_duck():
    root = new_root("duck")
    def body(bm):
        ico(bm, 0.3, 0, 0.04, 0.3, 0, 1.0, 1.25, 0.85)
        for s in (-1, 1):
            box(bm, 0.11, 0.18, 0.04, s * 0.12, -0.05, 0.02, 1)          # bàn chân cam
        cone(bm, 0.1, 0.0, 0.2, 0, 0.34, 0.38, 0, 4, rx=math.radians(-70))  # đuôi vểnh
    part(root, "body", (0, 0, 0), ["pal_04", "pal_01"], body)
    def head(bm):
        ico(bm, 0.2, 0, 0, 0, 0, 1.0, 1.0, 1.0)
        box(bm, 0.2, 0.17, 0.05, 0, -0.22, -0.04, 1)                     # mỏ trên
        box(bm, 0.18, 0.13, 0.03, 0, -0.2, -0.09, 1)                     # mỏ dưới
        eyes(bm, -0.16, 0.06, 0.09, 0.05, 2)
    part(root, "head", (0, -0.12, 0.62), ["pal_04", "pal_01", "pal_11"], head)
    for name, s in (("wing_l", -1), ("wing_r", 1)):
        part(root, name, (s * 0.28, 0.0, 0.38), ["pal_04"],
             lambda bm, s=s: ico(bm, 0.13, s * 0.03, 0.08, -0.05, 0, 0.35, 1.0, 0.7, 1))
    return root

# ---------- 4. Cheems: shiba má phính ----------
def make_shiba():
    root = new_root("shiba")
    def body(bm):
        ico(bm, 0.27, 0, 0.05, 0.42, 0, 0.8, 1.35, 0.85)
        ico(bm, 0.2, 0, -0.14, 0.34, 1, 0.9, 0.9, 0.8)                   # ngực kem
        for sx in (-1, 1):
            for fy in (-0.25, 0.3):
                box(bm, 0.11, 0.13, 0.3, sx * 0.12, fy, 0.15, 0)
                box(bm, 0.115, 0.15, 0.06, sx * 0.12, fy - 0.01, 0.03, 1)  # tất kem
    part(root, "body", (0, 0, 0), ["pal_01", "pal_07"], body)
    def head(bm):
        ico(bm, 0.22, 0, 0, 0, 0, 1.2, 1.0, 1.0)                         # đầu bự
        for s in (-1, 1):
            ico(bm, 0.12, s * 0.15, -0.1, -0.07, 1, 1.0, 1.0, 1.0, 1)    # má phính kem
        ico(bm, 0.1, 0, -0.18, -0.06, 1, 1.0, 0.8, 0.8)                  # mõm kem
        box(bm, 0.07, 0.04, 0.05, 0, -0.26, -0.03, 2)                     # mũi đen
        for s in (-1, 1):
            box(bm, 0.075, 0.02, 0.022, s * 0.1, -0.2, 0.06, 2, ry=s * 0.3)    # mắt hiền, hơi buồn kiểu Cheems
    part(root, "head", (0, -0.45, 0.68), ["pal_01", "pal_07", "pal_11"], head)
    for name, s in (("ear_l", -1), ("ear_r", 1)):
        part(root, name, (s * 0.15, -0.45, 0.86), ["pal_01", "pal_07"],
             lambda bm, s=s: (cone(bm, 0.09, 0.0, 0.17, 0, 0, 0.07, 0, 4), cone(bm, 0.05, 0.0, 0.12, 0, -0.03, 0.06, 1, 4)))
    def tail(bm):
        cone(bm, 0.05, 0.05, 0.16, 0, 0.05, 0.06, 0, 8, rx=math.radians(-40))
        ico(bm, 0.09, 0, 0.0, 0.18, 0, 1.0, 0.7, 1.0, 1)                  # đuôi cuộn kem
        ico(bm, 0.06, 0, 0.0, 0.2, 1, 1.0, 0.7, 1.0, 1)
    part(root, "tail", (0, 0.5, 0.45), ["pal_01", "pal_07"], tail)
    return root

# ---------- 5. Ếch Phèo: ếch xanh mắt lồi, miệng rộng ----------
def make_frog():
    root = new_root("frog")
    def body(bm):
        ico(bm, 0.28, 0, 0.0, 0.2, 0, 1.1, 1.1, 0.7)
        ico(bm, 0.2, 0, -0.1, 0.15, 1, 1.0, 0.9, 0.6, 1)                 # bụng kem
        for s in (-1, 1):
            box(bm, 0.1, 0.16, 0.05, s * 0.2, -0.22, 0.025, 0)           # chân trước
    part(root, "body", (0, 0, 0), ["pal_06", "pal_07"], body)
    def head(bm):
        ico(bm, 0.2, 0, 0, 0, 0, 1.25, 1.0, 0.7)
        box(bm, 0.36, 0.02, 0.025, 0, -0.19, -0.03, 2)                    # miệng rộng
        for s in (-1, 1):
            ico(bm, 0.09, s * 0.12, -0.02, 0.12, 0, 1, 1, 1, 1)           # mắt lồi
            ico(bm, 0.045, s * 0.12, -0.08, 0.14, 3, 1, 1, 1, 1)          # con ngươi
    part(root, "head", (0, -0.2, 0.3), ["pal_06", "pal_07", "pal_09", "pal_11"], head)
    for name, s in (("leg_l", -1), ("leg_r", 1)):
        part(root, name, (s * 0.24, 0.12, 0.12), ["pal_06"],
             lambda bm, s=s: (ico(bm, 0.1, 0, 0.05, 0.0, 0, 0.7, 1.4, 0.8, 1), box(bm, 0.08, 0.2, 0.04, s * 0.02, -0.08, -0.09, 0)))
    return root

animals = [("cat", make_cat), ("capybara", make_capybara), ("duck", make_duck), ("shiba", make_shiba), ("frog", make_frog)]
for i, (kind, fn) in enumerate(animals):
    r = fn(); r.location = (i * 1.6, 0, 0)

def tris(root):
    n = 0
    for c in root.children_recursive:
        if c.type == 'MESH': n += sum(len(p.vertices) - 2 for p in c.data.polygons)
    return n
for ob in bpy.data.objects:
    if ob.name.startswith("animal_"): print(ob.name, "tris", tris(ob), "parts", [c.name for c in ob.children])
