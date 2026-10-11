# 🗺️ BẢN ĐỒ TIẾN ĐỘ & LỘ TRÌNH DỰ ÁN: "CUỘC SỐNG 24 GIỜ"
> **File định hướng dành cho Developer & Agent:** Bản đồ theo dõi tiến độ tổng thể, trạng thái các tính năng đã làm, cấu trúc mã nguồn và các bước tiếp theo để luôn bám sát mục tiêu.

---

## 📌 1. Nguyên Tắc Cốt Lõi: Clean Architecture Lite
1. **Domain logic KHÔNG import UI, KHÔNG import React, KHÔNG import localStorage**: Mọi quy luật toán học, cân bằng chỉ số nằm trong `packages/domain/src/`.
2. **Domain chỉ nhận input primitive, trả về output primitive**: Các hàm nhận `string`, `number`, `boolean`, trả về plain DTOs hoặc primitives.
3. **UI + Storage là "adapter" cắm vào domain**: Giao diện (`src/ui/`) và Bộ nhớ (`src/adapters/storageAdapter.ts`), Âm thanh (`src/adapters/audioAdapter.ts`) cắm vào Domain thông qua Controller Hook (`src/adapters/useGameAdapter.ts`).
4. **Kiểm chứng "có vui không" trước, kiếm tiền sau.**
5. **Không dùng cơ chế giữ chân kiểu mạng xã hội** (streak, ads đổi năng lượng, leaderboard).

---

## 📊 2. Bản Đồ Tiến Độ Chi Tiết (Milestone Roadmap)

```
[ Tuần 1: Logic Headless ] ───▶ [ Tuần 2: UI & Vòng Lặp 7 Ngày ] ───▶ [ Tuần 3: Playtest 5 Người ] ───▶ [ Tuần 4 - 6: Ra Mắt ]
        ✅ HOÀN THÀNH                        ✅ HOÀN THÀNH                       ⏳ BƯỚC TIẾP THEO                   📅 KẾ HOẠCH
```

### ✅ TUẦN 1: Logic Headless & Thuật Toán Mô Phỏng (ĐÃ HOÀN THÀNH)
- [x] **Setup dự án**: Vite + React 19 + TypeScript + Tailwind CSS v4.
- [x] **`src/core/stats.ts`**:
  - [x] 6 chỉ số: `dopamine`, `energy`, `mental`, `social`, `money`, và **`willpower`** (Ý chí).
  - [x] Bộ đánh giá trạng thái người chơi: *Cân bằng (thriving), Ổn định (stable), Căng thẳng (stressed), Kiệt quệ (burnout), Phá sản (bankrupt)*.
  - [x] Chi phí sinh hoạt cố định: Trừ tiền trọ 120k VNĐ/ngày.
- [x] **`packages/domain/src/actions.ts`**:
  - [x] Hệ thống hành vi phân loại theo **Hai con đường Dopamine**:
    - **⚡ Dopamine Nhanh (Fast/Cheap)**: Doomscrolling TikTok, Cày game gây nghiện, Đồ ăn siêu ngon miệng, Mua sắm bốc đồng, Nhậu đêm, Caffeine ép tỉnh.
    - **🌱 Dopamine Chậm (Slow/Healthy)**: Chạy bộ, Đi bộ 20p phơi nắng, Vuốt ve thú cưng, Học kỹ năng & nhạc cụ, Trò chuyện sâu, Thiền định, Nấu ăn giàu Tyrosine, Nghe album nhạc, Dọn dẹp nhà cửa.
  - [x] **Cơ chế cốt lõi - Bẫy suy giảm ý chí**: Khi `willpower < 35`, hành vi Dopamine Nhanh phóng đại khoái cảm ảo, hành vi Dopamine Chậm bị não bộ phản kháng gây sức ì ý chí.
- [x] **`packages/domain/src/consequence.ts`**:
  - [x] Tính toán hậu quả trễ qua đêm: Nợ ngủ (`Sleep Debt`), Cơn sụp đổ Dopamine Nhanh (`Fast Dopamine Crash`), Tích lũy Dopamine Chậm (`Slow Dopamine Consolidation`), Cô lập xã hội, Áp lực nợ nần.
  - [x] Hé lộ các quy luật khoa học thần kinh ẩn sau ngày 2–5.
- [x] **`src/core/events.ts`**:
  - [x] 6 biến cố bất ngờ với các nhánh lựa chọn đánh đổi thời gian và tiền bạc.
