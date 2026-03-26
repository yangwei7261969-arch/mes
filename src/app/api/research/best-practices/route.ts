import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    const response = await client.webSearch(
      query || '服装生产管理系统 ERP 工票管理 最佳实践',
      10,
      true
    );

    return NextResponse.json({
      success: true,
      summary: response.summary,
      results: response.web_items?.map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        siteName: item.site_name,
      })) || [],
    });
  } catch (error) {
    console.error('Research search error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '搜索失败' 
    }, { status: 500 });
  }
}
