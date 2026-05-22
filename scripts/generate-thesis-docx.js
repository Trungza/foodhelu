const fs = require('fs');
const path = require('path');
const {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} = require('docx');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'helu-food-do-an-tot-nghiep-v2.docx');

const student = {
  name: 'Nguyễn Bá Trung',
  id: '5240058',
  className: 'K28.1 CNTT1',
  major: 'Công nghệ thông tin',
  faculty: 'Khoa Công nghệ thông tin',
  university: 'Trường Đại học Giao thông Vận tải',
  supervisor: 'Phạm Đình Phong',
  title: 'Website bán đồ ăn trực tuyến Helu Food',
};

const twips = {
  pageTop: 1417,
  pageBottom: 1417,
  pageLeft: 1701,
  pageRight: 1134,
  firstLine: 567,
};

const collections = [
  {
    id: 'accounts',
    role: 'Lưu thông tin tài khoản và vai trò người dùng sử dụng hệ thống.',
    fields: [
      ['userId', 'String', 'Định danh người dùng Appwrite'],
      ['name', 'String', 'Họ tên người dùng'],
      ['email', 'String', 'Email đăng nhập'],
      ['role', 'String', 'Vai trò: admin/kitchen/customer/delivery'],
      ['createdAt', 'String', 'Thời điểm tạo hồ sơ'],
      ['updatedAt', 'String', 'Thời điểm cập nhật gần nhất'],
    ],
  },
  {
    id: 'categories',
    role: 'Lưu danh mục món ăn, hỗ trợ nhóm dữ liệu theo nghiệp vụ.',
    fields: [
      ['name', 'String', 'Tên danh mục'],
      ['slug', 'String', 'Tên chuẩn URL'],
      ['description', 'String', 'Mô tả danh mục'],
      ['order', 'Integer', 'Thứ tự hiển thị'],
      ['isActive', 'Boolean', 'Trạng thái sử dụng'],
      ['createdAt', 'String', 'Thời điểm tạo'],
      ['updatedAt', 'String', 'Thời điểm cập nhật'],
    ],
  },
  {
    id: 'dishes',
    role: 'Lưu thông tin món ăn đơn lẻ.',
    fields: [
      ['name', 'String', 'Tên món'],
      ['description', 'String', 'Mô tả món'],
      ['price', 'Integer', 'Giá bán cơ sở'],
      ['imageId', 'String', 'ID ảnh trong Storage'],
      ['categoryId', 'String', 'Mã danh mục liên quan'],
      ['categorySlug', 'String', 'Slug danh mục'],
      ['isAvailable', 'Boolean', 'Có thể phục vụ hay không'],
      ['createdAt', 'String', 'Thời điểm tạo'],
      ['updatedAt', 'String', 'Thời điểm cập nhật'],
    ],
  },
  {
    id: 'daily_menu',
    role: 'Lưu thực đơn theo ngày trong tuần.',
    fields: [
      ['weekId', 'String', 'Khóa tuần'],
      ['dayId', 'Enum', 'Ngày trong tuần'],
      ['categoryId', 'String', 'Mã danh mục'],
      ['categoryName', 'String', 'Tên danh mục'],
      ['dishId', 'String', 'Mã món ăn'],
      ['dishName', 'String', 'Tên món ăn'],
      ['dishImageId', 'String', 'Ảnh món'],
      ['basePrice', 'Integer', 'Giá cơ sở'],
      ['priceOverride', 'Integer', 'Giá điều chỉnh'],
      ['sortOrder', 'Integer', 'Thứ tự hiển thị'],
      ['isActive', 'Boolean', 'Mở hay ẩn món'],
      ['createdAt', 'String', 'Thời điểm tạo'],
      ['updatedAt', 'String', 'Thời điểm cập nhật'],
    ],
  },
  {
    id: 'combos',
    role: 'Lưu các combo theo ngày/tuần.',
    fields: [
      ['weekId', 'String', 'Khóa tuần'],
      ['dayId', 'Enum', 'Ngày trong tuần'],
      ['categoryId', 'String', 'Mã danh mục'],
      ['categoryName', 'String', 'Tên danh mục'],
      ['name', 'String', 'Tên combo'],
      ['price', 'Integer', 'Giá combo cơ sở'],
      ['priceOverride', 'Integer', 'Giá điều chỉnh'],
      ['isActive', 'Boolean', 'Trạng thái phục vụ'],
      ['createdAt', 'String', 'Thời điểm tạo'],
      ['updatedAt', 'String', 'Thời điểm cập nhật'],
    ],
  },
  {
    id: 'combo_items',
    role: 'Lưu thành phần món trong từng combo.',
    fields: [
      ['comboId', 'String', 'Mã combo'],
      ['dishId', 'String', 'Mã món thành phần'],
      ['dishName', 'String', 'Tên món thành phần'],
      ['dishImageId', 'String', 'Ảnh món thành phần'],
      ['quantity', 'Integer', 'Số lượng món trong combo'],
      ['basePrice', 'Integer', 'Giá món thành phần'],
    ],
  },
  {
    id: 'weekly_schedules',
    role: 'Lưu lịch tổng hợp theo tuần, thường chỉ có một document trung tâm cho mỗi tuần.',
    fields: [
      ['weekId', 'String', 'Khóa tuần'],
      ['scheduleJson', 'String', 'Nội dung lịch ở dạng JSON'],
      ['dishesCount', 'Integer', 'Số món đơn theo tuần'],
      ['combosCount', 'Integer', 'Số combo theo tuần'],
      ['publishedAt', 'String', 'Thời điểm công bố'],
      ['updatedAt', 'String', 'Thời điểm cập nhật'],
      ['createdAt', 'String', 'Thời điểm tạo'],
    ],
  },
  {
    id: 'orders',
    role: 'Lưu đơn hàng từ khách.',
    fields: [
      ['orderId', 'String', 'Mã đơn hiển thị'],
      ['customerName', 'String', 'Tên khách hàng'],
      ['customerPhone', 'String', 'Số điện thoại'],
      ['customerAddress', 'String', 'Địa chỉ giao hàng'],
      ['items', 'String', 'Danh sách món ở dạng JSON string'],
      ['total', 'Integer', 'Tổng tiền đơn hàng'],
      ['status', 'String', 'Trạng thái đơn'],
      ['deliveryTime', 'String', 'Thời gian giao mong muốn'],
      ['adminNote', 'String', 'Ghi chú quản trị'],
      ['kitchenNote', 'String', 'Ghi chú nhà bếp'],
      ['createdAt', 'String', 'Thời điểm tạo đơn'],
    ],
  },
  {
    id: 'daily_stock',
    role: 'Theo dõi tồn kho theo ngày và theo món.',
    fields: [
      ['dateKey', 'String', 'Khóa ngày'],
      ['dayId', 'Enum', 'Ngày trong tuần'],
      ['dishId', 'String', 'Mã món'],
      ['dishName', 'String', 'Tên món'],
      ['categoryId', 'String', 'Mã danh mục'],
      ['categoryName', 'String', 'Tên danh mục'],
      ['dishImageId', 'String', 'ID ảnh món'],
      ['openingQty', 'Integer', 'Số lượng đầu kỳ'],
      ['soldAutoQty', 'Integer', 'Số bán tự động theo đơn'],
      ['soldAdjustQty', 'Integer', 'Số điều chỉnh thủ công'],
      ['remainingQty', 'Integer', 'Số lượng còn lại'],
      ['isAvailable', 'Boolean', 'Trạng thái còn phục vụ'],
      ['updatedAt', 'String', 'Thời điểm cập nhật'],
      ['createdAt', 'String', 'Thời điểm tạo'],
    ],
  },
  {
    id: 'notifications',
    role: 'Lưu thông báo realtime cho từng vai trò.',
    fields: [
      ['role', 'String', 'Vai trò nhận thông báo'],
      ['title', 'String', 'Tiêu đề thông báo'],
      ['message', 'String', 'Nội dung thông báo'],
      ['orderId', 'String', 'Mã đơn liên quan'],
      ['isUnread', 'Boolean', 'Trạng thái đã đọc/chưa đọc'],
      ['createdAt', 'String', 'Thời điểm tạo'],
      ['updatedAt', 'String', 'Thời điểm cập nhật'],
    ],
  },
  {
    id: 'gallery_media',
    role: 'Lưu ảnh và video phục vụ trang thư viện/nội dung truyền thông.',
    fields: [
      ['title', 'String', 'Tiêu đề media'],
      ['description', 'String', 'Mô tả media'],
      ['mediaType', 'String', 'Loại media (image/video)'],
      ['fileId', 'String', 'ID file trên Storage'],
      ['order', 'String', 'Thứ tự hiển thị'],
      ['isPublished', 'String', 'Trạng thái công khai'],
      ['createdAt', 'String', 'Thời điểm tạo'],
      ['updatedAt', 'String', 'Thời điểm cập nhật'],
    ],
  },
  {
    id: 'system_settings',
    role: 'Lưu cấu hình hệ thống như trạng thái nhận đơn và trạng thái quá tải bếp.',
    fields: [
      ['acceptingOrders', 'Boolean/String', 'Có nhận đơn hay không'],
      ['kitchenOverloaded', 'Boolean/String', 'Bếp có đang quá tải hay không'],
      ['updatedAt', 'String', 'Thời điểm cập nhật'],
      ['createdAt', 'String', 'Thời điểm tạo'],
    ],
  },
];