- [x] **`src/core/simulate.ts`**:
  - [x] Động cơ mô phỏng hàng loạt 100 - 1000 ván chơi với 5 chiến lược chuẩn:
    1. *Dopamine Chaser* (Nghiện kích thích)
    2. *Workaholic* (Cuồng công việc)
    3. *Pure Sleeper* (Trốn tránh thực tế)
    4. *Party Animal* (Tiệc tùng)
    5. *Balanced Realist* (Cân bằng có kỷ luật)
  - [x] **Tiêu chí nghiệm thu Tuần 1 ĐÃ ĐẠT:** Không chiến lược cực đoan nào thắng áp đảo. *Dopamine Chaser* sụp đổ vào ngày 4–5 dù rất vui ở 1–2 ngày đầu.

---

### ✅ TUẦN 2: UI Tối Giản & Vòng Lặp 7 Ngày Hoàn Chỉnh (ĐÃ HOÀN THÀNH)
- [x] **`src/ui/TimeTrack.tsx`**:
  - [x] Thanh thời gian 24 giờ trực quan hóa các block hành vi theo màu sắc.
  - [x] Hiển thị số giờ đã dùng và số giờ tự do còn lại. Nút chủ động kết thúc ngày.
- [x] **`src/ui/StatsHUD.tsx`**:
  - [x] Hiển thị 6 thanh đo trực quan, tự đổi màu và gắn cờ cảnh báo khi chạm ngưỡng nguy hiểm.
- [x] **`src/ui/ActionCard.tsx` & `ActionGrid.tsx`**:
  - [x] Hiệu ứng thị giác khi ý chí thấp: Viền phát sáng rực rỡ, badge bùng nổ của hành vi cám dỗ.
  - [x] Bộ lọc theo danh mục (Tất cả, Nghỉ ngơi, Công việc, Rèn luyện, Kết nối, Cám dỗ).
- [x] **`src/ui/MorningModal.tsx`**:
  - [x] Báo cáo hậu quả trễ qua đêm mỗi sáng (trừ tiền trọ, nợ ngủ, dopamine crash, quy luật ẩn).
  - [x] **Đúc kết triết lý vĩ nhân**: Tự động trích dẫn danh ngôn tương ứng với chủ đề hành vi nổi bật trong ngày (Seneca, Marcus Aurelius, Lão Tử, Socrates, Khổng Tử, Mark Twain, v.v.).
- [x] **`packages/domain/src/quotes.ts`**:
  - [x] Kho tàng triết lý vĩ nhân phân loại theo 9 chủ đề tâm lý học hành vi.
- [x] **`src/ui/EventModal.tsx`**:
  - [x] Pop-up xử lý biến cố bất ngờ trong ngày với phản hồi chi tiết.
- [x] **`src/ui/WeekReviewModal.tsx`**:
  - [x] Tổng kết tròn 7 ngày với hiệu ứng pháo hoa chúc mừng.
  - [x] Tích hợp câu hỏi Playtest cốt lõi: *"Bạn muốn lướt MXH nhiều hơn hay ít hơn sau khi chơi?"*.
- [x] **`src/ui/SimulationBench.tsx`**:
  - [x] Bàn thí nghiệm mô phỏng tương tác: Cho phép chạy 100, 500, 1000 ván mô phỏng trực tiếp trên giao diện để kiểm tra tính cân bằng bất cứ lúc nào.
- [x] **`src/lib/sound.ts`**:
  - [x] Hệ thống âm thanh tổng hợp Web Audio API (Click, tiếng chuông dopamine, tiếng thở dài, tiếng chuyển đêm, tiếng chiến thắng). Không tải file ngoài.
- [x] **`src/lib/storage.ts`**:
  - [x] Tự động lưu/khôi phục trạng thái chơi từ `localStorage`.

---

### ⏳ TUẦN 3: Nội Dung Mở Rộng & Playtest (HIỆN TẠI / BƯỚC TIẾP THEO)
- [ ] **Mục tiêu chính**: Playtest với 5 người dùng thử nghiệm thực tế.
  - Cho người chơi tự thao tác trọn vẹn 1 tuần (7 ngày game).
  - Không hướng dẫn trước, quan sát điểm họ bị khựng lại hoặc khó hiểu.
  - Đặt câu hỏi phản tư cuối buổi: *"Bạn muốn lướt FB nhiều hơn hay ít hơn sau khi chơi?"*.
  - **Tiêu chí xong Tuần 3**: Ít nhất 3/5 người chơi hết 1 tuần game mà không cần nhắc nhở.
