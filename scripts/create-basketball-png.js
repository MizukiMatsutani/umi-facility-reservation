// バスケットボールアイコンをCanvas APIで描画してPNGを生成
// ブラウザで実行してダウンロードする用

const sizes = [16, 32, 48];

sizes.forEach(size => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // バスケットボールを描画
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 1;

  // グラデーション
  const gradient = ctx.createRadialGradient(
    centerX - radius * 0.3,
    centerY - radius * 0.3,
    0,
    centerX,
    centerY,
    radius
  );
  gradient.addColorStop(0, '#FF8C42');
  gradient.addColorStop(1, '#FF6B35');

  // ボール本体
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = '#C44900';
  ctx.lineWidth = Math.max(1, size / 32);
  ctx.stroke();

  // ライン（簡略化版）
  ctx.strokeStyle = '#C44900';
  ctx.lineWidth = Math.max(1, size / 24);

  // 縦線
  ctx.beginPath();
  ctx.moveTo(centerX, 1);
  ctx.lineTo(centerX, size - 1);
  ctx.stroke();

  // 横線
  ctx.beginPath();
  ctx.moveTo(1, centerY);
  ctx.lineTo(size - 1, centerY);
  ctx.stroke();

  // ダウンロード
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `basketball-${size}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

console.log('Basketball PNGs generated!');