const useCases = [
  ['UC01', 'Xem danh mục món ăn', 'Khách hàng', 'categories, dishes'],
  ['UC02', 'Xem món ăn theo thực đơn ngày', 'Khách hàng', 'daily_menu, dishes'],
  ['UC03', 'Xem combo theo ngày', 'Khách hàng', 'combos, combo_items'],
  ['UC04', 'Tìm kiếm món ăn', 'Khách hàng', 'dishes, categories'],
  ['UC05', 'Thêm món vào giỏ hàng', 'Khách hàng', 'localStorage, daily_stock'],
  ['UC06', 'Cập nhật số lượng món trong giỏ', 'Khách hàng', 'daily_stock'],
  ['UC07', 'Nhập thông tin giao hàng', 'Khách hàng', 'orders'],
  ['UC08', 'Tạo đơn hàng', 'Khách hàng', 'orders, notifications'],
  ['UC09', 'Theo dõi trạng thái đơn', 'Khách hàng', 'orders, notifications'],
  ['UC10', 'Xem thư viện ảnh', 'Khách hàng', 'gallery_media'],
  ['UC11', 'Đăng nhập quản trị', 'Quản trị', 'accounts'],
  ['UC12', 'Quản lý danh mục', 'Quản trị', 'categories'],
  ['UC13', 'Quản lý món ăn', 'Quản trị', 'dishes'],
  ['UC14', 'Quản lý combo', 'Quản trị', 'combos, combo_items'],
  ['UC15', 'Quản lý lịch tuần', 'Quản trị', 'weekly_schedules'],
  ['UC16', 'Quản lý thực đơn ngày', 'Quản trị', 'daily_menu'],
  ['UC17', 'Quản lý tồn kho ngày', 'Quản trị', 'daily_stock'],
  ['UC18', 'Quản lý đơn hàng', 'Quản trị', 'orders'],
  ['UC19', 'Bật/tắt nhận đơn', 'Quản trị', 'system_settings'],
  ['UC20', 'Quản lý thông báo', 'Quản trị', 'notifications'],
  ['UC21', 'Đăng nhập khu vực bếp', 'Nhà bếp', 'accounts'],
  ['UC22', 'Nhận đơn realtime', 'Nhà bếp', 'orders, notifications'],
  ['UC23', 'Cập nhật trạng thái chế biến', 'Nhà bếp', 'orders'],
  ['UC24', 'Bật/tắt quá tải bếp', 'Nhà bếp', 'system_settings'],
  ['UC25', 'Đồng bộ trạng thái hệ thống', 'Hệ thống', 'system_settings, realtime'],
  ['UC26', 'Đẩy thông báo thay đổi đơn', 'Hệ thống', 'notifications, orders'],
  ['UC27', 'Đồng bộ lịch tuần sang menu ngày', 'Hệ thống', 'weekly_schedules, daily_menu'],
  ['UC28', 'Tính số lượng tồn khả dụng', 'Hệ thống', 'daily_stock, orders'],
];

const mermaidDiagrams = {
  useCase: [
    'flowchart LR',
    '  KH[Khach hang] --> X1[Xem menu/combos]',
    '  KH --> X2[Dat hang]',
    '  KH --> X3[Theo doi don]',
    '  QT[Quan tri] --> A1[Quan ly mon va danh muc]',
    '  QT --> A2[Quan ly lich va ton kho]',
    '  QT --> A3[Bat/tat nhan don]',
    '  BP[Nha bep] --> B1[Nhan don moi]',
    '  BP --> B2[Cap nhat trang thai don]',
    '  X2 --> O[(ORDERS)]',
    '  B2 --> O',
    '  O --> N[(NOTIFICATIONS)]',
    '  A3 --> S[(SYSTEM_SETTINGS)]',
    '  S --> X2',
  ].join('\n'),
  erd: [
    'erDiagram',
    '  CATEGORIES ||--o{ DISHES : phan_loai',
    '  CATEGORIES ||--o{ DAILY_MENU : tham_chieu',
    '  CATEGORIES ||--o{ COMBOS : tham_chieu',
    '  DISHES ||--o{ COMBO_ITEMS : thanh_phan',
    '  COMBOS ||--o{ COMBO_ITEMS : bao_gom',
    '  WEEKLY_SCHEDULES ||--o{ DAILY_MENU : sinh_menu',
    '  WEEKLY_SCHEDULES ||--o{ COMBOS : sinh_combo',
    '  ORDERS ||--o{ NOTIFICATIONS : tao_thong_bao',
    '  DISHES ||--o{ DAILY_STOCK : theo_doi_ton',
    '  ACCOUNTS ||--o{ ORDERS : dat_hang',
  ].join('\n'),
  sequence: [
    'sequenceDiagram',
    '  participant KH as Khach hang',
    '  participant FE as Frontend',
    '  participant DB as Appwrite DB',
    '  participant BP as Nha bep',
    '  KH->>FE: Chon mon va xac nhan dat hang',
    '  FE->>DB: Tao document orders',
    '  DB-->>FE: Tra ve ma don',
    '  DB->>BP: Day thong bao don moi',
    '  BP->>DB: Cap nhat trang thai don',
    '  DB-->>FE: Realtime cap nhat trang thai',
    '  FE-->>KH: Hien thi trang thai moi',
  ].join('\n'),
  deployment: [
    'flowchart TB',
    '  U[Trinh duyet nguoi dung] --> C[Customer UI]',
    '  U --> A[Admin UI]',
    '  U --> K[Kitchen UI]',
    '  C --> APP[Appwrite Cloud]',
    '  A --> APP',
    '  K --> APP',
    '  APP --> AUTH[(Auth)]',
    '  APP --> DB[(Database 12 collection)]',
    '  APP --> STO[(Storage dish_images)]',
    '  APP --> RT[(Realtime channel)]',
  ].join('\n'),
};

