import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

export interface DokumenData {
  id: string;
  tipe: string;
  nomor: string;
  status: string;
  judul?: string | null;
  tanggalDokumen: Date;
  tanggalJatuhTempo?: Date | null;
  klienNama?: string | null;
  klienAlamat?: string | null;
  klienNpwp?: string | null;
  klienEmail?: string | null;
  klienNoTelp?: string | null;
  subtotal: number | string;
  diskonPersen: number | string;
  diskonNominal: number | string;
  pajakPersen: number | string;
  pajakNominal: number | string;
  total: number | string;
  nominalHutang?: number | string | null;
  cicilanPerBulan?: number | string | null;
  catatan?: string | null;
  syaratKetentuan?: string | null;
  tema: string;
  items: Array<{
    urutan: number;
    nama: string;
    deskripsi?: string | null;
    satuan: string;
    qty: number | string;
    hargaSatuan: number | string;
    diskonPersen: number | string;
    subtotal: number | string;
  }>;
  perusahaan?: {
    nama: string;
    alamat?: string | null;
    kota?: string | null;
    noTelp?: string | null;
    email?: string | null;
    npwp?: string | null;
    logoUrl?: string | null;
    namaBank?: string | null;
    noRekening?: string | null;
    atasNama?: string | null;
    ttdUrl?: string | null;
    stempelUrl?: string | null;
    namaDirektur?: string | null;
    jabatanDirektur?: string | null;
  };
}

const templatesDir = path.join(__dirname, 'templates');

/**
 * Konversi URL gambar eksternal ke base64 data URI.
 * Puppeteer tidak bisa fetch URL eksternal saat generate PDF,
 * sehingga gambar harus diembed sebagai base64.
 */
async function urlKeBase64(url: string): Promise<string | null> {
  // Path relatif (misal /uploads/images/logo.png) — baca dari disk langsung
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    try {
      const filePath = path.join(process.cwd(), url.startsWith('/') ? url.slice(1) : url);
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(url).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : ext === '.webp' ? 'image/webp'
        : 'image/png';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }
  // URL absolut — fetch via HTTP
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const mime = res.headers['content-type'] ?? 'image/png';
          resolve(`data:${mime};base64,${buffer.toString('base64')}`);
        });
        res.on('error', () => resolve(null));
      }).on('error', () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

function terbilang(amount: number | string): string {
  const num = Math.floor(typeof amount === 'string' ? parseFloat(amount) : amount);
  if (isNaN(num) || num === 0) return 'nol rupiah';
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
    'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas',
    'tujuh belas', 'delapan belas', 'sembilan belas'];
  function spell(n: number): string {
    if (n < 20) return satuan[n];
    if (n < 100) return satuan[Math.floor(n / 10)].replace('satu', 'se') + (Math.floor(n / 10) === 1 ? '' : '') + 'puluh' + (n % 10 ? ' ' + satuan[n % 10] : '');
    if (n < 200) return 'seratus' + (n % 100 ? ' ' + spell(n % 100) : '');
    if (n < 1000) return satuan[Math.floor(n / 100)] + ' ratus' + (n % 100 ? ' ' + spell(n % 100) : '');
    if (n < 2000) return 'seribu' + (n % 1000 ? ' ' + spell(n % 1000) : '');
    if (n < 1000000) return spell(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + spell(n % 1000) : '');
    if (n < 1000000000) return spell(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 ? ' ' + spell(n % 1000000) : '');
    return spell(Math.floor(n / 1000000000)) + ' miliar' + (n % 1000000000 ? ' ' + spell(n % 1000000000) : '');
  }
  const words = spell(num);
  return words.charAt(0).toUpperCase() + words.slice(1) + ' rupiah';
}

function formatRupiah(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function formatTanggal(date: Date | null | undefined): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date));
}

