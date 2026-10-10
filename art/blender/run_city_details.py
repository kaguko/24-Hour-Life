# Chạy không giao diện:
#   blender -b --python art/blender/run_city_details.py -- [--export] [--preview DIR]
# Nhập các prop Kenney, chạy build_city_details.py, (tuỳ chọn) xuất GLB + city_details_obstacles.json, và render vài góc xem trước.
import bpy, os, sys, json, math
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODELS = os.path.join(ROOT, "apps", "web", "public", "models")

bpy.ops.wm.read_factory_settings(use_empty=True)
KEN = {
    "city-kit-roads/Models/GLB format": ["traffic-light", "road-sign-stop", "construction-cone", "construction-barrier", "dumpster"],
    "mini-arcade/Models/GLB format": ["vending-machine", "claw-machine", "arcade-machine"],
}
for folder, names in KEN.items():
    for n in names:
        bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "assets-raw", folder, n + ".glb"))

ns = {"__name__": "city_details"}
src = os.path.join(HERE, "build_city_details.py")
exec(compile(open(src, encoding="utf-8").read(), src, "exec"), ns)

if "--export" in ARGS:
    with open(os.path.join(HERE, "city_details_obstacles.json"), "w", encoding="utf-8") as f:
        json.dump({"_doc": "Vật cản cứng của lớp chi tiết (x, z, r) trong không gian three.js; gen_nav.py chặn ô đi bộ theo đây.",
                   "obstacles": ns["OBS"]}, f, separators=(",", ":"))

    def export(objs, name, draco=True):
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        path = os.path.join(MODELS, name)
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_draco_mesh_compression_enable=draco,
                                  export_draco_mesh_compression_level=7, export_cameras=False, export_lights=False, export_yup=True)
        print("EXPORT", name, os.path.getsize(path), "bytes")
    gen = [o for o in bpy.data.objects if o.get("cd_gen") and o.name != "city_backdrop"]
    export(gen, "city_details.glb")
    export([bpy.data.objects["city_backdrop"]], "city_backdrop.glb")

if "--preview" in ARGS:
    out = ARGS[ARGS.index("--preview") + 1]
    os.makedirs(out, exist_ok=True)
    # bối cảnh: thành phố gốc (chỉ để xem, không xuất)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, "city.glb"))
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    try: sc.render.engine = "BLENDER_EEVEE_NEXT"; sc.eevee.taa_render_samples = 24
    except Exception: sc.render.engine = "BLENDER_WORKBENCH"
    w = bpy.data.worlds.new("w"); w.use_nodes = True; sc.world = w
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.62, 0.8, 0.9, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.1
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3.2; sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 35; cam.data.clip_end = 600
    # Camera kiểu game: (x đích, z đích, yaw độ, khoảng cách, góc nhìn xuống) trong không gian three; Blender y = -z
    VIEWS = {
        "overview": (0, 0, 35, 78, 38),
        "park": (0, 0, 45, 21, 58),
        "cafe": (20, -13, 0, 15, 50), "school": (-20, -12.5, 0, 15, 50), "office": (0, -12.5, 0, 15, 50),
        "market": (-12.5, 0, 90, 15, 50), "gym": (12.5, 0, -90, 15, 50),
        "home": (-20, 13.5, 180, 15, 50), "bar": (0, 13.5, 180, 15, 50), "arcade": (20, 13.5, 180, 15, 50),
        "street": (9, 9, 225, 13, 45),
        "edge": (28, 12, 45, 34, 30),
    }
    pick = [a for a in ARGS if a.startswith("view=")]
    for name, (tx, tz, yaw, dist, pitch) in VIEWS.items():
        if pick and "view=" + name not in pick: continue
        yw, pt = math.radians(yaw), math.radians(pitch)
        tgt = (tx, -tz, 0.6)
        loc = (tx + math.sin(yw) * math.cos(pt) * dist, -(tz + math.cos(yw) * math.cos(pt) * dist), 0.6 + math.sin(pt) * dist)
        cam.location = loc
        d = Vector(tgt) - Vector(loc); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(out, name + ".png")
        bpy.ops.render.render(write_still=True)
        print("RENDER", sc.render.filepath)