- [x] **Mở rộng nội dung** (ĐÃ LÀM):
  - [x] Thêm 6 biến cố: người yêu dỗi, hỏng laptop, trúng thưởng nhỏ, deadline cuối tuần, bạn rủ đi phượt, bữa cơm gia đình Chủ nhật.
  - [x] "Chu kỳ tuần": trường `onlyDays` trong `EventPrimitive`; Thứ 7/Chủ nhật có biến cố riêng; TopNav hiển thị thứ trong tuần (`getWeekdayLabel`).
  - [x] Dọn trùng lặp: gộp `choc_cho`→`tease_dog`, `practice_soft_skills`→`learn_soft_skills`.
  - [x] Chạy Mô phỏng 1000 lần (đã gồm biến cố) và sửa cân bằng — xem mục "Kết quả cân bằng" bên dưới.
  - [ ] Còn lại: playtest 5 người.

**Kết quả cân bằng (mô phỏng 1000 ván × 7 ngày, hiện tại):**

| Chiến lược | Kết cục | Ngày sụp TB |
|---|---|---|
| Dopamine Chaser | 100% kiệt quệ (tinh thần) | ~3.0 |
| Workaholic | 100% kiệt quệ (tinh thần) | ~4.5 |
| Pure Sleeper | ~99% kiệt quệ (vô cảm + ngủ quá nhiều) | ~4.1 |
| Party Animal | ~92% sống, ~8% phá sản; tiền cạn dần về ~500k | ~6.8 |
| Balanced | 100% sống | 7 |

Những thay đổi cân bằng đã áp dụng: chiến lược mô phỏng nay thực sự ngủ như mô tả (trước đó không ngủ → chết ngày 1); phạt **vô cảm (anhedonia)** khi dopamine nền < 25 mà không có hoạt động dopamine chậm; phạt **ngủ quá 9h/ngày**; **chợp mắt** giảm hiệu quả sau 4 lần/ngày; mô phỏng có biến cố. Cân nhắc sau playtest: chỉ số "Mục đích" riêng (chưa cần vì anhedonia đã xử lý Pure Sleeper); Chaser sụp ngày 3 (mục tiêu 4–5).

---

### ✅ GIAI ĐOẠN "KẾT CỤC & CHIA SẺ" (ĐÃ HOÀN THÀNH)
Mục tiêu: mỗi ván kết thúc bằng một khoảnh khắc đáng khoe, không dùng cơ chế giữ chân kiểu mạng xã hội (không streak/leaderboard/ads).
- [x] **`domain/ending.ts`** (v2): kết cục = kiểu chơi chủ đạo × sống sót/gục ngã → ~20 kết cục (Nô Lệ Dopamine, Tín Đồ Flash Sale, Cỗ Máy Kiệt Sức, Mọt Sách Quá Tải, Học Giả Kiên Định, Cầu Nối Của Mọi Người…). Mô phỏng người chơi pha trộn ra 17 kết cục khác nhau (trước đó ~8, và 40–50% là "Chọc chó"). `domain/journey.ts` + biểu đồ **Hành trình 7 ngày** (thời gian mỗi ngày theo dopamine nhanh/chậm/công việc/nghỉ) trên màn kết quả và ảnh chia sẻ.
- [x] (cũ) 10 kết cục (Bậc Thầy Cân Bằng, Nô Lệ Dopamine, Cỗ Máy Kiệt Sức, Ẩn Sĩ Ngủ Đông, Linh Hồn Tiệc Tùng, Pha Lê Dễ Vỡ, Kẻ Sống Sót Trên Lằn Ranh, Chiến Binh Cày Cuốc, Người Bền Bỉ, Kẻ Thách Thức Loài Chó) + điểm 0–100; pure domain, có `buildShareText`.
- [x] **Luồng kết thúc ván**: gục giữa chừng (kiệt quệ/phá sản) hoặc đủ 7 ngày đều ra `EndingModal`; trạng thái `finished` + `history` lưu qua reload. Bỏ nút "Tiếp tục tuần 2" (trước đây kẹt ở ngày 7).
- [x] **`adapters/shareAdapter.ts`**: vẽ ảnh 1080×1350 bằng Canvas, Web Share API trên mobile, tải ảnh + chép nội dung trên desktop. Không tracking, không server.
- [x] **`IntroModal`** cho lần chơi đầu (hiểu game trong 30 giây).
- [x] **SEO/OG**: `public/og.png`, favicon, thẻ OG/Twitter, canonical; `vite.config.ts` tự điền URL tuyệt đối từ `VITE_SITE_URL` hoặc `VERCEL_PROJECT_PRODUCTION_URL`.
- [x] Dọn gói/file không dùng (`express`, `dotenv`, `@google/genai`, `motion`, `lib/sound.ts`, `lib/storage.ts`).
- [x] **Nhân vật (Kenney Mini Characters, CC0)**: người chơi chọn 1 trong 12 nhân vật ở màn giới thiệu; hiện ở thanh trên, thẻ kết cục và ảnh chia sẻ (mỗi ảnh khác nhau → dễ khoe). Mô hình 3D được render sang PNG 192px (`public/avatars/`, ~320KB tổng). Nguồn: `CREDITS.md`.
- [x] **Âm thanh thật (Kenney CC0)**: 8 cue (cám dỗ, lành mạnh, bấm nút, thở dài, qua đêm, biến cố, thắng, thất bại) từ Interface Sounds + Music Jingles, MP3 tổng 42KB; âm tổng hợp giữ làm dự phòng. Chưa có nhạc nền loop - jingle chỉ là stinger ngắn.
- [x] **Phòng 3D (three.js, tải lười)**: căn phòng arcade từ Kenney Mini Arcade; nhân vật đã chọn đi tới đúng máy theo hành vi (game → máy arcade, đồ ăn → máy bán hàng, mua sắm → máy gắp, nhậu → máy nhảy, tập → bóng rổ, làm việc → quầy, ngủ → nằm xuống); phòng sáng/tối theo giờ và năng lượng, nháy hồng khi dopamine > 75, nhân vật xám khi tinh thần thấp. Bố cục 2 cột trên desktop, phòng dính trên cùng ở mobile. Bundle chính 110KB gzip; cảnh 3D (156KB gzip) tải riêng. Đồ thị hành vi → máy nằm ở `lib/roomStations.ts`.
- [x] Kiểm thử UI tự động bằng Playwright (Edge headless): intro → chơi → kết cục → chia sẻ → reload → chơi lại, cả desktop và mobile.

