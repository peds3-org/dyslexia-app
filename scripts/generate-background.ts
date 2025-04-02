import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 村の背景生成を削除
// generateVillageBackground();

async function generateVillageBackground() {
  try {
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: "A peaceful Japanese village in anime style, with traditional houses, mountains in the background, soft pastel colors, suitable for children's game, Studio Ghibli style",
          negative_prompt: "dark, scary, realistic, photographic, text, words",
          width: 1024,
          height: 1024,
          num_outputs: 1,
          scheduler: "K_EULER",
          num_inference_steps: 50,
          guidance_scale: 7.5,
        }
      }
    );

    if (Array.isArray(output) && output.length > 0) {
      const imageUrl = output[0];
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      
      const assetsDir = path.join(process.cwd(), 'assets', 'backgrounds');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(assetsDir, 'village.png'), Buffer.from(buffer));
      console.log('背景画像が正常に生成され、保存されました！');
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
} 