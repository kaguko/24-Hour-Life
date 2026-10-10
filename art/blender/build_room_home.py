# Phòng trọ 4x3 m (diorama cắt mặt trước -y và bên phải +x) từ Kenney Furniture Kit, chạy qua blender MCP.
# Furniture dùng GLB trong apps/web/public/models/furniture; đặt theo bounding box, scale x2. Export:
#   bpy.ops.export_scene.gltf(filepath=".../room_home.glb", export_format='GLB', export_draco_mesh_compression_enable=True, ...)
# Tên node để client highlight: furn_bed, furn_desk, furn_computer, furn_chair, furn_shelf, furn_kitchen, furn_rug, furn_lamp, furn_plant;
# kính cửa sổ win_pane_* dùng mat_window (emissive) để client đổi độ sáng theo giờ ngày/đêm.
import bpy, bmesh, math
from mathutils import Vector

for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)

base = "E:/01_Projects/24H life/24-Hour-Life/apps/web/public/models/furniture/"
SCALE = 2.0

def import_root(filename):
    before = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=base + filename + ".glb")
    new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in before]
    return [o for o in new if o.parent is None][0], new

def world_bbox(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == "MESH" for c in o.bound_box]
    xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))

def place(root, objs, cx, cy, rot_deg=0.0, z0=0.0):
    root.scale = (SCALE, SCALE, SCALE)
    root.rotation_euler = (root.rotation_euler.x, root.rotation_euler.y, math.radians(rot_deg))
    bpy.context.view_layer.update()
    lo, hi = world_bbox(objs)
    root.location += Vector((cx - (lo[0] + hi[0]) / 2, cy - (lo[1] + hi[1]) / 2, z0 - lo[2]))
    bpy.context.view_layer.update()

def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hex_rgba(h):
    return (srgb_to_lin(int(h[0:2], 16)), srgb_to_lin(int(h[2:4], 16)), srgb_to_lin(int(h[4:6], 16)), 1.0)
def ensure_mat(name, hx, emit=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hex_rgba(hx); b.inputs["Roughness"].default_value = 0.9; b.inputs["Metallic"].default_value = 0.0
    if emit:
        b.inputs["Emission Color"].default_value = hex_rgba(emit); b.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = hex_rgba(hx)
for n, h in (("pal_07", "F6EBD9"), ("pal_08", "B98558"), ("pal_11", "4A5568"), ("pal_12", "BFE3F2")):
    ensure_mat(n, h)
ensure_mat("mat_window", "FFE9A8", emit="FFD479", strength=1.0)

def box_obj(name, sx, sy, sz, cx, cy, cz, mat):
    bm = bmesh.new()
    for v in bmesh.ops.create_cube(bm, size=1.0)["verts"]:
        v.co = Vector((v.co.x * sx + cx, v.co.y * sy + cy, v.co.z * sz + cz))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(bpy.data.materials[mat])
    bpy.context.collection.objects.link(bpy.data.objects.new(name, me))

box_obj("room_floor", 4.2, 3.2, 0.1, 0, 0, -0.05, "pal_08")
box_obj("room_wall_back", 4.2, 0.12, 2.6, 0, 1.56, 1.3, "pal_07")
box_obj("room_wall_left", 0.12, 3.2, 2.6, -2.06, 0, 1.3, "pal_07")
box_obj("room_skirt_back", 4.0, 0.04, 0.12, 0, 1.48, 0.06, "pal_11")
box_obj("room_skirt_left", 0.04, 3.0, 0.12, -1.98, 0, 0.06, "pal_11")
box_obj("win_frame_back", 1.2, 0.05, 1.0, 0.35, 1.49, 1.55, "pal_08")
box_obj("win_pane_back", 1.0, 0.04, 0.8, 0.35, 1.47, 1.55, "mat_window")
box_obj("win_frame_left", 0.05, 1.2, 1.0, -1.99, -0.35, 1.55, "pal_08")
box_obj("win_pane_left", 0.04, 1.0, 0.8, -1.97, -0.35, 1.55, "mat_window")

items = {}
def furn(file, name, cx, cy, rot=0.0, z0=0.0):
    root, objs = import_root(file); place(root, objs, cx, cy, rot, z0); root.name = name; items[name] = (root, objs)
furn("bedSingle", "furn_bed", -1.2, 0.3, 0.0)
furn("desk", "furn_desk", 0.35, 1.1, 0.0)
desk_top = world_bbox(items["furn_desk"][1])[1][2]
furn("computerScreen", "furn_computer", 0.35, 1.15, 0.0, z0=desk_top)
furn("chairDesk", "furn_chair", 0.35, 0.45, 180.0)
furn("bookcaseOpen", "furn_shelf", 1.55, 1.2, 0.0)
furn("kitchenStove", "furn_kitchen", -1.6, -1.0, 90.0)
furn("rugRound", "furn_rug", 0.3, -0.35, 0.0)
furn("lampRoundFloor", "furn_lamp", -0.35, 1.3, 0.0)
furn("pottedPlant", "furn_plant", 1.7, -1.1, 0.0)