### ✅ CHIỀU SÂU GIAI ĐOẠN 1: TÍNH CÁCH & CƠN THÈM (ĐÃ HOÀN THÀNH)
- [x] **`domain/traits.ts`**: 8 nét tính cách (Cú đêm, Chim sớm, Dễ bị cuốn, Kỷ luật thép, Hướng nội, Hướng ngoại, Cày cuốc, Hay lo), mỗi nét có mặt lợi + mặt hại; mỗi ván bốc 2 nét không mâu thuẫn (`pickTraitIds`), lưu trong `PlayerState.traitIds`. Áp lên chỉ số hành vi qua `applyTraits` (gọi cuối `executeActionById`, tham số `traitIds` tùy chọn nên không có tính cách = hành vi cũ).
- [x] **`domain/craving.ts`**: cơn thèm = mặt tối của thói quen. Thú vui nhanh đã lặp ≥2 ngày liền mà hôm nay chưa làm sẽ réo gọi, làm cám dỗ xâm nhập (`intrusion.ts`) tìm đến cả khi ý chí 45–65; tính cách đổi độ mạnh (`intrusionMult`, `cravingMult`).
- [x] Giao diện: `TraitsPanel` (tính cách + cơn thèm hôm nay). Ván lưu cũ không có `traitIds` thì chơi như luật cũ.
- [x] Mô phỏng: `sim.ts <id> <runs> traits` bốc tính cách ngẫu nhiên mỗi ván. 1000 ván: Chaser 0%, Workaholic ~4%, Sleeper ~1%, Party ~91%, Balanced 100% sống: cân bằng giữ nguyên.
- [ ] Giai đoạn 2: chuỗi cốt truyện nhiều ngày & mục tiêu dài hạn. Giai đoạn 3: nhà & nội thất (đồ tạo bằng TRELLIS.2 → Blender → GLB).

### ✅ CHIỀU SÂU GIAI ĐOẠN 2: MẠCH TRUYỆN NHIỀU NGÀY (ĐÃ HOÀN THÀNH)
- [x] **`domain/story.ts`**: 4 mạch × 3 chương (Người bạn cũ, Dự án riêng, Cơ thể lên tiếng, Chủ trọ), mỗi ván bốc 2 mạch (`pickStoryIds`). Chương sau đổi nội dung và lựa chọn theo nhật ký `PlayerState.storyLog`; chương 3 rẽ nhánh thành 3 kết cục/mạch, mỗi kết cục có phần kết riêng. Chương xuất hiện như một `EventPrimitive` có id `story:<beatId>`.
- [x] Lịch: tối đa 1 chương/ngày, chỉ khi đã làm ≥3h trong ngày, ưu tiên hơn sự kiện ngẫu nhiên (`rollDayEvents` → `dueStoryEvent`, không dùng rng). Chương `minDay` 2/4/6 nên đủ 3 chương trong 7 ngày kể cả khi bị lệch ngày.
- [x] Giao diện: `StoryPanel` (tiến độ chương), nhãn "Cốt truyện" + emoji mạch trên `EventModal`, mục "Chuyện đời bạn" (phần kết các mạch) ở `EndingModal`.
- [x] Test duyệt toàn bộ đường đi của từng mạch (mọi chương dựng được, mọi kết cục tới được và có phần kết) + chạy trọn 7 ngày với lựa chọn ngẫu nhiên. Ván lưu cũ không có `storyIds` thì không có truyện.
- [ ] Chưa làm: mạch truyện đổi tiền phòng thật (hiện chỉ là chi một lần), cần Giai đoạn 3 (nhà); kết cục chính chưa phân nhánh theo truyện.

