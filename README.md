# ⏳ Cuộc Sống 24 Giờ (24-Hour Life)

> **Game mô phỏng đưa ra quyết định thực tế về quản lý thời gian, năng lượng, tài chính và bẫy dopamine trong 24 giờ mỗi ngày.**

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)

---

## 🌟 Giới Thiệu Tổng Quan

**"Cuộc sống 24 giờ"** không phải là một trò chơi dạy đạo lý hay bắt bạn sống như một cỗ máy hoàn hảo. Trò chơi đặt bạn vào một mô phỏng thực tế: **Bạn có đúng 24 giờ mỗi ngày**, đối diện với các áp lực sinh hoạt, chi phí thuê nhà, công việc, các mối quan hệ xã hội và đặc biệt là **những cơn thèm dopamine ngắn hạn của bộ não**.

Mục tiêu của game là giúp người chơi tự nhận diện khoảnh khắc:  
> *"Ơ, mình vừa đưa ra một lựa chọn tưởng chừng nhỏ nhặt và vô hại, nhưng cái giá phải trả vào ngày mai lại lớn đến thế!"*

---

## 🧠 Thiết Kế Cốt Lõi (Core Mechanics)

### 1. Hệ thống 6 Chỉ số Đan xen
| Chỉ số | Vai trò & Ý nghĩa | Hậu quả khi cạn kiệt / vượt ngưỡng |
|---|---|---|
| **⚡ Năng Lượng** *(0–100%)* | Sức lực thể chất để hoạt động trong ngày | Khi $\le 10\%$: Kiệt sức hoàn toàn (Burnout). |
| **🧠 Tinh Thần** *(0–100%)* | Sức khỏe tâm lý, khả năng chịu đựng stress | Khi $\le 15\%$: Trầm cảm, lo âu, tê liệt quyết định. |
| **🛡️ Ý Chí** *(0–100%)* | **Cơ chế cốt lõi mới:** Sức kháng cự trước cám dỗ | Khi $< 35\%$: Kích hoạt hiệu ứng **Ảo giác Cám dỗ**! |
| **✨ Dopamine** *(0–100%)* | Mức độ hưng phấn và kích thích thần kinh | Nếu dồn quá cao (>80%): Gây **Dopamine Crash** vào sáng hôm sau. |
| **👥 Kết Nối** *(0–100%)* | Mối quan hệ với gia đình, bạn bè | Khi $< 25\%$: Sự cô đơn làm xói mòn tinh thần tự động mỗi ngày. |
| **💰 Tài Chính** *(nghìn VNĐ)* | Ngân sách sinh hoạt và chi trả các nhu cầu | Tự trừ tiền trọ **120k/ngày**. Nếu âm tiền: Khủng hoảng nợ nần. |

---

### 2. Cơ chế Đặc biệt: Ảo Giác khi Ý Chí Thấp (Low-Willpower Illusion)
- Trong đời thực, khi bạn mệt mỏi và cạn kiệt ý chí, não bộ sẽ tự động tìm **đường tắt dopamine**.
- **Trong game**: Khi chỉ số **Ý chí $< 35\%$**:
  - Các hành vi xấu (*Lướt TikTok, Cày game xuyên đêm, Gọi đồ ăn nhanh*) phát sáng viền hồng rực rỡ và hiển thị lượng Dopamine thưởng **phóng đại gấp đôi** (`+40 Dopamine tức thì!`).
  - Các hành vi tích cực (*Tập thể dục, Học kỹ năng mới, Nấu ăn dinh dưỡng*) bị mờ đi và bị phạt thêm **chi phí sức ì nội tâm** (-8 Ý chí phụ thu).

---

### 3. Hậu Quả Trễ Qua Đêm (Overnight Consequences)
- Hậu quả của các lựa chọn không chỉ xuất hiện tức thì mà **tích tụ qua đêm**:
  - **Nợ ngủ lũy kế (`Sleep Debt`)**: Ngủ dưới 7 tiếng/ngày khiến nợ ngủ dồn lại. Khi nợ ngủ $\ge 6\text{h}$, bạn thức dậy với hội chứng sương mù não (*Brain Fog*).
  - **Dopamine Crash**: Ngày hôm trước lướt mạng và kích thích quá độ thì sáng hôm sau tỉnh dậy trong trạng thái trống rỗng, vô vị và bồn chồn.
  - **Hé lộ quy luật ẩn (Ngày 3–5)**: Người chơi tự trải nghiệm và cảm nhận trước, sau đó game mới giải thích các bài học tâm lý học hành vi ở màn hình bình minh.

---