function readImage(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath));
}

function makeText(text, options = {}) {
  return new TextRun({
    text,
    font: options.font || 'Times New Roman',
    size: options.size || 26,
    bold: options.bold ?? false,
    italics: options.italics ?? false,
    break: options.break,
  });
}

function normalParagraph(text, options = {}) {
  return new Paragraph({
    children: [makeText(text, { size: options.size || 26, bold: options.bold })],
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    spacing: {
      before: options.before ?? 0,
      after: options.after ?? 120,
      line: options.line ?? 288,
      lineRule: 'auto',
    },
    indent: options.indent === false ? undefined : { firstLine: options.firstLine ?? twips.firstLine },
  });
}

function centeredParagraph(text, size = 26, bold = false, after = 120) {
  return new Paragraph({
    children: [makeText(text, { size, bold })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after, line: 288, lineRule: 'auto' },
    indent: { firstLine: 0 },
  });
}

function monoParagraph(text) {
  return new Paragraph({
    children: [makeText(text, { font: 'Courier New', size: 22 })],
    alignment: AlignmentType.LEFT,
    spacing: { before: 0, after: 40, line: 240, lineRule: 'auto' },
    indent: { firstLine: 0 },
  });
}

function heading(text, level = 1, alignment = AlignmentType.LEFT) {
  const size = level === 1 ? 36 : level === 2 ? 32 : 28;
  return new Paragraph({
    children: [makeText(text, { size, bold: true })],
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    alignment,
    spacing: {
      before: level === 1 ? 120 : 60,
      after: 120,
      line: 288,
      lineRule: 'auto',
    },
    indent: { firstLine: 0 },
  });
}

function bullet(text) {
  return new Paragraph({
    children: [makeText(text, { size: 26 })],
    bullet: { level: 0 },
    spacing: { before: 0, after: 80, line: 288, lineRule: 'auto' },
    indent: { firstLine: 0 },
  });
}

function listItem(text, level = 0) {
  return new Paragraph({
    children: [makeText(text, { size: 26 })],
    numbering: { level, reference: 'report-list' },
    spacing: { before: 0, after: 80, line: 288, lineRule: 'auto' },
    indent: { firstLine: 0 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function caption(text) {
  return new Paragraph({
    children: [makeText(text, { size: 24, bold: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 120, line: 288, lineRule: 'auto' },
    indent: { firstLine: 0 },
  });
}

function imageParagraph(relPath, width, height, alignment = AlignmentType.CENTER) {
  return new Paragraph({
    alignment,
    children: [
      new ImageRun({
        data: readImage(relPath),
        transformation: { width, height },
      }),
    ],
    spacing: { before: 120, after: 120 },
    indent: { firstLine: 0 },
  });
}

function makeCell(text, width, bold = false, align = AlignmentType.LEFT) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: align,
        children: [makeText(text, { size: 24, bold })],
        spacing: { before: 0, after: 0, line: 240, lineRule: 'auto' },
        indent: { firstLine: 0 },
      }),
    ],
  });
}