### ✅ CHIỀU SÂU GIAI ĐOẠN 3A: CỬA HÀNG NỘI THẤT (ĐÃ HOÀN THÀNH)
- [x] **`domain/shop.ts`**: 7 món (Gối êm, Đèn bàn học, Kệ sách, Tivi & tủ, Chậu cây nhỏ, Tủ lạnh nhỏ, Bàn trà), mỗi món đổi cách chỉ số vận hành (`applyItems`, gọi cuối `executeActionById`, tham số `itemIds` tùy chọn). Tổng giá 4.700k > tiền đầu ván 4.500k nên phải chọn; luôn giữ lại ≥500k (`SHOP_RESERVE`). Tivi có mặt hại (cám dỗ +20%), tủ lạnh giảm cám dỗ ăn vặt. `PlayerState.ownedItemIds`, `buyItem`.
- [x] Phòng 3D: `lib/roomItems.ts` (mô hình + toạ độ từng món, mô hình Kenney Furniture Kit trong `public/models/furniture/`), `RoomScene` thêm/bớt đồ theo `ownedItemIds` (có thể gồm nhiều mô hình ghép). `ShopPanel` (nút "🛒 Cửa hàng nội thất"). Ván cũ không có `ownedItemIds` thì chưa có đồ.
- [x] Cân bằng: `sim.ts <id> <runs> traits items` cho có đủ mọi món từ đầu (trường hợp tốt nhất, bỏ qua giá). 1000 ván: Chaser 0%, Workaholic 3%, Sleeper 1%, Party ~90%, Balanced 100%: đồ không phá cân bằng.
- [ ] Giai đoạn 3B: đồ mới tạo bằng TRELLIS.2 → Blender → GLB (cho món Kenney không có). Chưa làm: đổi tiền phòng thật theo mạch Chủ trọ.

### ✅ CHIỀU SÂU GIAI ĐOẠN 4: TIỀN PHÒNG THẬT & KẾT CỤC THEO TRUYỆN (ĐÃ HOÀN THÀNH)
- [x] **Tiền phòng thật**: `processOvernightCycle` nhận `rentPerDay` (mặc định 120k). `endDay` trả `DAILY_RENT_COST + storyRentDelta(storyLog, day)`; mạch Chủ trọ đổi mức này: chấp nhận/không đóng trước **+18k/ngày**, thương lượng + đóng trước **+9k/ngày**, chuyển phòng mới **−12k/ngày**. Suy ra từ nhật ký truyện nên không lưu thêm trạng thái; báo cáo sáng (`rentPaid`) hiện đúng mức.
- [x] **Kết cục theo truyện**: mỗi phần kết có sắc thái `tone` (tốt / vừa / buồn). `evaluateEnding(history, stats, storyIds, storyLog)` cộng điểm (tốt +4, vừa +2, buồn 0, dang dở 0; tối đa 100) và gắn danh hiệu phụ (`🌟 Trọn Vẹn Từng Chương`, `🍂 Những Cánh Cửa Chưa Mở`, `🔇 Bận Đến Mức Quên Sống`). Kết cục chính (theo kiểu chơi) không đổi; không truyền truyện thì kết quả y như cũ. `EndingModal` hiện danh hiệu.
- [x] Quyết định: **bỏ giai đoạn 3B** (đồ tạo bằng TRELLIS.2) vì quota GPU miễn phí hết; cửa hàng giữ 7 món Kenney. Pipeline TRELLIS.2 → Blender → GLB đã chạy thành công với 1 món (giường, xem `CREDITS.md`) nếu muốn làm lại sau.

