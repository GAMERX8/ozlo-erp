const fs = require('fs');
const path = require('path');

const logosDir = path.join(process.cwd(), 'public', 'logos');
const files = ['logo_black.png', 'logo_white.png', 'icon_black.png', 'icon_white.png'];

files.forEach(file => {
  const filePath = path.join(logosDir, file);
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    // PNG dimensions are at offset 16 (width) and 20 (height), 4 bytes each, big-endian
    const width = buffer.readInt32BE(16);
    const height = buffer.readInt32BE(20);
    console.log(`${file}: ${width}x${height}`);
  } else {
    console.log(`${file}: No existe`);
  }
});
