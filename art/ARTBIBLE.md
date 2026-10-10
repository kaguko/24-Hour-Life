# Art bible — 24-Hour Life (3D)

Phong cách: low-poly stylized, màu phẳng ấm và hơi pastel, chibi (đầu ≈ thân). Mọi mô hình dùng **bảng màu 12 màu** `pal_01…pal_12`
(xem `art/artbible.png`) cộng vài vật liệu đặc biệt phát sáng (`mat_window`, `mat_lamp`, `mat_neon`).

| Vật liệu | Hex | Dùng cho |
|---|---|---|
| pal_01 | `#F2994A` | Năng lượng (cam) |
| pal_02 | `#5B9BD5` | Tinh thần (xanh dương) |
| pal_03 | `#8E6FD1` | Ý chí (tím) |
| pal_04 | `#F4D35E` | Dopamine (vàng) |
| pal_05 | `#EF7BA1` | Kết nối (hồng) |
| pal_06 | `#6BBF7A` | Tài chính (xanh lá) |
| pal_07 | `#F6EBD9` | Tường kem, chữ biển hiệu |
| pal_08 | `#B98558` | Gỗ |
| pal_09 | `#D1604D` | Gạch đỏ |
| pal_10 | `#4FB3A9` | Xanh ngọc |
| pal_11 | `#4A5568` | Đá phiến (mái, viền, chân tường) |
| pal_12 | `#BFE3F2` | Trời / kính |

Quy tắc kỹ thuật
- Đơn vị mét, +Y lên khi export glTF (Blender Z-up, bật `export_yup`). Origin đặt ở chân.
- Nhân vật cao khoảng 1.1 m trong thành phố (client tự scale theo bounding box); đường rộng 2 m, toà nhà cao 4.5–10 m (tỉ lệ diorama).
- Mỗi toà nhà là một mesh nhiều vật liệu (`building_<id>`), cửa là Empty `door_<id>` (xem `city_nav.json`).
- Cửa sổ dùng `mat_window` phát sáng: client đổi `emissiveIntensity` theo giờ ngày/đêm.
- Export có Draco (`KHR_draco_mesh_compression`) cho mô hình lớn (city, room); prop nhỏ không nén. Client dùng DRACOLoader với decoder cục bộ `/draco/`.
- Ngân sách: mỗi file < 500 KB, cả `public/models` < 6 MB.

Ảnh tham chiếu: `art/artbible.png` (bảng màu + nhân vật Kenney làm chuẩn tỉ lệ), `art/city_preview.png`, `art/room_preview.png`, `art/props_preview.png`.