### ✅ SỬA LỖI: Sụp dopamine chỉ do dopamine NHANH
Trước đây luật qua đêm coi `dopamine ≥ 75` từ **bất kỳ nguồn nào** là "sụp dopamine nhanh", nên chơi toàn hành vi lành mạnh vẫn bị phạt oan và HUD báo "Nguy cơ sụp đổ". Nay `domain/dopamine.ts` (`summarizeFastDopamine`) chỉ tính dopamine thu được từ hành vi **nhanh** trong ngày (≥ 45 điểm hoặc ≥ 3.5 giờ); HUD và phòng 3D dùng cùng hàm này. Đã kiểm tra 6 kịch bản (kể cả ảnh chụp lỗi gốc) + trình duyệt; số liệu mô phỏng 5 chiến lược không đổi.

### 📅 TUẦN 4: Cân Bằng Dựa Trên Dữ Liệu & Nâng Cấp Âm Thanh
- [ ] Cân bằng lại thông số hành vi bằng cách chạy lại `simulate.ts` sau khi nhận phản hồi từ playtest.
- [ ] Bổ sung nhạc nền nhẹ (Ambient/Lo-fi CC0, có giấy phép rõ ràng).
- [ ] Đánh giá lại: Nếu người chơi thấy chán thì dừng lại sửa core loop, không thêm tính năng thừa.

---

### 📅 TUẦN 5 & 6: Ra Mắt & Đánh Giá Dữ Liệu D1/D7
- [ ] Hoàn thiện Landing page, OpenGraph preview image.
- [ ] Tích hợp công cụ đo lường nhẹ (PostHog hoặc tương đương) đo D1, D7 và điểm người chơi bỏ cuộc.
- [ ] Quyết định hướng kiếm tiền sau khi có dữ liệu D7 thực tế (chỉ cân nhắc ủng hộ tác giả / cosmetic nếu D7 tốt; sửa core loop nếu D7 kém).

---

## 🗂️ 3. Sơ Đồ Cấu Trúc Mã Nguồn (monorepo npm workspaces)

```
/
├── packages/domain/      # 🧠 @24h/domain: luật chơi thuần (NO React/UI/Storage/Math.random; rng được tiêm). build bằng tsc -> dist
│   └── src/              # actions, consequence, events, intrusion, goals, map, planner, simulate, gameState (PlayerState + applyAction/endDay/rollDayEvents),
│                         # jointActions + social (hành vi chung, áp lực đồng trang lứa), groupEvents (biến cố nhóm), simulateGroup (mô phỏng nhóm)
├── packages/protocol/    # @24h/protocol: hợp đồng client <-> server (tên message, giới hạn, kiểu payload, Anim, AVATAR_IDS)
├── apps/web/             # Vite + React 19 + three.js
│   ├── src/adapters/     # useGameAdapter (một người), audio, storage
│   ├── src/net/          # room.ts: kết nối Colyseus -> snapshot thuần cho React
│   ├── src/world/        # CityRenderer (three.js), nav.ts (A* trên city_nav.json), animMap.ts
│   ├── src/ui/           # giao diện một người; ui/multi/ = Lobby, RoomGame, CityStage
│   └── public/models/    # city.glb (Draco), city_nav.json, room_home.glb, props/, characters/ (Kenney)
├── apps/server/          # Colyseus 0.18: LifeRoom (planning -> night -> morning), engine, joint, limits, cors; Dockerfile, fly.toml
├── art/                  # art bible, ảnh xem trước, script Blender (art/blender)
├── docs/deploy-server.md # Docker / Fly.io / Railway / biến môi trường
└── vercel.json           # build web khi Root Directory là / (apps/web/vercel.json khi Root Directory = apps/web)
```

### ✅ GIAI ĐOẠN "PHÒNG CHUNG 2–8 NGƯỜI + THÀNH PHỐ 3D" (đã làm)
- **A**: rng tiêm vào domain; PlayerState + hàm thuần; npm workspaces (mô phỏng một người trùng khớp byte-by-byte trước/sau từng bước).
- **B**: server Colyseus authoritative (client chỉ gửi `action/move/chat/ready/joint/nudge`), vòng đời ngày, bot Balanced thay người rớt mạng sau 60s,
  6 hành vi chung + áp lực đồng trang lứa + động viên, biến cố nhóm, Docker/Fly, CORS allow-list, giới hạn chống lạm dụng.
- **C**: art bible 12 màu; thành phố 60x60m (8 địa điểm của `map.ts` + game center trang trí), phòng trọ, 8 prop; nhân vật tái dùng Kenney (đã có 32 clip).
- **D**: tab "Chơi cùng bạn": sảnh (mã 4 ký tự), cảnh 3D (đi bộ A*, xoay/zoom, ngày-đêm), danh sách người chơi, chat + bong bóng, rủ nhau, báo cáo sáng riêng + "Bạn bè hôm qua" (không xếp hạng), chế độ nhẹ.