### 4. Phòng Thí Nghiệm Mô Phỏng 1000 Ván (`Simulation Bench`)
Game tích hợp sẵn công cụ mô phỏng chiến thuật tự động ngay trên giao diện:
- Cho phép chạy **100, 500 hoặc 1000 ván chơi** cho 5 phong cách sống:
  1. **Dopamine Chaser**: Ưu tiên lướt mạng, game, đồ ăn nhanh $\rightarrow$ Vui 1–2 ngày đầu, sau đó sụp đổ vào ngày 4–5.
  2. **Workaholic**: Cày tiền tối đa, ngủ 4–5 tiếng $\rightarrow$ Nhiều tiền nhưng sập vì Burnout.
  3. **Pure Sleeper**: Trốn tránh thực tế, chỉ ngủ và nằm $\rightarrow$ Phá sản vì không trả nổi tiền trọ.
  4. **Party Animal**: Tiệc tùng nhậu nhẹt $\rightarrow$ Kết nối cao nhưng cạn kiệt tài chính.
  5. **Balanced Realist**: Ngủ 8h, làm việc 4h, tập luyện và kết nối điều độ $\rightarrow$ Tỷ lệ sống sót cao nhất.

---

## 🚀 Cấu Trúc Mã Nguồn (Architecture)

Kiến trúc dự án tách biệt hoàn toàn giữa **bộ não (Logic thuần)** và **bề mặt (Giao diện React)**:

```
src/
├── core/                   # Logic thuần, 100% testable, không phụ thuộc UI
│   ├── stats.ts            # Định nghĩa 6 chỉ số, giới hạn, đánh giá trạng thái
│   ├── actions.ts          # 15 hành vi, chi phí ý chí, bẫy dopamine & sức ì
│   ├── consequence.ts      # Tính toán hậu quả trễ qua đêm, nợ ngủ, tiền trọ
│   ├── events.ts           # Sự kiện ngẫu nhiên & các lựa chọn đánh đổi
│   └── simulate.ts         # Script mô phỏng hàng loạt 1000 ván cho các chiến lược
│
├── ui/                     # Giao diện người dùng (React components)
│   ├── TopNav.tsx          # Thanh điều hướng 3 vùng chuẩn
│   ├── TimeTrack.tsx       # Thanh quỹ thời gian 24 giờ trong ngày
│   ├── StatsHUD.tsx        # Bảng đo 6 chỉ số phản hồi động
│   ├── ActionCard.tsx      # Thẻ hành vi (hiệu ứng ảo giác khi ý chí thấp)
│   ├── ActionGrid.tsx      # Lưới hành vi & bộ lọc danh mục
│   ├── MorningModal.tsx    # Hộp thoại bình minh & giải thích cơ chế ẩn
│   ├── EventModal.tsx      # Hộp thoại biến cố bất ngờ
│   ├── WeekReviewModal.tsx # Hộp thoại tổng kết tuần 7 ngày & câu hỏi phản tư
│   ├── SimulationBench.tsx # Bàn thí nghiệm mô phỏng thuật toán
│   └── GuideModal.tsx      # Hướng dẫn quy luật & triết lý thiết kế
│
├── lib/                    # Công cụ tiện ích
│   ├── sound.ts            # Web Audio API tạo âm thanh tổng hợp (zero external files)
│   └── storage.ts          # Quản lý tự động lưu/khôi phục localStorage
│
├── App.tsx                 # Điều phối trạng thái và vòng lặp trò chơi
└── main.tsx                # Entry point
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Thử

### Yêu Cầu Môi Trường
- **Node.js**: $\ge 18.0.0$
- **npm** hoặc **yarn** / **pnpm**

### Khởi Chạy Dự Án

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev
```

Mở trình duyệt tại địa chỉ: `http://localhost:3000`

### Kiểm Tra Build & Linting

```bash
# Kiểm tra TypeScript
npm run lint

# Build bản phát hành (Production)
npm run build
```

---

## 📋 Bản Đồ Tiến Độ (Roadmap)

Chi tiết tiến độ phát triển theo từng tuần, danh sách các đầu việc đã nghiệm thu và chỉ dẫn dành cho Agent được lưu trữ tại file **[`ROADMAP.md`](./ROADMAP.md)**:

- **Tuần 1 & 2**: Logic headless, 6 chỉ số, bẫy ý chí, mô phỏng thuật toán và UI vòng lặp 7 ngày `[ĐÃ HOÀN THÀNH]`.
- **Tuần 3**: Playtest với 5 người dùng thực tế & mở rộng biến cố `[ĐANG TRIỂN KHAI]`.
- **Tuần 4 – 6**: Tinh chỉnh cân bằng từ dữ liệu mô phỏng, âm thanh ambient, đo lường chỉ số D1/D7 và kế hoạch phát hành `[KẾ HOẠCH]`.

---

## 📄 Triết Lý Phát Triển (Zero Dark Patterns)
Dự án kiên quyết tuân thủ:
- **Không quảng cáo gây phiền toái** hoặc cơ chế "xem video để hồi năng lượng".
- **Không chuỗi đăng nhập vô nghĩa (streak)** để giữ chân ảo.
- **Không bảng xếp hạng ganh đua** làm lệch lạc thông điệp về sự cân bằng cá nhân.
- Mọi dữ liệu được lưu cục bộ an toàn trên thiết bị của người chơi thông qua `localStorage`.