async function buildHtml(doc: DokumenData): Promise<string> {
  const templateFile = doc.tipe === 'invoice' ? 'invoice.html'
    : doc.tipe === 'sph' ? 'sph.html'
    : doc.tipe === 'kasbon' ? 'kasbon.html'
    : 'surat_hutang.html';

  let html = fs.readFileSync(path.join(templatesDir, templateFile), 'utf-8');

  // Konversi URL gambar ke base64 agar Puppeteer bisa render tanpa fetch eksternal
  const logoBase64   = doc.perusahaan?.logoUrl    ? await urlKeBase64(doc.perusahaan.logoUrl)    : null;
  const ttdBase64    = doc.perusahaan?.ttdUrl      ? await urlKeBase64(doc.perusahaan.ttdUrl)      : null;
  const stempelBase64 = doc.perusahaan?.stempelUrl ? await urlKeBase64(doc.perusahaan.stempelUrl) : null;

  // Nama penanda tangan: gunakan namaDirektur jika ada, fallback ke nama perusahaan
  const namaTtd      = doc.perusahaan?.namaDirektur ?? doc.perusahaan?.nama ?? '';
  const jabatanTtd   = doc.perusahaan?.jabatanDirektur ?? '';

  // Replace placeholders
  const replacements: Record<string, string> = {
    '{{NOMOR}}': doc.nomor,
    '{{TANGGAL}}': formatTanggal(doc.tanggalDokumen),
    '{{JATUH_TEMPO}}': formatTanggal(doc.tanggalJatuhTempo),
    '{{KLIEN_NAMA}}': doc.klienNama ?? '-',
    '{{KLIEN_ALAMAT}}': doc.klienAlamat ?? '-',
    '{{KLIEN_NPWP}}': doc.klienNpwp ?? '-',
    '{{KLIEN_EMAIL}}': doc.klienEmail ?? '-',
    '{{KLIEN_TELP}}': doc.klienNoTelp ?? '-',
    '{{PERUSAHAAN_NAMA}}': doc.perusahaan?.nama ?? '',
    '{{PERUSAHAAN_ALAMAT}}': doc.perusahaan?.alamat ?? '',
    '{{PERUSAHAAN_KOTA}}': doc.perusahaan?.kota ?? '',
    '{{PERUSAHAAN_TELP}}': doc.perusahaan?.noTelp ?? '',
    '{{PERUSAHAAN_EMAIL}}': doc.perusahaan?.email ?? '',
    '{{PERUSAHAAN_NPWP}}': doc.perusahaan?.npwp ?? '',
    '{{BANK_NAMA}}': doc.perusahaan?.namaBank ?? '',
    '{{BANK_REKENING}}': doc.perusahaan?.noRekening ?? '',
    '{{BANK_ATAS_NAMA}}': doc.perusahaan?.atasNama ?? '',
    '{{SUBTOTAL}}': formatRupiah(doc.subtotal),
    '{{DISKON_PERSEN}}': String(doc.diskonPersen),
    '{{DISKON_NOMINAL}}': formatRupiah(doc.diskonNominal),
    '{{PAJAK_PERSEN}}': String(doc.pajakPersen),
    '{{PAJAK_NOMINAL}}': formatRupiah(doc.pajakNominal),
    '{{TOTAL}}': formatRupiah(doc.total),
    '{{TERBILANG}}': terbilang(doc.total),
    '{{CATATAN}}': doc.catatan ?? '',
    '{{SYARAT_KETENTUAN}}': doc.syaratKetentuan ?? '',
    '{{NOMINAL_HUTANG}}': formatRupiah(doc.nominalHutang ?? 0),
    '{{CICILAN_PER_BULAN}}': formatRupiah(doc.cicilanPerBulan ?? 0),
    '{{JUDUL}}': doc.judul ?? '',
    // Logo — base64 agar Puppeteer tidak perlu fetch URL eksternal
    '{{LOGO_IMG}}': logoBase64
      ? `<img src="${logoBase64}" style="height:44px;max-width:110px;object-fit:contain;display:block;margin-bottom:6px;" />`
      : '',
    // TTD — base64
    '{{TTD_IMG}}': ttdBase64
      ? `<img src="${ttdBase64}" style="max-height:68px;max-width:140px;object-fit:contain;display:block;" />`
      : '',
    // Stempel — base64, pojok kanan bawah, overlay di atas TTD
    '{{STEMPEL_IMG}}': stempelBase64
      ? `<img src="${stempelBase64}" style="height:68px;width:68px;object-fit:contain;opacity:0.6;position:absolute;right:4px;bottom:0;" />`
      : '',
    // Nama & jabatan penanda tangan
    '{{NAMA_DIREKTUR}}': namaTtd,
    '{{JABATAN_DIREKTUR}}': jabatanTtd,
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(key, value);
  }

  // Build items table rows
  const itemRows = doc.items.map((item, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>
        <div class="font-medium">${item.nama}</div>
        ${item.deskripsi ? `<div class="text-secondary text-xs">${item.deskripsi}</div>` : ''}
      </td>
      <td class="text-center">${item.qty} ${item.satuan}</td>
      <td class="text-right">${formatRupiah(item.hargaSatuan)}</td>
      <td class="text-center">${item.diskonPersen}%</td>
      <td class="text-right font-medium">${formatRupiah(item.subtotal)}</td>
    </tr>
  `).join('');

  html = html.replace('{{ITEM_ROWS}}', itemRows);
  return html;
}

export async function generatePdf(doc: DokumenData): Promise<Buffer> {
  const html = await buildHtml(doc);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