### 📊 Cân bằng nhóm (đo bằng `runGroupSimulation`, 600–1000 ván, 4 người)
| Nhóm 4 người cùng chiến lược | Sống đủ 7 ngày | Ghi chú |
|---|---|---|
| Balanced | 100% | Kết nối ~100 (một mình ~68) |
| Party Animal | ~65% (một mình ~89%) | nhậu nhóm tốn hơn nhậu một mình, nhiều người thì càng nặng |
| Dopamine Chaser | ~17% (một mình 0%) | có bạn nên không còn bị cô lập, nhưng cả bàn cùng sa ngã |
| Workaholic / Pure Sleeper | ~3% / ~2% | |
| Bàn hỗn hợp (2 Balanced + Party + Chaser) | Party ~82%, Chaser ~95% | **bạn bè kéo nhau lên**: Chaser sống tốt hơn hẳn khi có người rủ làm việc lành mạnh |

Kết luận thật (không chỉnh số cho đẹp): chơi nhóm cho Kết nối cao hơn một mình; cả nhóm cám dỗ sụp nhanh hơn nhóm lành mạnh; bạn bè lành mạnh cứu người yếu hơn.
**Balanced vẫn sống ~100%** kể cả với biến cố nhóm: đó là tính chất của cân bằng một người (có một chiến lược giữ mọi chỉ số), muốn đổi phải đổi độ khó cốt lõi
nên chưa làm. Mục tiêu "Balanced không còn 100%" chưa đạt, ghi lại ở đây để playtest quyết định.

### ⏳ Còn lại / ý tưởng tiếp
- Playtest 2 buổi x 4 người (xem `PLAYTEST.md`, mục multiplayer), đo thời gian chờ nhau và việc hiểu hành vi chung.
- Sự kiện / cám dỗ xâm nhập / sự kiện lớn trong phòng nhiều người (domain đã có hàm thuần: `rollDayEvents`, `applyIntrusionAnswer`, `applyBigEventOutcome`).
- Nhiều phòng trên nhiều máy cần Redis presence/driver của Colyseus.

---

## 🧭 4. Chỉ Dẫn Dành Cho Agent Khi Làm Việc Tiếp Theo
1. **Kiểm tra file này trước tiên**: Bất cứ khi nào nhận yêu cầu mới, agent đọc `ROADMAP.md` để biết tính năng nào đã có và tính năng nào là bước kế tiếp.
2. **Tuân thủ Clean Architecture Lite**:
   - Mọi nghiệp vụ phải nằm trong `packages/domain/src/`, KHÔNG import React/UI/localStorage vào domain.
   - Domain chỉ nhận tham số primitive (`string`, `number`, `boolean`) và trả về primitive/plain DTOs.
   - Giao diện và Storage chỉ là Adapter thông qua `src/adapters/`.
3. **Không sửa số liệu bằng cảm giác**: Khi thay đổi chỉ số trong `domain/actions.ts` hoặc `domain/consequence.ts`, hãy chạy kiểm chứng qua tab **"Mô phỏng 1000 lần"** (`simulate.ts`) để bảo đảm tính cân bằng không bị vỡ.
4. **Không cài đặt thêm thư viện cồng kềnh**: Giữ phong cách Tailwind tinh gọn và chống "AI slop" theo hiến pháp `frontend-design`.

---

### ✅ MỞ RỘNG GAMEPLAY (đợt này)
- **Hành vi**: từ 23 lên 48 hành vi, có khung giờ / ngày / giới hạn mỗi ngày (`domain/actionsExtra.ts`, `domain/availability.ts`).
- **Tiến triển & thói quen**: 4 kỹ năng (Trí tuệ/Thể lực/Giao tiếp/Nghề nghiệp) lên cấp, mở khóa hành vi nâng cao; thói quen 3 ngày liên tiếp, "nhờn" với cám dỗ lặp lại (`domain/progression.ts`). Mọi thứ suy ra từ `history`, không cần đổi định dạng save.
- **Mục tiêu**: mỗi ván bốc 2/8 mục tiêu, tiến độ trực tiếp, tổng kết ở màn kết cục (`domain/goals.ts`).
- **Thành phố & di chuyển** (`domain/map.ts`, `domain/planner.ts`, `ui/CityMap.tsx`): 8 địa điểm (nhà, công ty, trường, quán cà phê, gym, công viên, siêu thị, quán nhậu), mỗi hành vi có địa điểm và giờ mở cửa riêng. Đổi địa điểm tốn 0.25–1.25 giờ đi đường (một "hành vi" di chuyển thật, có trên thanh thời gian), chút năng lượng, tiền, tinh thần. Mỗi sáng thức dậy ở nhà.
- **Sự kiện theo địa điểm** (`domain/placeEvents.ts`): 7 sự kiện trên đường (gặp bạn cũ, mưa, hàng rong, người hỏi đường, thủng lốp, mèo hoang, điện thoại rung) và 8 sự kiện tại địa điểm có NPC (bạn tập gym, barista, đồng nghiệp, giảng viên, người chạy cùng, siêu thị giảm giá, người lạ mời ly...).
- **Cân bằng mô phỏng sau khi có di chuyển** (1000 ván × 7 ngày): Chaser sập ~3.0 ngày, Workaholic ~4.6, Sleeper ~4.1, Party ~87% sống / 13% phá sản, Balanced 100% sống. Chiến lược mô phỏng đã cập nhật để tôn trọng giờ mở cửa và đi đường. Mô phỏng chưa gồm sự kiện theo địa điểm.

