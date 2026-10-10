# 8 prop low-poly (<500 tris mỗi cái) dựng bằng bmesh + bảng màu pal_*, chạy qua blender MCP (execute_blender_code).
# Sau đó export từng prop (use_selection=True) vào apps/web/public/models/props/<tên>.glb (không Draco: mỗi file chỉ vài KB).
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
m = bpy.data.materials.get("mat_window") or bpy.data.materials.new("mat_window"); m.use_nodes = True
b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = hex_rgba("BFE3F2"); b.inputs["Emission Color"].default_value = hex_rgba("BFE3F2"); b.inputs["Emission Strength"].default_value = 1.0
b.inputs["Roughness"].default_value = 0.4

def _tag(verts, mi):
    for f in {f for v in verts for f in v.link_faces}: f.material_index = mi
def box(bm, sx, sy, sz, cx, cy, cz, mi, rx=0.0):
    vs = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    rot = Matrix.Rotation(rx, 3, 'X')
    for v in vs:
        p = rot @ Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz)); v.co = Vector((p.x + cx, p.y + cy, p.z + cz))
    _tag(vs, mi)
def cyl(bm, r1, r2, h, cx, cy, cz, mi, segs=10, rx=0.0):
    vs = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r1, radius2=r2, depth=h)["verts"]
    rot = Matrix.Rotation(rx, 3, 'X')
    for v in vs:
        p = rot @ v.co; v.co = Vector((p.x + cx, p.y + cy, p.z + cz))
    _tag(vs, mi)
def ico(bm, r, cx, cy, cz, mi, sx=1.0, sy=1.0, sz=1.0):
    vs = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)["verts"]
    for v in vs: v.co = Vector((v.co.x * sx + cx, v.co.y * sy + cy, v.co.z * sz + cz))
    _tag(vs, mi)
def finish(name, bm, mats, x):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for mn in mats: me.materials.append(bpy.data.materials[mn])
    ob = bpy.data.objects.new("prop_" + name, me); bpy.context.collection.objects.link(ob); ob.location = (x, 0, 0)
    return ob

props = []
bm = bmesh.new(); box(bm, 0.075, 0.155, 0.009, 0, 0, 0.0045, 0); box(bm, 0.064, 0.135, 0.002, 0, 0, 0.0095, 1); cyl(bm, 0.008, 0.008, 0.002, 0.02, 0.06, -0.001, 2, 8)
props.append(finish("phone", bm, ["pal_11", "pal_02", "pal_12"], 0))
bm = bmesh.new(); box(bm, 0.32, 0.22, 0.016, 0, 0, 0.008, 0); box(bm, 0.28, 0.14, 0.002, 0, -0.01, 0.017, 1)
box(bm, 0.32, 0.012, 0.21, 0, 0.115, 0.115, 0, rx=math.radians(-10)); box(bm, 0.29, 0.004, 0.18, 0, 0.108, 0.117, 3, rx=math.radians(-10))
props.append(finish("laptop", bm, ["pal_11", "pal_12", "pal_07", "mat_window"], 1))
bm = bmesh.new(); cyl(bm, 0.038, 0.03, 0.09, 0, 0, 0.045, 0, 12); cyl(bm, 0.033, 0.033, 0.002, 0, 0, 0.088, 1, 12); cyl(bm, 0.034, 0.031, 0.03, 0, 0, 0.045, 2, 12)
box(bm, 0.018, 0.006, 0.05, 0.046, 0, 0.05, 0)
props.append(finish("coffee", bm, ["pal_07", "pal_08", "pal_09"], 2))
bm = bmesh.new()
for sx in (-0.07, 0.07):
    box(bm, 0.09, 0.27, 0.03, sx, 0, 0.015, 0); box(bm, 0.085, 0.16, 0.06, sx, -0.02, 0.06, 1); box(bm, 0.088, 0.08, 0.045, sx, 0.08, 0.052, 0)
    box(bm, 0.07, 0.07, 0.07, sx, -0.1, 0.075, 1); box(bm, 0.05, 0.03, 0.012, sx, 0.0, 0.092, 0)
props.append(finish("sneakers", bm, ["pal_07", "pal_01"], 3))
bm = bmesh.new(); box(bm, 0.15, 0.215, 0.006, 0, 0, 0.003, 0); box(bm, 0.15, 0.215, 0.006, 0, 0, 0.037, 0); box(bm, 0.012, 0.215, 0.04, -0.069, 0, 0.02, 0); box(bm, 0.135, 0.205, 0.028, 0.004, 0, 0.02, 1)
box(bm, 0.07, 0.01, 0.002, 0, 0.05, 0.0405, 2)
props.append(finish("book", bm, ["pal_03", "pal_07", "pal_04"], 4))
bm = bmesh.new(); cyl(bm, 0.042, 0.038, 0.105, 0, 0, 0.0525, 0, 12); ico(bm, 0.04, 0, 0, 0.108, 1, 1.0, 1.0, 0.6); box(bm, 0.012, 0.03, 0.07, 0.05, 0, 0.055, 0); box(bm, 0.012, 0.03, 0.012, 0.046, 0, 0.09, 0); box(bm, 0.012, 0.03, 0.012, 0.046, 0, 0.02, 0)
props.append(finish("beer", bm, ["pal_04", "pal_07"], 5))
bm = bmesh.new(); box(bm, 0.15, 0.085, 0.028, 0, 0, 0.02, 0)
for sx in (-1, 1): cyl(bm, 0.025, 0.02, 0.03, sx * 0.07, -0.02, 0.016, 0, 8)
box(bm, 0.03, 0.01, 0.006, -0.045, 0.005, 0.037, 1); box(bm, 0.01, 0.03, 0.006, -0.045, 0.005, 0.037, 1)
for (bx, by, mi) in ((0.05, 0.015, 2), (0.07, 0.0, 3), (0.05, -0.015, 4), (0.03, 0.0, 2)): cyl(bm, 0.008, 0.008, 0.006, bx, by, 0.037, mi, 8)
props.append(finish("controller", bm, ["pal_11", "pal_07", "pal_09", "pal_10", "pal_04"], 6))
bm = bmesh.new(); ico(bm, 0.09, 0, 0, 0.1, 0, 1.0, 0.9, 1.05); ico(bm, 0.07, 0, 0.0, 0.215, 0)
for sx in (-1, 1):
    cyl(bm, 0.028, 0.0, 0.03, sx * 0.055, 0, 0.275, 1, 8); cyl(bm, 0.02, 0.02, 0.07, sx * 0.1, 0, 0.12, 0, 6); cyl(bm, 0.025, 0.025, 0.06, sx * 0.045, 0.01, 0.03, 0, 6)
box(bm, 0.05, 0.03, 0.035, 0, -0.062, 0.2, 2); box(bm, 0.018, 0.012, 0.014, 0, -0.082, 0.213, 3)
box(bm, 0.012, 0.01, 0.012, -0.025, -0.064, 0.235, 3); box(bm, 0.012, 0.01, 0.012, 0.025, -0.064, 0.235, 3)
props.append(finish("plush-pet", bm, ["pal_08", "pal_05", "pal_07", "pal_11"], 7))

for ob in props:
    print(ob.name, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons))
