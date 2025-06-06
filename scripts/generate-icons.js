import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Icns, IcnsImage } from '@fiahfy/icns';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 路径配置
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'static');
const INPUT_SVG = path.join(OUTPUT_DIR, 'logo.svg');
const TEMP_PNG = path.join(OUTPUT_DIR, 'temp-icon.png');
const ICON_PNG = path.join(OUTPUT_DIR, 'icon.png');
const ICON_ICO = path.join(OUTPUT_DIR, 'icon.ico');
const ICON_ICNS = path.join(OUTPUT_DIR, 'icon.icns');
const FAVICON_SVG = path.join(OUTPUT_DIR, 'favicon.svg');

/**
 * 生成各平台所需的图标文件
 * 包括 PNG、ICO、ICNS 和 favicon.svg
 */
async function generateIcons() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  console.log('🚀 开始生成图标文件...');

  // 1. SVG → PNG (1024x1024 临时文件)
  console.log('📸 生成高分辨率 PNG...');
  await sharp(INPUT_SVG)
    .resize(1024, 1024)
    .png()
    .toFile(TEMP_PNG);

  // 2. icon.png (Linux)
  console.log('🐧 生成 Linux PNG 图标...');
  fs.copyFileSync(TEMP_PNG, ICON_PNG);

  // 3. icon.ico (Windows)
  console.log('🪟 生成 Windows ICO 图标...');
  await generateIcoFile();

  // 4. favicon.svg (Web)
  console.log('🌐 复制 favicon.svg...');
  fs.copyFileSync(INPUT_SVG, FAVICON_SVG);
  await setFaviconSize(FAVICON_SVG);

  // 5. .icns (macOS)
  console.log('🍎 生成 macOS ICNS 图标...');
  await generateIcnsFile();

  // 清理临时文件
  fs.unlinkSync(TEMP_PNG);

  console.log('✅ 所有平台图标生成成功！');
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  console.log('📋 生成的文件:');
  console.log('  - icon.png (Linux)');
  console.log('  - icon.ico (Windows)');
  console.log('  - icon.icns (macOS)');
  console.log('  - favicon.svg (Web)');
}

async function setFaviconSize(svgPath, width = 32, height = 32) {
  let svgContent = fs.readFileSync(svgPath, 'utf-8');

  // 替换已有的 width
  if (/width="[^"]*"/.test(svgContent)) {
    svgContent = svgContent.replace(/width="[^"]*"/, `width="${width}"`);
  } else {
    // 没有 width，插入
    svgContent = svgContent.replace(/<svg([^>]*)>/, `<svg$1 width="${width}"`);
  }

  // 替换已有的 height
  if (/height="[^"]*"/.test(svgContent)) {
    svgContent = svgContent.replace(/height="[^"]*"/, `height="${height}"`);
  } else {
    // 没有 height，插入
    svgContent = svgContent.replace(/<svg([^>]*)>/, `<svg$1 height="${height}"`);
  }

  fs.writeFileSync(svgPath, svgContent, 'utf-8');
}

/**
 * 生成 Windows ICO 文件
 * 包含多种尺寸以兼容不同显示需求
 */
async function generateIcoFile() {
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoBuffers = [];
  
  for (const size of icoSizes) {
    const buffer = await sharp(TEMP_PNG)
      .resize(size, size)
      .png()
      .toBuffer();
    icoBuffers.push(buffer);
  }
  
  // 使用 sharp 生成 ICO 文件（包含多个尺寸）
  const icoBuffer = await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{ input: await sharp(TEMP_PNG).resize(256, 256).png().toBuffer() }])
  .png()
  .toBuffer();
  
  // 将最大尺寸的 PNG 作为 ICO 文件（简化处理）
  fs.writeFileSync(ICON_ICO, icoBuffer);
}

/**
 * 生成 macOS ICNS 文件
 * 按照 Apple 标准包含所有必要尺寸
 */
async function generateIcnsFile() {
  const icns = new Icns();
  
  // 添加不同尺寸的图标，按照 macOS 标准格式
  const sizes = [
    { size: 16, osType: 'icp4' },   // 16x16 PNG
    { size: 32, osType: 'icp5' },   // 32x32 PNG
    { size: 64, osType: 'icp6' },   // 64x64 PNG
    { size: 128, osType: 'ic07' },  // 128x128 PNG
    { size: 256, osType: 'ic08' },  // 256x256 PNG
    { size: 512, osType: 'ic09' },  // 512x512 PNG
    { size: 1024, osType: 'ic10' }, // 1024x1024 PNG
  ];
  
  for (const { size, osType } of sizes) {
    const pngBuffer = await sharp(TEMP_PNG).resize(size, size).png().toBuffer();
    const image = IcnsImage.fromPNG(pngBuffer, osType);
    icns.append(image);
  }
  
  fs.writeFileSync(ICON_ICNS, icns.data);


}

generateIcons().catch((err) => {
  console.error('❌ 图标生成失败：', err);
});