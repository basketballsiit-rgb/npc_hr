const db = require('./db');

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

async function run() {
  try {
    const [rows] = await db.query('SELECT * FROM leave_data');
    console.log(`Scanning ${rows.length} rows for date normalization...`);

    let dateNormalizationCount = 0;
    let approvalDateCount = 0;
    let pdfUrlCount = 0;

    const convertBeToAd = (dateVal) => {
      if (!dateVal) return null;
      const dateStr = String(dateVal).trim();
      const match = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
      if (match) {
        const year = parseInt(match[1]);
        if (year > 2400) {
          const newYear = year - 543;
          return `${newYear}-${match[2]}-${match[3]}`;
        }
      }
      return null;
    };

    for (const r of rows) {
      const updates = [];
      const params = [];

      // 1. Check Date Columns for B.E. years (year > 2400)
      const newRequestDate = convertBeToAd(r.requestDate);
      const newStartDate = convertBeToAd(r.startDate);
      const newEndDate = convertBeToAd(r.endDate);
      const newLastStartDate = convertBeToAd(r.lastLeaveStartDate);
      const newLastEndDate = convertBeToAd(r.lastLeaveEndDate);

      if (newRequestDate) {
        updates.push("requestDate = ?");
        params.push(newRequestDate);
      }
      if (newStartDate) {
        updates.push("startDate = ?");
        params.push(newStartDate);
      }
      if (newEndDate) {
        updates.push("endDate = ?");
        params.push(newEndDate);
      }
      if (newLastStartDate) {
        updates.push("lastLeaveStartDate = ?");
        params.push(newLastStartDate);
      }
      if (newLastEndDate) {
        updates.push("lastLeaveEndDate = ?");
        params.push(newLastEndDate);
      }

      if (newRequestDate || newStartDate || newEndDate || newLastStartDate || newLastEndDate) {
        dateNormalizationCount++;
        console.log(`  [Date Normalization] ${r.fullName}:`);
        if (newRequestDate) console.log(`    requestDate: ${r.requestDate} -> ${newRequestDate}`);
        if (newStartDate) console.log(`    startDate: ${r.startDate} -> ${newStartDate}`);
        if (newEndDate) console.log(`    endDate: ${r.endDate} -> ${newEndDate}`);
      }

      // 2. Check approvalDate
      if (r.approvalDate && r.approvalDate.startsWith('Date(')) {
        const match = r.approvalDate.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const year = parseInt(match[1]);
          const monthIdx = parseInt(match[2]);
          const day = parseInt(match[3]);
          const monthName = THAI_MONTHS[monthIdx];
          
          if (monthName) {
            const formattedDate = `${day} ${monthName} ${year}`;
            updates.push('approvalDate = ?');
            params.push(formattedDate);
            approvalDateCount++;
            console.log(`  [approvalDate] ${r.fullName}: "${r.approvalDate}" -> "${formattedDate}"`);
          }
        }
      }

      // 3. Check pdfUrl (redirect Google Drive link to local print template)
      if (r.pdfUrl && r.pdfUrl.includes('drive.google.com')) {
        const localPdfUrl = `print_template.html?leaveId=${r.leaveId}`;
        updates.push('pdfUrl = ?');
        params.push(localPdfUrl);
        pdfUrlCount++;
        console.log(`  [pdfUrl] ${r.fullName}: Redirected to "${localPdfUrl}"`);
      }

      if (updates.length > 0) {
        params.push(r.leaveId);
        await db.query(
          `UPDATE leave_data SET ${updates.join(', ')} WHERE leaveId = ?`,
          params
        );
      }
    }

    console.log('\n=======================================');
    console.log('Database Migration Complete:');
    console.log(`- Normalized date columns (B.E. to A.D.): ${dateNormalizationCount} rows`);
    console.log(`- Updated approvalDate: ${approvalDateCount} rows`);
    console.log(`- Updated pdfUrl: ${pdfUrlCount} rows`);
    console.log('=======================================');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
