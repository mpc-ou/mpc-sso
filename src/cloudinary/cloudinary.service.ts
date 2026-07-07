import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

interface UploadFile {
  buffer: Buffer;
}

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: UploadFile,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'mpc-sso-avatars',
          transformation: [
            {
              width: 512,
              height: 512,
              crop: 'fill',
              gravity: 'face',
              quality: 'auto',
            },
          ],
        },
        (error, result) => {
          if (error) return reject(new Error(error.message));
          if (!result)
            return reject(new Error('Cloudinary upload returned no result'));
          resolve(result);
        },
      );

      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(upload);
    });
  }

  async deleteFile(url: string): Promise<unknown> {
    const publicId = this.extractPublicId(url);
    if (!publicId) return;
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Cloudinary delete failed',
      );
    }
  }

  private extractPublicId(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      let path = parts[1];
      const pathParts = path.split('/');
      if (
        pathParts[0].startsWith('v') &&
        /^\d+$/.test(pathParts[0].substring(1))
      ) {
        pathParts.shift();
      }
      path = pathParts.join('/');
      const dotIndex = path.lastIndexOf('.');
      if (dotIndex !== -1) {
        path = path.substring(0, dotIndex);
      }
      return path;
    } catch {
      return null;
    }
  }
}
