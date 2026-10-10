# Dựng asset bằng Blender MCP

Các script chạy qua công cụ `execute_blender_code` của blender MCP (Blender 4.2, sandbox chỉ cho `bpy`, `bmesh`, `math`, `random`, `mathutils`).

| Script | Sinh ra | Ghi chú |
|---|---|---|
| `city_layout.json` | — | Nguồn duy nhất bố cục thành phố (toạ độ three.js) |
| `build_city.py` | `public/models/city.glb` | Cần import `road-straight.glb`, `road-crossroad.glb` (Kenney City Kit Roads, giải nén vào `assets-raw/city-kit-roads`) và tạo bảng màu `pal_*` trước (xem `ARTBIBLE.md`) |
| `gen_nav.py` | `public/models/city_nav.json` | `python art/blender/gen_nav.py`: lưới đi bộ 1 m + toạ độ cửa; kiểm tra mọi cửa tới được từ nhà |
| `build_room_home.py` | `public/models/room_home.glb` | Từ Kenney Furniture Kit |
| `build_city_details.py` + `run_city_details.py` | `public/models/city_details.glb`, `city_backdrop.glb`, `city_details_obstacles.json` | Lớp chi tiết cho thành phố multiplayer, chạy **không giao diện**: `blender -b --python art/blender/run_city_details.py -- --export` (thêm `--preview <thư mục> [view=park ...]` để render góc xem trước kiểu camera game). Gồm: công viên (ao, hoa, xích đu, cầu trượt, bàn picnic, xe đồ ăn, bục của Blob — linh vật nói câu triết lý, client đặt sticker lơ lửng đúng toạ độ polar(335°, 5) = `world/mascot.ts`), phố (vạch qua đường, đèn giao thông + biển dừng Kenney, biển tên đường, trạm xe buýt, hộp thư, vòi cứu hoả, thùng rác, xe đỗ), đồ riêng từng toà nhà (bàn ghế quán cà phê, thùng hàng chợ, xà đơn gym, hàng rào nhà, dây đèn quán bar, máy gắp thú/arcade/bán hàng Kenney...), chi tiết mái `building_<id>__roof` (máy lạnh, pin mặt trời, biển neon, chong chóng; mờ + bấm chọn cùng toà nhà), hàng rào viền, và nền xa (đường kéo dài, khối nhà, cây, đồi). Chạy xong chạy lại `gen_nav.py` để chặn ô đi bộ theo vật cản. Client tải tuỳ chọn: thiếu file thì thành phố vẫn chạy |
| `build_animals.py` | `public/models/animals/<kind>.glb` | 5 con vật meme (mèo cáu, capybara, vịt, shiba Cheems, ếch), mỗi con < 600 tris. Bộ phận đặt tên `body, head, ear_l, ear_r, tail, wing_l, wing_r, leg_l, leg_r, yuzu` (gốc ở khớp xoay, có thể có hậu tố `.001`); client làm hoạt hình bằng cách xoay từng bộ phận. Xem trước: `art/animals_preview.png` |
| `build_props.py` | `public/models/props/*.glb` | 8 prop < 500 tris, export từng cái bằng `use_selection=True` |

Export mô hình lớn: `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB', export_draco_mesh_compression_enable=True,
export_draco_mesh_compression_level=7, export_cameras=False, export_lights=False, export_yup=True)`.

Nhân vật không dựng lại: dùng 12 GLB Kenney Mini Characters đã có sẵn rig và 32 clip (idle, walk, sprint, sit, die, interact-*, holding-*, emote-*…),
ánh xạ tên hoạt hình của game sang clip trong client (`animMap`).