---

### ✅ LÀM CHO GAMEPLAY CÓ CĂNG THẲNG THẬT (đợt này)
Chẩn đoán sau playtest "chán": có một cách chơi tối ưu (Balanced sống 100%) và game chỉ *nói* về mất kiểm soát chứ không để người chơi *trải nghiệm* nó. Hai thay đổi:
- **Cám dỗ xâm nhập** (`domain/intrusion.ts`, `ui/IntrusionModal.tsx`): ý chí < 45 thì sau mỗi hành vi có xác suất (tới ~55%, cao hơn lúc khuya, tối đa 2 lần/ngày) bị điện thoại / game / đồ ăn / flash sale tìm đến. Cưỡng lại tốn ý chí (8, 12, 16... mỗi vòng một khó hơn); chiều theo thì mất giờ thật, video và game kéo thành vòng lặp "thêm một cái nữa" mà càng về sau càng khó dừng. Mỗi lần chiều là một hành vi trong lịch sử nên ảnh hưởng sụp dopamine nhanh, "nhờn", mục tiêu, kết cục. *Mô phỏng 1000 ván chưa tính cơ chế này.*
- **Sự kiện lớn của tuần** (`domain/bigEvents.ts`, `ui/BigEventPanel.tsx`, `ui/BigEventModal.tsx`): mỗi ván bốc 1/4 (kỳ thi, phỏng vấn, chốt dự án, đám cưới bạn thân) diễn ra Thứ Bảy 14:00. Độ khó thật là thông tin ẩn (chỉ có tin đồn từ ngày 3 và thanh chuẩn bị không lộ số). Kết quả phụ thuộc mức chuẩn bị cả tuần và thể trạng lúc đó (4 mức: xuất sắc / đạt / suýt soát / hỏng), có thưởng phạt và hiện ở màn kết cục. *Chưa cân bằng bằng người chơi thật.*

---

### ✅ VUI HƠN KHI CHƠI CÙNG BẠN (đợt này)
Chẩn đoán: chơi nhóm chỉ là bấm danh sách hành vi, thiếu thứ để *nghịch* cùng nhau.
- **5 con vật meme dựng bằng Blender** (`art/blender/build_animals.py` -> `public/models/animals/`): Mèo Cáu (45% cho vuốt ve, còn lại cào rồi chạy), Capybara Chill (luôn bình thản, quả quýt trên đầu), Vịt Quạc (bị chọc thì rượt), Cheems (shiba, hay ngại), Ếch Phèo (hay nhảy mất). Server quyết định phản ứng và vị trí (`apps/server/src/playground.ts`), mọi người cùng thấy.
- **Tương tác**: bấm con vật -> nhân vật đi tới -> Vuốt ve / Chọc. Bấm bạn bè để chọn rồi dùng biểu cảm: vẫy, đập tay, ôm, nhảy, hò reo (đập tay/ôm cần đứng gần, hai người cùng diễn).
- **Ảnh hưởng chỉ số rất nhẹ và có trần**: tối đa 8 lần có thưởng mỗi ngày mỗi người (Tinh thần / Kết nối / Ý chí vài điểm), ôm/đập tay cùng một người chỉ thưởng một lần mỗi ngày. Mô phỏng chưa tính cơ chế này; nếu playtest thấy bị "cày" thì hạ `MAX_PLAY_REWARDS_PER_DAY` trong `engine.ts`.
- Kiểm thử: `.claude/skills/run-24-hour-life/playground.mjs` (2 trình duyệt: ôm nhau, chọc mèo, mèo chạy ở cả hai máy).
- Tòa nhà: nhân vật biến mất khi làm hành vi tại cửa, bảng hiệu trên cửa liệt kê ai đang ở trong (chưa có nội thất bên trong).

