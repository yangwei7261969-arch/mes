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

// GET - 获取文件下载链接
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileKey = searchParams.get('file_key');
    
    if (!fileKey) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少文件路径参数' 
      }, { status: 400 });
    }

    // 生成签名下载URL（有效期1小时）
    const downloadUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 60 * 60, // 1小时
    });

    return NextResponse.json({
      success: true,
      data: {
        download_url: downloadUrl,
      }
    });
  } catch (error: any) {
    console.error('Get download url error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '获取下载链接失败' 
    }, { status: 500 });
  }
}
