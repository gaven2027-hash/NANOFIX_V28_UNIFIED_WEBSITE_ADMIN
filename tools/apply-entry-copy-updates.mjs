import fs from "node:fs";

const file = "lib/legacy/body.html";
let source = fs.readFileSync(file, "utf8");

const replacements = [
  [/data-en="Free Quote"/g, 'data-en="Free Inspection &amp; Quote"'],
  [/>Free Quote</g, ">Free Inspection &amp; Quote<"],
  [/<\/i> Free Quote</g, "</i> Free Inspection &amp; Quote<"],
  [/data-en="Get a Free Quote"/g, 'data-en="Free Inspection &amp; Quote"'],
  [/data-en="⭐️ Get a Free Quote"/g, 'data-en="⭐️ Free Inspection &amp; Quote"'],
  [/>Get a Free Quote</g, ">Free Inspection &amp; Quote<"],
  [/>⭐️ Get a Free Quote</g, ">⭐️ Free Inspection &amp; Quote<"],
  [/data-en="Submit Repair Request"/g, 'data-en="Request Free Inspection &amp; Quote"'],
  [/>Submit Repair Request</g, ">Request Free Inspection &amp; Quote<"],
  [/data-en="Submit Request"/g, 'data-en="Submit Repair Request"'],
  [/>Submit Request</g, ">Submit Repair Request<"],
  [/data-en="Customer Login"/g, 'data-en="Member Sign Up / Login"'],
  [/>Customer Login</g, ">Member Sign Up / Login<"],
  [
    /data-en="Register to instantly track your repair and manage e-warranties"/g,
    'data-en="Track repair progress, view service status and manage your repair records in real time."'
  ],
  [
    />Register to instantly track your repair and manage e-warranties</g,
    ">Track repair progress, view service status and manage your repair records in real time.<"
  ],
  [
    /href="https:\/\/app\.nanofixsg\.com\/#customer"/g,
    'href="https://www.nanofixsg.com/member-sign-up-login" data-member-portal-link="true"'
  ],
  [
    /data-en="Send your leakage photos, address and contact details\. Our team will reply through WhatsApp\."/g,
    'data-en="Send your leakage photos, address and contact details. Our team will arrange a quick free inspection and quote through WhatsApp."'
  ],
  [
    />Send your leakage photos, address and contact details\. Our team will reply through WhatsApp\.</g,
    ">Send your leakage photos, address and contact details. Our team will arrange a quick free inspection and quote through WhatsApp.<"
  ],
  [/data-zh="客户登录"/g, 'data-zh="会员注册 / 登录"'],
  [/data-zh="免费报价"/g, 'data-zh="免费检测与报价"'],
  [/data-zh="获取免费报价"/g, 'data-zh="免费检测与报价"'],
  [/data-zh="⭐️ 获取免费报价"/g, 'data-zh="⭐️ 免费检测与报价"'],
  [/data-zh="提交报修单"/g, 'data-zh="申请免费检测与报价"'],
  [/data-zh="提交申请"/g, 'data-zh="申请免费检测与报价"']
];

for (const [pattern, value] of replacements) {
  source = source.replace(pattern, value);
}

fs.writeFileSync(file, source, "utf8");