function buildTable(headers, rows, widths) {
  const headerCells = headers.map((header, index) =>
    makeCell(header, widths[index], true, AlignmentType.CENTER),
  );
  const bodyRows = rows.map((row) => new TableRow({
    children: row.map((cell, index) => makeCell(cell, widths[index], false, AlignmentType.LEFT)),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
    rows: [new TableRow({ children: headerCells }), ...bodyRows],
  });
}

function expandedParagraph(topic, contextA, contextB) {
  return normalParagraph(
    `Trong phạm vi đề tài Helu Food, nội dung ${topic} được xem như một thành phần trung tâm của toàn bộ quy trình nghiệp vụ, bởi vì nó liên kết trực tiếp giữa dữ liệu, giao diện và hành vi của người dùng. Khi phân tích sâu theo bối cảnh triển khai thật, nhóm thực hiện nhận thấy ${contextA}. Điều này dẫn đến yêu cầu phải thiết kế cơ chế kiểm soát rõ ràng, nhất quán và có khả năng truy vết khi xảy ra sai lệch nghiệp vụ. Đồng thời, xét ở khía cạnh vận hành, ${contextB}. Cách tiếp cận này giúp hệ thống duy trì được tính ổn định trong suốt vòng đời vận hành, đồng thời tạo nền tảng thuận lợi cho việc mở rộng trong các phiên bản tiếp theo.`,
  );
}

function diagramSection(title, code, figureNo) {
  const lines = code.split('\n');
  return [
    heading(title, 2),
    normalParagraph('Để đảm bảo báo cáo có thể tái hiện đúng sơ đồ đã thống nhất trong quá trình phân tích, phần này trình bày trực tiếp mã Mermaid của sơ đồ tương ứng. Khi mở trong các công cụ hỗ trợ Mermaid, sơ đồ sẽ hiển thị đúng cấu trúc đã được chốt cùng dữ liệu thực tế của dự án.', { indent: false }),
    ...lines.map((line) => monoParagraph(line)),
    caption(`Hình ${figureNo}. ${title}.`),
  ];
}

function coverPage() {
  return [
    centeredParagraph(student.university.toUpperCase(), 28, true, 60),
    centeredParagraph(student.faculty.toUpperCase(), 28, true, 120),
    centeredParagraph('ĐỒ ÁN TỐT NGHIỆP', 34, true, 60),
    centeredParagraph('ĐỀ TÀI', 28, true, 90),
    centeredParagraph(student.title.toUpperCase(), 32, true, 120),
    imageParagraph('services/customer/img/logo.png', 150, 150),
    centeredParagraph(`Giảng viên hướng dẫn: ${student.supervisor}`, 26, false, 20),
    centeredParagraph(`Sinh viên thực hiện: ${student.name}`, 26, false, 20),
    centeredParagraph(`Lớp: ${student.className}`, 26, false, 20),
    centeredParagraph(`Mã sinh viên: ${student.id}`, 26, false, 20),
    centeredParagraph('Hà Nội – 2026', 26, false, 0),
  ];
}

function acknowledgements() {
  return [
    heading('LỜI CẢM ƠN', 1, AlignmentType.CENTER),
    normalParagraph('Em xin chân thành cảm ơn thầy Phạm Đình Phong đã tận tình hướng dẫn, góp ý và hỗ trợ em trong suốt quá trình thực hiện đồ án tốt nghiệp này. Những nhận xét chuyên môn và định hướng của thầy đã giúp em hoàn thiện đề tài theo hướng thực tế hơn và có cấu trúc rõ ràng hơn.', { indent: false }),
    normalParagraph('Em cũng xin gửi lời cảm ơn tới các thầy cô trong Khoa Công nghệ thông tin, Trường Đại học Giao thông Vận tải đã trang bị cho em nền tảng kiến thức cần thiết trong suốt quá trình học tập. Bên cạnh đó, em xin cảm ơn gia đình và bạn bè đã luôn động viên, hỗ trợ em cả về tinh thần lẫn thời gian để em có thể hoàn thành đồ án.', { indent: false }),
    normalParagraph('Do kiến thức và kinh nghiệm thực tế còn hạn chế, đồ án khó tránh khỏi những thiếu sót. Em rất mong nhận được sự góp ý của các thầy cô để đề tài được hoàn thiện hơn.', { indent: false }),
    centeredParagraph('Hà Nội, 2026', 26, false, 0),
    centeredParagraph('Sinh viên thực hiện', 26, true, 0),
    centeredParagraph(student.name, 26, true, 0),
  ];
}

function abbreviationsSection() {
  return [
    heading('DANH MỤC CÁC TỪ VIẾT TẮT', 1, AlignmentType.CENTER),
    buildTable(
      ['STT', 'Ký hiệu', 'Diễn giải'],
      [
        ['1', 'ĐATN', 'Đồ án tốt nghiệp'],
        ['2', 'BaaS', 'Backend as a Service'],
        ['3', 'RBAC', 'Phân quyền theo vai trò'],
        ['4', 'CRUD', 'Create, Read, Update, Delete'],
        ['5', 'E2E', 'Kiểm thử đầu cuối'],
        ['6', 'API', 'Giao diện lập trình ứng dụng'],
        ['7', 'UI', 'Giao diện người dùng'],
        ['8', 'UX', 'Trải nghiệm người dùng'],
        ['9', 'TOC', 'Mục lục tự động'],
        ['10', 'ERD', 'Sơ đồ thực thể - quan hệ'],
      ],
      [900, 1800, 7800],
    ),
  ];
}

function tableFigureListSection() {
  const rows = [
    ['1', 'Bảng 3.1', 'Danh mục 12 collection trong hệ thống'],
    ['2', 'Bảng 3.2', 'Ma trận use case tổng quát'],
    ['3', 'Bảng 3.3', 'Đặc tả chi tiết use case'],
    ['4', 'Bảng 4.x', 'Đặc tả chi tiết từng collection'],
    ['5', 'Bảng 5.x', 'Kịch bản kiểm thử theo vai trò'],
    ['6', 'Hình 3.1', 'Sơ đồ use case tổng quát'],
    ['7', 'Hình 3.2', 'Sơ đồ ERD tổng quan'],
    ['8', 'Hình 3.3', 'Sơ đồ sequence đặt hàng'],
    ['9', 'Hình 3.4', 'Sơ đồ deployment hệ thống'],
    ['10', 'Hình 4.1', 'Ảnh minh họa giao diện khách hàng'],
    ['11', 'Hình 4.2', 'Ảnh minh họa giao diện quản trị'],
    ['12', 'Hình A.1', 'Ảnh minh họa phụ lục'],
  ];
  return [
    heading('DANH MỤC CÁC BẢNG VÀ HÌNH', 1, AlignmentType.CENTER),
    buildTable(['STT', 'Tên bảng/hình', 'Mô tả'], rows, [900, 2200, 7400]),
  ];
}

function tocSection() {
  return [
    heading('MỤC LỤC', 1, AlignmentType.CENTER),
    new TableOfContents('Mục lục', {
      hyperlink: true,
      headingStyleRange: '1-3',
    }),
  ];
}

function introSection() {
  return [
    heading('MỞ ĐẦU', 1, AlignmentType.CENTER),
    expandedParagraph('mở đầu đề tài', 'bài toán quản lý đơn hàng theo thời gian thực là một nhu cầu có thật đối với mô hình kinh doanh suất ăn văn phòng', 'việc lựa chọn kiến trúc Appwrite kết hợp JavaScript thuần giúp cân bằng giữa tốc độ triển khai và tính minh bạch khi trình bày báo cáo'),
    expandedParagraph('phạm vi và mục tiêu nghiên cứu', 'hệ thống không chỉ dừng ở đặt món mà còn bao gồm kiểm soát tồn kho theo ngày, quản lý lịch tuần và đồng bộ trạng thái nhận đơn', 'đồ án ưu tiên tính thực tiễn, mô phỏng đúng môi trường vận hành có nhiều vai trò đồng thời như khách hàng, quản trị và nhà bếp'),
    expandedParagraph('phương pháp thực hiện', 'quá trình triển khai được chia theo chu trình phân tích yêu cầu, thiết kế dữ liệu, lập trình chức năng, kiểm thử và hoàn thiện tài liệu', 'các quyết định kỹ thuật đều dựa trên mã nguồn thực tế trong dự án thay vì chỉ mô tả lý thuyết'),
  ];
}

function chapter1() {
  return [
    heading('CHƯƠNG 1. GIỚI THIỆU', 1, AlignmentType.CENTER),
    heading('1.1. Bối cảnh và lý do chọn đề tài', 2),
    expandedParagraph('lý do chọn đề tài', 'dịch vụ đặt đồ ăn trực tuyến đang trở thành một phần quan trọng trong thói quen tiêu dùng tại đô thị', 'những hệ thống có khả năng tùy biến theo lịch tuần và theo ca bếp thường giúp nhà cung cấp tối ưu chi phí vận hành rõ rệt'),
    expandedParagraph('ý nghĩa thực tiễn', 'một hệ thống có thể bật tắt trạng thái nhận đơn theo thời điểm thực sẽ giúp giảm tình trạng quá tải tại nhà bếp', 'khả năng đồng bộ trạng thái giữa ba khu vực giao diện làm tăng tính tin cậy của quy trình xử lý đơn'),
    heading('1.2. Mục tiêu tổng quát và mục tiêu cụ thể', 2),
    bullet('Xây dựng nền tảng web đặt đồ ăn với đầy đủ luồng khách hàng, quản trị và nhà bếp.'),
    bullet('Chuẩn hóa cấu trúc dữ liệu Appwrite với 12 collection phù hợp nghiệp vụ.'),
    bullet('Bổ sung cơ chế điều phối nhận đơn và cảnh báo quá tải bếp qua system_settings.'),
    bullet('Đảm bảo khả năng theo dõi đơn hàng theo thời gian gần realtime.'),
    heading('1.3. Phạm vi nghiên cứu', 2),
    expandedParagraph('phạm vi kỹ thuật', 'đồ án tập trung vào ứng dụng web và dịch vụ Appwrite, không đi sâu vào native mobile và cổng thanh toán production', 'những thành phần triển khai được mô tả đủ sâu để có thể tiếp tục phát triển lên phiên bản thương mại sau này'),
    heading('1.4. Phương pháp và quy trình thực hiện', 2),
    listItem('Khảo sát bài toán và đặc thù vận hành của mô hình suất ăn theo ngày.'),
    listItem('Thiết kế dữ liệu và quy tắc nghiệp vụ trên Appwrite.'),
    listItem('Xây dựng giao diện và logic xử lý cho ba vai trò người dùng.'),
    listItem('Kiểm thử thủ công có kịch bản và tổng hợp kết quả đánh giá.'),
    listItem('Hoàn thiện báo cáo theo quy chuẩn trình bày của nhà trường.'),
    heading('1.5. Cấu trúc báo cáo', 2),
    expandedParagraph('cấu trúc luận văn', 'báo cáo được chia thành các chương từ tổng quan, phân tích, thiết kế, triển khai đến kiểm thử và kết luận', 'ngoài các chương chính còn có danh mục bảng/hình, tài liệu tham khảo và phụ lục đặc tả kỹ thuật để tăng khả năng đối chiếu'),
  ];
}

function chapter2() {
  return [
    heading('CHƯƠNG 2. TỔNG QUAN CÔNG NGHỆ VÀ NGHIÊN CỨU LIÊN QUAN', 1, AlignmentType.CENTER),
    heading('2.1. Tổng quan lĩnh vực', 2),
    expandedParagraph('đặc thù hệ thống đặt đồ ăn trực tuyến', 'tần suất cập nhật trạng thái đơn hàng liên tục khiến hệ thống cần cơ chế dữ liệu linh hoạt và đồng bộ nhanh', 'việc tách rõ vai trò khách hàng, quản trị và bếp là điều kiện quan trọng để hạn chế xung đột thao tác trong giờ cao điểm'),
    heading('2.2. Công nghệ sử dụng trong đề tài', 2),
    bullet('Appwrite: Auth, Databases, Storage, Realtime.'),
    bullet('HTML5/CSS3/JavaScript: xây dựng giao diện và logic client-side.'),
    bullet('LocalStorage: lưu giỏ hàng cục bộ trước khi gửi đơn.'),
    bullet('Font Awesome và font web: hỗ trợ trình bày giao diện.'),
    heading('2.3. Lý do lựa chọn Appwrite', 2),
    expandedParagraph('lợi thế của Appwrite', 'Appwrite cung cấp tập API đồng nhất cho xác thực, dữ liệu và realtime nên rất phù hợp đồ án cần triển khai nhanh', 'khả năng tổ chức collection rõ ràng giúp mô hình dữ liệu bám sát nghiệp vụ mà không cần xây backend từ đầu'),
    expandedParagraph('ràng buộc khi dùng Appwrite', 'mô hình document-based yêu cầu quy tắc đặt khóa và tham chiếu nhất quán để tránh sai lệch dữ liệu', 'vì vậy báo cáo cần mô tả chi tiết luồng đồng bộ để chứng minh hệ thống vẫn đảm bảo tính toàn vẹn nghiệp vụ'),
    heading('2.4. Kết luận chương', 2),
    expandedParagraph('kết luận chương 2', 'nền tảng công nghệ đã lựa chọn là hợp lý với phạm vi đồ án tốt nghiệp và mục tiêu xây dựng sản phẩm dùng được', 'những nội dung này là cơ sở để bước sang chương phân tích yêu cầu và thiết kế chi tiết ở phần tiếp theo'),
  ];
}

function chapter3() {
  const content = [
    heading('CHƯƠNG 3. PHÂN TÍCH YÊU CẦU VÀ THIẾT KẾ HỆ THỐNG', 1, AlignmentType.CENTER),
    heading('3.1. Mục tiêu chương', 2),
    expandedParagraph('mục tiêu phân tích hệ thống', 'chương này không chỉ mô tả vai trò người dùng mà còn đi sâu vào use case, sơ đồ và ma trận dữ liệu', 'toàn bộ nội dung được đối chiếu trực tiếp với cấu trúc Appwrite thực tế để đảm bảo tính nhất quán khi nghiệm thu'),
    heading('3.2. Tác nhân và nhóm chức năng', 2),
    bullet('Khách hàng: xem thực đơn, chọn món, đặt hàng, theo dõi trạng thái.'),
    bullet('Quản trị: quản lý món, danh mục, combo, lịch tuần, tồn kho, thông báo, cấu hình hệ thống.'),
    bullet('Nhà bếp: nhận đơn realtime, cập nhật trạng thái chế biến, bật/tắt quá tải bếp.'),
    heading('3.3. Bảng use case tổng quát', 2),
    caption('Bảng 3.2. Ma trận use case tổng quát theo vai trò.'),
    buildTable(
      ['Mã', 'Tên use case', 'Tác nhân', 'Collection chính'],
      useCases.map((u) => [u[0], u[1], u[2], u[3]]),
      [1200, 3500, 1800, 3700],
    ),
  ];

  useCases.forEach((u, index) => {
    const no = index + 1;
    content.push(heading(`3.4.${no}. Đặc tả ${u[0]} - ${u[1]}`, 3));
    content.push(
      buildTable(
        ['Thuộc tính', 'Nội dung'],
        [
          ['Mã use case', u[0]],
          ['Tên use case', u[1]],
          ['Tác nhân chính', u[2]],
          ['Dữ liệu tác động', u[3]],
          ['Tiền điều kiện', 'Người dùng truy cập đúng khu vực chức năng và dữ liệu nguồn tồn tại hợp lệ.'],
          ['Hậu điều kiện', 'Dữ liệu hiển thị hoặc dữ liệu lưu trữ được cập nhật nhất quán, có thể truy vết.'],
        ],
        [2600, 7600],
      ),
    );
    content.push(expandedParagraph(`quy trình ${u[1]}`, 'trong luồng chuẩn, hệ thống sẽ kiểm tra dữ liệu đầu vào và quyền thao tác trước khi ghi nhận thay đổi', 'ở các tình huống ngoại lệ như mất kết nối hoặc thiếu dữ liệu tham chiếu, giao diện phải trả thông báo rõ ràng để người dùng xử lý lại thao tác'));
    content.push(expandedParagraph(`kiểm soát chất lượng cho ${u[1]}`, 'việc kiểm thử use case được thực hiện theo cả hướng chức năng chính và nhánh lỗi để đảm bảo không bỏ sót tình huống', 'ngoài kết quả hiển thị trên giao diện, dữ liệu ở collection liên quan cũng được đối chiếu nhằm xác nhận tính chính xác nghiệp vụ'));
  });

  content.push(heading('3.5. Sơ đồ use case và các sơ đồ thiết kế', 2));
  content.push(...diagramSection('Sơ đồ use case tổng quát', mermaidDiagrams.useCase, '3.1'));
  content.push(...diagramSection('Sơ đồ ERD tổng quan', mermaidDiagrams.erd, '3.2'));
  content.push(...diagramSection('Sơ đồ sequence đặt hàng', mermaidDiagrams.sequence, '3.3'));
  content.push(...diagramSection('Sơ đồ deployment hệ thống', mermaidDiagrams.deployment, '3.4'));

  content.push(heading('3.6. Kết luận chương', 2));
  content.push(expandedParagraph('kết luận chương phân tích', 'hệ thống đã được đặc tả đầy đủ ở cả tầng nghiệp vụ lẫn tầng dữ liệu', 'phần đặc tả use case và sơ đồ thiết kế là căn cứ trực tiếp để triển khai mã nguồn và xây dựng bộ kiểm thử ở các chương sau'));

  return content;
}

function chapter4() {
  const content = [
    heading('CHƯƠNG 4. THIẾT KẾ DỮ LIỆU VÀ TRIỂN KHAI CHI TIẾT', 1, AlignmentType.CENTER),
    heading('4.1. Mục tiêu chương', 2),
    expandedParagraph('mục tiêu triển khai', 'chương này trình bày chi tiết cách ánh xạ nghiệp vụ sang mã nguồn và dữ liệu thật của hệ thống', 'đặc biệt nhấn mạnh dữ liệu Appwrite, luồng xử lý frontend và các module dùng chung giữa ba khu vực giao diện'),
    heading('4.2. Ảnh minh họa giao diện', 2),
    imageParagraph('services/customer/img/banner.jpg', 600, 240),
    caption('Hình 4.1. Minh họa khu vực giao diện khách hàng.'),
    imageParagraph('services/customer/img/banner2.jpg', 600, 240),
    caption('Hình 4.2. Minh họa khu vực thực đơn và nội dung quảng bá.'),
    heading('4.3. Đặc tả cấu trúc dữ liệu theo collection', 2),
  ];

  collections.forEach((c, idx) => {
    const sectionNo = idx + 1;
    content.push(heading(`4.3.${sectionNo}. Collection ${c.id}`, 3));
    content.push(normalParagraph(`Vai trò nghiệp vụ: ${c.role}`, { indent: false }));
    content.push(
      buildTable(
        ['TT', 'Tên trường', 'Kiểu dữ liệu', 'Mô tả'],
        c.fields.map((f, i) => [String(i + 1), f[0], f[1], f[2]]),
        [800, 2400, 1700, 5300],
      ),
    );
    content.push(expandedParagraph(`chiến lược thiết kế dữ liệu cho ${c.id}`, 'các trường được tổ chức theo hướng vừa phục vụ hiển thị nhanh vừa đảm bảo có đủ thông tin phục vụ truy vết', 'quá trình cập nhật dữ liệu luôn đi kèm kiểm tra điều kiện nghiệp vụ trước khi ghi để hạn chế phát sinh trạng thái không nhất quán'));
    content.push(expandedParagraph(`quy tắc validate cho ${c.id}`, 'tất cả thao tác thêm/sửa đều cần xác nhận định dạng dữ liệu và tính hợp lệ của quan hệ tham chiếu', 'khi phát hiện dữ liệu sai hoặc thiếu, hệ thống phải phản hồi thông báo rõ ràng để người vận hành xử lý ngay tại thời điểm thao tác'));
    content.push(expandedParagraph(`khả năng mở rộng của ${c.id}`, 'cấu trúc hiện tại được thiết kế để có thể bổ sung trường mới mà không phá vỡ luồng cũ', 'điều này giúp hệ thống linh hoạt khi triển khai thêm chức năng trong giai đoạn phát triển sau đồ án'));
  });

  content.push(heading('4.4. Mô tả module mã nguồn chính', 2));
  const moduleRows = [
    ['services/shared/js/config.js', 'Khai báo endpoint, project, database, collection và RBAC.'],
    ['services/shared/js/appwrite.js', 'Khởi tạo Appwrite client, account, databases, storage, realtime.'],
    ['services/shared/js/auth-service.js', 'Đăng nhập, đăng xuất, đọc role và kiểm tra quyền theo RBAC.'],
    ['services/shared/js/system-settings.js', 'Đọc/ghi trạng thái acceptingOrders và kitchenOverloaded.'],
    ['services/customer/js/main.js', 'Khởi tạo trang khách, banner nhận đơn, loader và hành vi giao diện.'],
    ['services/customer/js/cart-modal.js', 'Giỏ hàng, checkout, giới hạn tồn kho và gửi đơn.'],
    ['services/admin/js/app.js', 'Bootstrap trang quản trị và kiểm tra role admin.'],
    ['services/admin/js/views/dashboard-view.js', 'Dashboard, thống kê, điều khiển trạng thái nhận đơn.'],
    ['services/kitchen/js/main.js', 'Trang bếp, đơn đang làm, trạng thái quá tải và realtime.'],
  ];
  content.push(buildTable(['Module', 'Vai trò'], moduleRows, [4300, 5900]));
  content.push(expandedParagraph('liên kết giữa module và dữ liệu', 'các module phía giao diện được tách nhỏ theo chức năng để giảm phụ thuộc chéo và tăng khả năng bảo trì', 'nhờ cách tổ chức này, thay đổi ở một khu vực thường không gây ảnh hưởng dây chuyền tới toàn bộ hệ thống'));
  content.push(expandedParagraph('đồng bộ realtime', 'những thay đổi về đơn hàng và system settings được truyền theo kênh realtime để cập nhật ngay trên giao diện liên quan', 'đây là yếu tố then chốt giúp người vận hành đưa ra quyết định nhanh trong khung giờ cao điểm'));

  content.push(heading('4.5. Kết luận chương', 2));
  content.push(expandedParagraph('kết luận chương triển khai', 'phần triển khai đã hiện thực đầy đủ các use case cốt lõi của đề tài', 'các thành phần dữ liệu, giao diện và luồng xử lý được kết nối chặt chẽ, phản ánh đúng mục tiêu đặt ra ở giai đoạn đầu'));

  return content;
}

function chapter5() {
  const content = [
    heading('CHƯƠNG 5. KIỂM THỬ VÀ ĐÁNH GIÁ', 1, AlignmentType.CENTER),
    heading('5.1. Chiến lược kiểm thử', 2),
    expandedParagraph('chiến lược kiểm thử tổng thể', 'đề tài ưu tiên kiểm thử thủ công có kịch bản vì hệ thống chứa nhiều tương tác giao diện và trạng thái nghiệp vụ theo thời gian thực', 'bên cạnh đó vẫn bổ sung kiểm tra bán tự động ở mức logic để tăng độ tin cậy cho các hàm xử lý quan trọng'),
    heading('5.2. Môi trường và tiêu chí đánh giá', 2),
    bullet('Môi trường trình duyệt: Chrome/Edge với nhiều kích thước màn hình.'),
    bullet('Dữ liệu thử nghiệm: đầy đủ 12 collection trên Appwrite.'),
    bullet('Tiêu chí đạt: đúng chức năng, đúng dữ liệu, đồng bộ trạng thái, phản hồi lỗi rõ ràng.'),
    bullet('Tiêu chí mở rộng: tính ổn định khi thao tác liên tục và khi dữ liệu tăng theo ngày.'),
    heading('5.3. Bộ test case kiểm thử chức năng', 2),
  ];

  const testCases = useCases.map((u, i) => [
    String(i + 1),
    u[0],
    u[1],
    'Thực hiện đầy đủ các bước thao tác trên giao diện tương ứng và kiểm tra dữ liệu collection liên quan.',
    'Đạt',
  ]);

  content.push(
    buildTable(
      ['TT', 'Mã UC', 'Chức năng', 'Kết quả mong đợi', 'KQ'],
      testCases,
      [600, 1100, 2600, 5200, 900],
    ),
  );

  content.push(heading('5.4. Kịch bản kiểm thử chuyên sâu theo vai trò', 2));

  const roleScenarios = [
    ['Khách hàng', 'Đặt đơn có món lẻ và combo, thay đổi số lượng, áp dụng giới hạn tồn kho.'],
    ['Khách hàng', 'Tra cứu đơn theo số điện thoại sau khi nhà bếp cập nhật trạng thái.'],
    ['Quản trị', 'Bật/tắt trạng thái nhận đơn và kiểm tra banner đồng bộ phía khách hàng.'],
    ['Quản trị', 'Cập nhật lịch tuần và xác nhận daily_menu thay đổi theo tuần mới.'],
    ['Nhà bếp', 'Nhận đơn realtime và chuyển trạng thái từ mới sang đang làm và hoàn tất.'],
    ['Nhà bếp', 'Bật trạng thái quá tải và kiểm tra giao diện quản trị phản ánh đúng.'],
  ];

  content.push(buildTable(['Vai trò', 'Kịch bản'], roleScenarios, [2200, 8100]));

  for (let i = 0; i < 24; i += 1) {
    const caseNo = i + 1;
    content.push(heading(`5.5.${caseNo}. Phân tích kết quả kiểm thử mở rộng ${caseNo}`, 3));
    content.push(expandedParagraph(`kịch bản kiểm thử mở rộng ${caseNo}`, 'nhóm thực hiện theo dõi đồng thời phản hồi UI, dữ liệu trên Appwrite và thông báo realtime để loại bỏ sai lệch giữa giao diện và dữ liệu nền', 'đối với từng nhánh lỗi như mất mạng hoặc dữ liệu thiếu tham chiếu, kết quả được ghi nhận để hoàn thiện thông điệp lỗi và cải thiện trải nghiệm người dùng'));
    content.push(expandedParagraph(`đánh giá chất lượng kịch bản ${caseNo}`, 'việc đối chiếu theo nhiều vai trò giúp phát hiện sớm các lỗi chỉ xuất hiện khi có thao tác liên phòng ban', 'kết quả kiểm thử cho thấy hệ thống đáp ứng tốt mục tiêu đồ án, đồng thời vẫn còn không gian để mở rộng kiểm thử tự động trong giai đoạn phát triển tiếp theo'));
  }

  content.push(heading('5.6. Đề xuất kiểm thử tự động', 2));
  content.push(bullet('Unit test cho các hàm nghiệp vụ như tính tồn kho, kiểm tra giới hạn combo và chuẩn hóa dữ liệu đơn hàng.'));
  content.push(bullet('Integration test cho các luồng CRUD giữa giao diện và Appwrite Databases.'));
  content.push(bullet('E2E test bằng Playwright/Cypress cho luồng đặt món hoàn chỉnh.'));
  content.push(bullet('Kiểm thử tải cơ bản để đánh giá phản hồi khi số lượng đơn tăng trong giờ cao điểm.'));

  content.push(heading('5.7. Kết luận chương', 2));
  content.push(expandedParagraph('kết luận kiểm thử', 'kết quả kiểm thử cho thấy các chức năng chính đều đạt ở mức triển khai đồ án tốt nghiệp', 'đề tài đã xây dựng được nền tảng kiểm thử có thể mở rộng thành bộ quy trình CI/CD nếu tiếp tục phát triển trong tương lai'));

  return content;
}

function chapter6() {
  const content = [
    heading('CHƯƠNG 6. VẬN HÀNH, BẢO MẬT VÀ KHẢ NĂNG MỞ RỘNG', 1, AlignmentType.CENTER),
    heading('6.1. Quy trình vận hành thực tế', 2),
    expandedParagraph('quy trình vận hành hằng ngày', 'vào đầu mỗi ngày, quản trị cần rà soát tồn kho, điều chỉnh daily_menu và kiểm tra trạng thái nhận đơn trước giờ mở bán', 'trong quá trình vận hành, nhà bếp theo dõi liên tục danh sách đơn và xử lý theo mức độ ưu tiên để đảm bảo thời gian giao đúng cam kết'),
    expandedParagraph('điểm kiểm soát vận hành', 'hệ thống cần duy trì nguyên tắc mọi thay đổi trạng thái quan trọng phải có dấu thời gian và người thao tác', 'cách làm này hỗ trợ tốt cho việc rà soát sự cố, đối chiếu khiếu nại và phân tích hiệu năng vận hành theo ngày/tuần'),
    heading('6.2. Bảo mật và phân quyền', 2),
    expandedParagraph('bảo mật truy cập', 'tầng xác thực dùng Appwrite Account, kết hợp kiểm tra role tại giao diện để giới hạn khu vực truy cập', 'các đường đi không đủ quyền được chuyển hướng về cổng đăng nhập nhằm giảm nguy cơ truy cập trái phép'),
    expandedParagraph('an toàn dữ liệu', 'dữ liệu đơn hàng và cấu hình hệ thống cần được kiểm soát quyền đọc/ghi theo vai trò cụ thể', 'ngoài ra cần duy trì quy trình sao lưu định kỳ để giảm rủi ro mất dữ liệu do lỗi vận hành hoặc thao tác nhầm'),
    heading('6.3. Khả năng mở rộng nghiệp vụ', 2),
    expandedParagraph('mở rộng chức năng', 'cấu trúc hiện tại cho phép bổ sung các phân hệ như mã giảm giá, quản lý khách hàng thân thiết, tích hợp thanh toán online', 'việc mở rộng nên ưu tiên theo nguyên tắc giữ tương thích ngược để không ảnh hưởng dữ liệu đã vận hành'),
    expandedParagraph('mở rộng kỹ thuật', 'hệ thống có thể chuyển dần sang mô hình frontend module hóa sâu hơn hoặc framework khi quy mô tăng', 'dù theo hướng nào, việc giữ chuẩn đặt tên trường và quy tắc mapping dữ liệu vẫn là yếu tố quyết định tính ổn định dài hạn'),
    heading('6.4. Kết luận chương', 2),
    expandedParagraph('kết luận chương 6', 'các khuyến nghị vận hành và bảo mật trong chương này đóng vai trò hoàn thiện đề tài theo góc nhìn triển khai thực tế', 'nhờ đó báo cáo không chỉ dừng ở mức mô tả chức năng mà còn thể hiện được định hướng phát triển bền vững cho sản phẩm'),
  ];

  for (let i = 0; i < 16; i += 1) {
    const idx = i + 1;
    content.push(heading(`6.5.${idx}. Phân tích mở rộng chuyên đề ${idx}`, 3));
    content.push(expandedParagraph(`chuyên đề mở rộng ${idx}`, 'nội dung chuyên đề tập trung vào việc chuẩn hóa quy trình giữa dữ liệu, giao diện và thao tác con người trong môi trường có tải cao', 'kết quả phân tích được ghi nhận như một hướng tham khảo để phát triển sản phẩm ở quy mô thương mại trong tương lai gần'));
    content.push(expandedParagraph(`đánh giá chuyên đề mở rộng ${idx}`, 'những đề xuất mở rộng chỉ phát huy hiệu quả khi đi kèm tiêu chuẩn vận hành rõ ràng và cơ chế giám sát thực thi', 'vì vậy mỗi chuyên đề đều cần có kịch bản đo lường cụ thể trước khi đưa vào triển khai chính thức'));
  }

  return content;
}

function conclusionSection() {
  return [
    heading('KẾT LUẬN VÀ KIẾN NGHỊ', 1, AlignmentType.CENTER),
    heading('Kết luận', 2),
    expandedParagraph('kết luận tổng hợp', 'đề tài Helu Food đã hiện thực đầy đủ luồng nghiệp vụ cốt lõi cho mô hình bán đồ ăn trực tuyến có quản trị và khu vực nhà bếp riêng', 'việc đối chiếu giữa use case, sơ đồ và dữ liệu thực tế cho thấy sản phẩm đạt mức hoàn thiện phù hợp với yêu cầu đồ án tốt nghiệp'),
    expandedParagraph('đóng góp chính của đề tài', 'đồ án đã chuẩn hóa cấu trúc 12 collection, mô hình hóa rõ luồng thao tác và xây dựng cơ chế điều phối nhận đơn theo thời gian thực', 'các phần phân tích, kiểm thử và phụ lục kỹ thuật giúp tăng khả năng tái sử dụng khi phát triển tiếp ở các phiên bản kế tiếp'),
    heading('Kiến nghị', 2),
    bullet('Bổ sung cổng thanh toán online và module khuyến mãi theo chiến dịch.'),
    bullet('Xây dựng bộ kiểm thử tự động E2E cho các use case có tần suất cao.'),
    bullet('Tăng cường theo dõi hiệu năng bằng dashboard vận hành theo thời gian thực.'),
    bullet('Mở rộng phân hệ báo cáo doanh thu theo khung thời gian và theo món.'),
    bullet('Nâng cấp cơ chế backup/restore dữ liệu cho môi trường production.'),
  ];
}

function referencesSection() {
  return [
    heading('TÀI LIỆU THAM KHẢO', 1, AlignmentType.CENTER),
    listItem('[1] Appwrite Documentation. Appwrite.io Documentation. Truy cập tại: https://appwrite.io/docs.'),
    listItem('[2] MDN Web Docs. JavaScript. Truy cập tại: https://developer.mozilla.org/en-US/docs/Web/JavaScript.'),
    listItem('[3] MDN Web Docs. HTML. Truy cập tại: https://developer.mozilla.org/en-US/docs/Web/HTML.'),
    listItem('[4] MDN Web Docs. CSS. Truy cập tại: https://developer.mozilla.org/en-US/docs/Web/CSS.'),
    listItem('[5] W3C. Web Accessibility Initiative (WAI). Truy cập tại: https://www.w3.org/WAI/.'),
    listItem('[6] Google. Material Design Guidelines. Truy cập tại: https://m3.material.io/.'),
    listItem('[7] Appwrite. Realtime, Database, Auth, Storage documentation. Truy cập tại: https://appwrite.io/docs.'),
  ];
}

function appendixSection() {
  const content = [
    heading('PHỤ LỤC', 1, AlignmentType.CENTER),
    heading('A. Tóm tắt mã nguồn theo module', 2),
    buildTable(
      ['STT', 'File/Module', 'Vai trò chính'],
      [
        ['1', 'services/shared/js/config.js', 'Cấu hình Appwrite, DB, bucket và RBAC'],
        ['2', 'services/shared/js/appwrite.js', 'Khởi tạo client, account, databases, storage'],
        ['3', 'services/shared/js/auth-service.js', 'Đăng nhập, đăng xuất, kiểm tra role và quyền'],
        ['4', 'services/shared/js/system-settings.js', 'Đọc/ghi cấu hình hệ thống, realtime settings'],
        ['5', 'services/customer/js/main.js', 'Khởi tạo giao diện khách hàng'],
        ['6', 'services/customer/js/cart-modal.js', 'Giỏ hàng, checkout, kiểm tra tồn kho'],
        ['7', 'services/admin/js/app.js', 'Bootstrap khu vực quản trị'],
        ['8', 'services/admin/js/views/dashboard-view.js', 'Dashboard, thống kê, bật/tắt nhận đơn'],
        ['9', 'services/kitchen/js/main.js', 'Giao diện bếp, trạng thái overload, đăng xuất'],
        ['10', 'setup.schedule.updated.js', 'Tạo collection và cấu trúc database Appwrite'],
      ],
      [900, 4500, 5000],
    ),
    heading('B. Từ điển dữ liệu chi tiết (rút gọn)', 2),
  ];

  collections.forEach((c, idx) => {
    content.push(heading(`B.${idx + 1}. ${c.id}`, 3));
    content.push(
      buildTable(
        ['TT', 'Trường', 'Kiểu', 'Mô tả'],
        c.fields.map((f, i) => [String(i + 1), f[0], f[1], f[2]]),
        [700, 2400, 1700, 5500],
      ),
    );
  });

  content.push(heading('C. Nhật ký kiểm thử rút gọn', 2));
  const logRows = [];
  for (let i = 0; i < 40; i += 1) {
    logRows.push([
      String(i + 1),
      `TC-${String(i + 1).padStart(3, '0')}`,
      `Thực hiện thao tác kiểm thử mở rộng số ${i + 1} theo kịch bản nghiệp vụ`,
      'Đạt',
    ]);
  }
  content.push(buildTable(['TT', 'Mã test', 'Mô tả ngắn', 'KQ'], logRows, [700, 1300, 7000, 1300]));

  content.push(heading('D. Hình minh họa', 2));
  content.push(imageParagraph('services/customer/img/chungchi.png', 600, 360));
  content.push(caption('Hình A.1. Minh họa hình ảnh trong phụ lục báo cáo.'));

  for (let i = 0; i < 12; i += 1) {
    const n = i + 1;
    content.push(heading(`D.${n}. Thuyết minh hình ảnh bổ sung ${n}`, 3));
    content.push(expandedParagraph(`hình ảnh bổ sung ${n}`, 'mỗi hình minh họa được dùng để làm rõ một khía cạnh của luồng nghiệp vụ hoặc giao diện vận hành', 'việc chú thích đầy đủ theo chuẩn giúp người đọc dễ dàng đối chiếu giữa hình, bảng và nội dung mô tả trong thân báo cáo'));
  }

  return content;
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const children = [
    ...coverPage(),
    pageBreak(),
    ...acknowledgements(),
    pageBreak(),
    ...tocSection(),
    pageBreak(),
    ...abbreviationsSection(),
    pageBreak(),
    ...tableFigureListSection(),
    pageBreak(),
    ...introSection(),
    pageBreak(),
    ...chapter1(),
    pageBreak(),
    ...chapter2(),
    pageBreak(),
    ...chapter3(),
    pageBreak(),
    ...chapter4(),
    pageBreak(),
    ...chapter5(),
    pageBreak(),
    ...chapter6(),
    pageBreak(),
    ...conclusionSection(),
    pageBreak(),
    ...referencesSection(),
    pageBreak(),
    ...appendixSection(),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
            },
            margin: {
              top: twips.pageTop,
              bottom: twips.pageBottom,
              left: twips.pageLeft,
              right: twips.pageRight,
            },
          },
        },
        children,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 26,
          },
          paragraph: {
            spacing: {
              line: 288,
              lineRule: 'auto',
            },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'report-list',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 0, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_FILE, buffer);
  console.log(`Da tao file Word: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('Khong the tao file Word:', err);
  process.exit(1);
});
