import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export interface GarageTextures {
  floor: THREE.CanvasTexture;
  pegboard: THREE.CanvasTexture;
  cardboardFront: THREE.CanvasTexture;
  newYorkPlate: THREE.CanvasTexture;
  norwayPlate: THREE.CanvasTexture;
  hongKongPlate: THREE.CanvasTexture;
}

function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  repeat?: [number, number],
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create a 2D drawing context.');
  }

  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }

  return texture;
}

function addSpeckles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  color: string,
  maxRadius = 6,
) {
  ctx.save();
  ctx.fillStyle = color;

  for (let index = 0; index < count; index += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * maxRadius;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.stroke();
}

function drawMountSlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.fillStyle = '#f4f5f3';
  fillRoundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = 'rgba(20, 28, 34, 0.18)';
  ctx.lineWidth = 5;
  strokeRoundRect(ctx, x, y, width, height, radius);
}

function createFloorTexture() {
  return createCanvasTexture(
    1024,
    1024,
    (ctx, width, height) => {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#7d6958');
      gradient.addColorStop(0.5, '#665344');
      gradient.addColorStop(1, '#3c3026');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      addSpeckles(ctx, width, height, 1800, 'rgba(255,255,255,0.018)', 3);
      addSpeckles(ctx, width, height, 950, 'rgba(25, 18, 14, 0.08)', 10);

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#2d241d';
      ctx.beginPath();
      ctx.ellipse(width * 0.28, height * 0.32, 180, 90, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(width * 0.72, height * 0.68, 250, 110, -0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = '#c7b09a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(width * 0.08, height * 0.8);
      ctx.bezierCurveTo(
        width * 0.2,
        height * 0.58,
        width * 0.45,
        height * 0.9,
        width * 0.64,
        height * 0.74,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    [3.4, 3.4],
  );
}

function createPegboardTexture() {
  return createCanvasTexture(1400, 680, (ctx, width, height) => {
    ctx.fillStyle = '#d7d2cc';
    ctx.fillRect(0, 0, width, height);

    for (let y = 18; y < height; y += 18) {
      for (let x = 18; x < width; x += 18) {
        ctx.fillStyle = 'rgba(94, 84, 76, 0.42)';
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5e564e';
    ctx.lineWidth = 18;

    const wrenchXs = [190, 255, 320, 385, 450, 515, 580, 645, 710];
    wrenchXs.forEach((x, index) => {
      ctx.strokeStyle = index % 2 === 0 ? '#8c877f' : '#6f6b66';
      ctx.beginPath();
      ctx.moveTo(x, 110);
      ctx.lineTo(x - 18, 290);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x + 8, 98, 24, 0.3, Math.PI + 0.15);
      ctx.stroke();
    });

    ctx.strokeStyle = '#6c3a2c';
    ctx.lineWidth = 12;
    [880, 925, 970, 1015, 1060].forEach((x, index) => {
      ctx.beginPath();
      ctx.moveTo(x, 400 + index * 8);
      ctx.lineTo(x, 560);
      ctx.stroke();
    });

    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 10;
    [[880, 390], [925, 396], [970, 404], [1015, 410], [1060, 418]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.fillStyle = '#cf932b';
    ctx.fillRect(1110, 120, 14, 180);
    ctx.fillStyle = '#23313c';
    ctx.fillRect(1170, 125, 18, 160);
    ctx.fillStyle = '#7892a8';
    ctx.fillRect(1225, 132, 18, 150);

    ctx.strokeStyle = '#df612f';
    ctx.lineWidth = 16;
    [1050, 1125].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, 470, 38, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 38, 470);
      ctx.lineTo(x - 8, 560);
      ctx.moveTo(x + 38, 470);
      ctx.lineTo(x + 8, 560);
      ctx.stroke();
    });

    ctx.strokeStyle = '#4c4c4c';
    ctx.lineWidth = 12;
    [170, 225, 280, 335, 390, 445].forEach((x, index) => {
      ctx.beginPath();
      ctx.moveTo(x, 360);
      ctx.lineTo(x - 18 + index * 2, 510);
      ctx.stroke();
    });

    ctx.fillStyle = '#2d5a96';
    ctx.fillRect(250, 560, 210, 28);
    ctx.fillStyle = '#f3f3f1';
    [275, 330, 385, 440].forEach((x) => {
      ctx.fillRect(x, 528, 20, 52);
    });
  });
}

function createCardboardFrontTexture() {
  return createCanvasTexture(1024, 700, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#b88a58');
    gradient.addColorStop(0.45, '#c49762');
    gradient.addColorStop(1, '#9f7348');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    addSpeckles(ctx, width, height, 300, 'rgba(68, 42, 22, 0.05)', 4);

    ctx.strokeStyle = 'rgba(97, 60, 35, 0.3)';
    ctx.lineWidth = 16;
    ctx.strokeRect(22, 22, width - 44, height - 44);

    ctx.fillStyle = '#2e1c12';
    ctx.font = '88px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText('Engineering', width / 2, height * 0.48);
    ctx.font = '118px Trebuchet MS';
    ctx.fillText('Projects!', width / 2, height * 0.68);
  });
}

function createNewYorkPlateTexture() {
  return createCanvasTexture(1800, 900, (ctx, width, height) => {
    ctx.fillStyle = '#f9fbfb';
    ctx.fillRect(0, 0, width, height);

    const navy = '#062e50';
    const orange = '#f5ad37';
    const paleBlue = '#d8e9f4';

    ctx.strokeStyle = '#1b252d';
    ctx.lineWidth = 10;
    strokeRoundRect(ctx, 18, 18, width - 36, height - 36, 58);
    ctx.strokeStyle = navy;
    ctx.lineWidth = 8;
    strokeRoundRect(ctx, 38, 48, width - 76, height - 96, 42);

    drawMountSlot(ctx, 330, 122, 88, 38, 20);
    drawMountSlot(ctx, width - 418, 122, 88, 38, 20);
    drawMountSlot(ctx, 330, height - 174, 88, 38, 20);
    drawMountSlot(ctx, width - 418, height - 174, 88, 38, 20);

    ctx.fillStyle = navy;
    ctx.fillRect(38, 202, 430, 10);
    ctx.fillRect(width - 468, 202, 430, 10);
    ctx.fillStyle = orange;
    ctx.fillRect(38, 222, 430, 26);
    ctx.fillRect(width - 468, 222, 430, 26);

    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.font = '700 130px Georgia, "Times New Roman", serif';
    ctx.fillText('NEW YORK', width / 2, 180);

    ctx.font = '900 335px "Arial Narrow", "Impact", sans-serif';
    ctx.fillText('NY', 455, 610);
    ctx.fillText('13617', 1365, 610);

    ctx.beginPath();
    ctx.moveTo(870, 428);
    ctx.lineTo(912, 405);
    ctx.lineTo(940, 442);
    ctx.lineTo(930, 510);
    ctx.lineTo(965, 528);
    ctx.lineTo(920, 556);
    ctx.lineTo(862, 534);
    ctx.lineTo(842, 474);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = paleBlue;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(34, 760);
    ctx.quadraticCurveTo(340, 670, 650, 750);
    ctx.quadraticCurveTo(960, 830, 1280, 742);
    ctx.quadraticCurveTo(1515, 684, 1768, 770);
    ctx.lineTo(1768, 820);
    ctx.lineTo(34, 820);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = orange;
    ctx.strokeStyle = navy;
    ctx.lineWidth = 4;
    ctx.font = '900 116px Georgia, "Times New Roman", serif';
    ctx.strokeText('EXCELSIOR', width / 2, 812);
    ctx.fillText('EXCELSIOR', width / 2, 812);
    ctx.textAlign = 'left';
  });
}

function createNorwayPlateTexture() {
  return createCanvasTexture(1800, 420, (ctx, width, height) => {
    ctx.fillStyle = '#f7f9f9';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 14;
    strokeRoundRect(ctx, 12, 18, width - 24, height - 36, 28);
    ctx.strokeStyle = '#b9bec4';
    ctx.lineWidth = 3;
    strokeRoundRect(ctx, 36, 42, width - 72, height - 84, 16);

    ctx.fillStyle = '#1238d8';
    fillRoundRect(ctx, 24, 30, 168, height - 60, 22);

    ctx.fillStyle = '#ef2b2d';
    ctx.fillRect(62, 100, 74, 64);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(88, 100, 15, 64);
    ctx.fillRect(62, 125, 74, 15);
    ctx.fillStyle = '#00205b';
    ctx.fillRect(92, 100, 8, 64);
    ctx.fillRect(62, 128, 74, 8);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '700 100px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('N', 108, 305);

    ctx.fillStyle = '#111111';
    ctx.font = '900 230px "Arial Narrow", "Impact", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 6;
    ctx.fillText('NO 1599', 1000, 290);
    ctx.shadowColor = 'transparent';
    ctx.textAlign = 'left';
  });
}

function createHongKongPlateTexture() {
  return createCanvasTexture(1200, 600, (ctx, width, height) => {
    const yellow = '#d9a900';
    ctx.fillStyle = yellow;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#c28f00';
    ctx.lineWidth = 18;
    strokeRoundRect(ctx, 20, 20, width - 40, height - 40, 38);
    ctx.strokeStyle = '#060606';
    ctx.lineWidth = 14;
    strokeRoundRect(ctx, 44, 44, width - 88, height - 88, 28);
    ctx.strokeStyle = '#fff0a7';
    ctx.lineWidth = 3;
    strokeRoundRect(ctx, 62, 62, width - 124, height - 124, 18);

    drawMountSlot(ctx, 200, 84, 86, 32, 16);
    drawMountSlot(ctx, width - 286, 84, 86, 32, 16);
    drawMountSlot(ctx, 200, height - 116, 86, 32, 16);
    drawMountSlot(ctx, width - 286, height - 116, 86, 32, 16);

    ctx.fillStyle = '#050505';
    ctx.textAlign = 'center';
    ctx.font = '900 240px "Arial Narrow", "Impact", sans-serif';
    ctx.fillText('HK', width / 2, 275);
    ctx.font = '900 260px "Arial Narrow", "Impact", sans-serif';
    ctx.fillText('00000', width / 2, 506);
    ctx.textAlign = 'left';
  });
}

export function useGarageTextures() {
  const textures = useMemo<GarageTextures>(
    () => ({
      floor: createFloorTexture(),
      pegboard: createPegboardTexture(),
      cardboardFront: createCardboardFrontTexture(),
      newYorkPlate: createNewYorkPlateTexture(),
      norwayPlate: createNorwayPlateTexture(),
      hongKongPlate: createHongKongPlateTexture(),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      Object.values(textures).forEach((texture) => texture.dispose());
    };
  }, [textures]);

  return textures;
}
