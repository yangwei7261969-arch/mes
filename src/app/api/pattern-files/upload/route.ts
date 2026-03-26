import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// POST - 上传唛架/纸样文件
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('file_type') as string; // marker/pattern
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: '请选择要上传的文件' 
      }, { status: 400 });
    }

    if (!fileType) {
      return NextResponse.json({ 
        success: false, 
        error: '请选择文件类型' 
      }, { status: 400 });
    }

    // 读取文件内容
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // 生成存储路径
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `pattern-files/${fileType}/${timestamp}_${sanitizedFileName}`;

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: fileBuffer,
      fileName: storagePath,
      contentType: file.type || 'application/octet-stream',
    });

    // 生成访问URL（有效期7天）
    const fileUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 7 * 24 * 60 * 60, // 7天
    });

    return NextResponse.json({
      success: true,
      data: {
        file_key: fileKey,
        file_path: storagePath,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: fileType,
      }
    });
  } catch (error: any) {
    console.error('Upload pattern file error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '上传失败' 
    }, { status: 500 });
  }
}
