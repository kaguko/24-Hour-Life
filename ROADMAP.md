# 🗺️ BẢN ĐỒ TIẾN ĐỘ & LỘ TRÌNH DỰ ÁN: "CUỘC SỐNG 24 GIỜ"
> **File định hướng dành cho Developer & Agent:** Bản đồ theo dõi tiến độ tổng thể, trạng thái các tính năng đã làm, cấu trúc mã nguồn và các bước tiếp theo để luôn bám sát mục tiêu.

---

## 📌 1. Nguyên Tắc Cốt Lõi: Clean Architecture Lite
1. **Domain logic KHÔNG import UI, KHÔNG import React, KHÔNG import localStorage**: Mọi quy luật toán học, cân bằng chỉ số nằm trong `src/domain/`.
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
- [x] **`src/domain/actions.ts`**:
  - [x] Hệ thống hành vi phân loại theo **Hai con đường Dopamine**:
    - **⚡ Dopamine Nhanh (Fast/Cheap)**: Doomscrolling TikTok, Cày game gây nghiện, Đồ ăn siêu ngon miệng, Mua sắm bốc đồng, Nhậu đêm, Caffeine ép tỉnh.
    - **🌱 Dopamine Chậm (Slow/Healthy)**: Chạy bộ, Đi bộ 20p phơi nắng, Vuốt ve thú cưng, Học kỹ năng & nhạc cụ, Trò chuyện sâu, Thiền định, Nấu ăn giàu Tyrosine, Nghe album nhạc, Dọn dẹp nhà cửa.
  - [x] **Cơ chế cốt lõi - Bẫy suy giảm ý chí**: Khi `willpower < 35`, hành vi Dopamine Nhanh phóng đại khoái cảm ảo, hành vi Dopamine Chậm bị não bộ phản kháng gây sức ì ý chí.
- [x] **`src/domain/consequence.ts`**:
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
- [x] **`src/domain/quotes.ts`**:
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

## 🗂️ 3. Sơ Đồ Cấu Trúc Mã Nguồn (Clean Architecture Lite)

```
/
├── ROADMAP.md                  # Bản đồ tiến độ và chỉ dẫn cho Agent (File này)
├── README.md                   # Tài liệu tổng quan dự án
├── metadata.json               # Metadata của applet
├── index.html                  # Entry HTML với thẻ meta SEO/Social
├── src/
│   ├── main.tsx                # Khởi chạy React app
│   ├── App.tsx                 # Vòng lặp điều phối chính (kết nối qua useGameAdapter)
│   ├── index.css               # Tailwind CSS v4 (@import "tailwindcss";)
│   │
│   ├── domain/                 # 🧠 DOMAIN PURE (Rule 1 & 2: NO React/UI/Storage, Primitive I/O)
│   │   ├── types.ts            # Kiểu dữ liệu primitive (PlayerStatsPrimitive, SoundCue, ...)
│   │   ├── stats.ts            # Toán học chỉ số, clampStats, evaluateLifeStatus
│   │   ├── actions.ts          # 15 hành vi, executeActionById(actionId, stats, hoursRemaining)
│   │   ├── consequence.ts      # processOvernightCycle(stats, actionIds, sleepDebt, day)
│   │   ├── events.ts           # rollDomainEvent, resolveDomainChoice
│   │   ├── simulate.ts         # runDomainSimulation (mô phỏng headless 1000 ván)
│   │   └── index.ts            # Facade tổng hợp API domain
│   │
│   ├── adapters/               # 🔌 ADAPTERS (Rule 3: Cắm UI, Storage, Audio vào Domain)
│   │   ├── storageAdapter.ts   # Cắm localStorage vào domain primitives
│   │   ├── audioAdapter.ts     # Cắm Web Audio API vào domain sound cues
│   │   └── useGameAdapter.ts   # React Hook Controller kết nối UI với Domain
│   │
│   └── ui/                     # 🖥️ VIEW LAYER: Giao diện thuần (nhận DTOs & callbacks)
│       ├── TopNav.tsx          # Thanh điều hướng chuẩn 3 vùng
│       ├── StatsHUD.tsx        # Bảng đo 6 chỉ số phản hồi động
│       ├── TimeTrack.tsx       # Thanh quỹ thời gian 24 giờ
│       ├── ActionCard.tsx      # Thẻ hành vi (ảo giác phóng đại dopamine khi ý chí thấp)
│       ├── ActionGrid.tsx      # Lưới hành vi & bộ lọc danh mục
│       ├── MorningModal.tsx    # Modal hậu quả trễ qua đêm & quy luật hé lộ
│       ├── EventModal.tsx      # Modal xử lý biến cố ngẫu nhiên
│       ├── WeekReviewModal.tsx # Modal tổng kết tuần 7 ngày & câu hỏi phản tư
│       ├── SimulationBench.tsx # Bàn thí nghiệm mô phỏng thuật toán trực tiếp
│       └── GuideModal.tsx      # Bảng giải thích quy luật & triết lý thiết kế
```

---

## 🧭 4. Chỉ Dẫn Dành Cho Agent Khi Làm Việc Tiếp Theo
1. **Kiểm tra file này trước tiên**: Bất cứ khi nào nhận yêu cầu mới, agent đọc `ROADMAP.md` để biết tính năng nào đã có và tính năng nào là bước kế tiếp.
2. **Tuân thủ Clean Architecture Lite**:
   - Mọi nghiệp vụ phải nằm trong `src/domain/`, KHÔNG import React/UI/localStorage vào domain.
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
