/**
 * UV sphere 参数化生成。
 * 法线 = normalize(position)（球心在原点），无需切线。
 */

export interface SphereMesh {
  positions: Float32Array; // 3 * vertCount
  normals: Float32Array; // 3 * vertCount
  indices: Uint16Array; // 6 * faceCount
  vertCount: number;
}

export function createSphere(segments = 48, sectors = 32): SphereMesh {
  const vertCount = (segments + 1) * (sectors + 1);
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);

  let p = 0;
  let n = 0;
  for (let i = 0; i <= segments; i++) {
    const v = i / segments; // 0..1
    const phi = v * Math.PI; // 0..PI (极角，从顶到底)
    const sp = Math.sin(phi);
    const cp = Math.cos(phi);
    for (let j = 0; j <= sectors; j++) {
      const u = j / sectors; // 0..1
      const theta = u * 2 * Math.PI; // 0..2PI (方位角)
      const x = sp * Math.cos(theta);
      const y = cp;
      const z = sp * Math.sin(theta);
      positions[p++] = x;
      positions[p++] = y;
      positions[p++] = z;
      // 法线 = 位置归一化（球心原点，半径 1）
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      normals[n++] = x / len;
      normals[n++] = y / len;
      normals[n++] = z / len;
    }
  }

  // 索引：每格两个三角形
  const faceCount = segments * sectors;
  const indices = new Uint16Array(faceCount * 6);
  let k = 0;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sectors; j++) {
      const a = i * (sectors + 1) + j;
      const b = a + sectors + 1;
      // tri1: a, b, a+1
      indices[k++] = a;
      indices[k++] = b;
      indices[k++] = a + 1;
      // tri2: a+1, b, b+1
      indices[k++] = a + 1;
      indices[k++] = b;
      indices[k++] = b + 1;
    }
  }

  return { positions, normals, indices, vertCount };
}
