import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function generateFavicons() {
  const svgPath = join(process.cwd(), 'public', 'basketball-twemoji.svg');
  const svgBuffer = readFileSync(svgPath);

  // 各サイズのPNG を生成
  const sizes = [16, 32, 48, 64, 128, 256, 512];

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(process.cwd(), 'public', `basketball-${size}.png`));
    console.log(`✅ Generated basketball-${size}.png`);
  }

  // favicon.ico用に32x32のPNGを生成
  const favicon32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();

  // ICO形式はPNGを埋め込む形式
  writeFileSync(
    join(process.cwd(), 'src', 'app', 'favicon.ico'),
    favicon32
  );
  console.log('✅ Generated favicon.ico (32x32 PNG embedded)');

  // icon.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(process.cwd(), 'src', 'app', 'icon.png'));
  console.log('✅ Generated icon.png');

  // apple-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(process.cwd(), 'src', 'app', 'apple-icon.png'));
  console.log('✅ Generated apple-icon.png');
}

generateFavicons().catch(console.error);
