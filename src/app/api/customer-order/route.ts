import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 客户下单系统API (B2B/B2C)
 * 
 * 功能：
 * • 客户浏览款式
 * • 在线下单
 * • 订单跟踪
 * • 购物车
 * • 在线支付
 * • 订单历史
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'catalog';

    switch (action) {
      case 'catalog':
        return await getCatalog(client, searchParams);
      case 'style-detail':
        return await getStyleDetail(client, searchParams);
      case 'cart':
        return await getCart(client, searchParams);
      case 'orders':
        return await getCustomerOrders(client, searchParams);
      case 'order-detail':
        return await getOrderDetail(client, searchParams);
      case 'track':
        return await trackOrder(client, searchParams);
      case 'history':
        return await getOrderHistory(client, searchParams);
      case 'recommendations':
        return await getRecommendations(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Customer order API error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'add-to-cart':
        return await addToCart(client, data);
      case 'update-cart':
        return await updateCart(client, data);
      case 'remove-from-cart':
        return await removeFromCart(client, data);
      case 'checkout':
        return await checkout(client, data);
      case 'create-order':
        return await createOrder(client, data);
      case 'cancel-order':
        return await cancelOrder(client, data);
      case 'payment':
        return await processPayment(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Customer order operation error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 款式目录
 */
async function getCatalog(client: any, searchParams: URLSearchParams) {
  const customerId = searchParams.get('customer_id');
  const category = searchParams.get('category');
  const season = searchParams.get('season');
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  let query = client
    .from('styles')
    .select(`
      *,
      style_images (url, is_primary)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }
  if (season) {
    query = query.eq('season', season);
  }
  if (minPrice) {
    query = query.gte('wholesale_price', parseFloat(minPrice));
  }
  if (maxPrice) {
    query = query.lte('wholesale_price', parseFloat(maxPrice));
  }

  // 分页
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // 获取客户专属价格（如果有）
  let stylesWithPrice = data || [];
  if (customerId) {
    stylesWithPrice = await Promise.all(
      (data || []).map(async (style: any) => {
        const { data: customerPrice } = await client
          .from('customer_style_prices')
          .select('price')
          .eq('customer_id', customerId)
          .eq('style_id', style.id)
          .single();

        return {
          ...style,
          customerPrice: customerPrice?.price,
          effectivePrice: customerPrice?.price || style.wholesale_price
        };
      })
    );
  }

  // 获取分类统计
  const { data: categories } = await client
    .from('styles')
    .select('category')
    .eq('is_active', true);

  const categoryStats: Record<string, number> = {};
  categories?.forEach((c: any) => {
    categoryStats[c.category || '其他'] = (categoryStats[c.category || '其他'] || 0) + 1;
  });

  return NextResponse.json({
    success: true,
    data: {
      styles: stylesWithPrice,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      filters: { category, season, minPrice, maxPrice },
      categoryStats
    }
  });
}

/**
 * 款式详情
 */
async function getStyleDetail(client: any, searchParams: URLSearchParams) {
  const styleId = searchParams.get('style_id');
  const customerId = searchParams.get('customer_id');

  if (!styleId) {
    return NextResponse.json({ success: false, error: '缺少款式ID' }, { status: 400 });
  }

  const { data: style, error } = await client
    .from('styles')
    .select(`
      *,
      style_images (*),
      style_colors (*),
      style_sizes (*),
      style_bom (*)
    `)
    .eq('id', styleId)
    .single();

  if (error || !style) {
    return NextResponse.json({ success: false, error: '款式不存在' }, { status: 404 });
  }

  // 获取客户专属价格
  let effectivePrice = style.wholesale_price;
  let priceTier = null;

  if (customerId) {
    const { data: customerPrice } = await client
      .from('customer_style_prices')
      .select('*')
      .eq('customer_id', customerId)
      .eq('style_id', styleId)
      .single();

    if (customerPrice) {
      effectivePrice = customerPrice.price;
      priceTier = customerPrice.price_tier;
    }
  }

  // 获取MOQ信息
  const { data: moqInfo } = await client
    .from('style_moq')
    .select('*')
    .eq('style_id', styleId);

  // 获取库存信息（如果客户可见）
  const { data: stockInfo } = await client
    .from('style_stock')
    .select('*')
    .eq('style_id', styleId);

  // 相似款式推荐
  const { data: similarStyles } = await client
    .from('styles')
    .select('id, style_no, style_name, wholesale_price, style_images(url, is_primary)')
    .eq('category', style.category)
    .neq('id', styleId)
    .limit(6);

  return NextResponse.json({
    success: true,
    data: {
      style,
      pricing: {
        retailPrice: style.retail_price,
        wholesalePrice: style.wholesale_price,
        effectivePrice,
        priceTier,
        currency: style.currency || 'CNY'
      },
      options: {
        colors: style.style_colors || [],
        sizes: style.style_sizes || []
      },
      moq: moqInfo || [],
      stock: stockInfo || [],
      similarStyles: similarStyles || []
    }
  });
}

/**
 * 获取购物车
 */
async function getCart(client: any, searchParams: URLSearchParams) {
  const customerId = searchParams.get('customer_id');
  const cartId = searchParams.get('cart_id');

  if (!customerId && !cartId) {
    return NextResponse.json({ success: false, error: '缺少客户ID或购物车ID' }, { status: 400 });
  }

  let query = client
    .from('cart_items')
    .select(`
      *,
      styles (id, style_no, style_name, wholesale_price),
      style_colors (id, color_code, color_name),
      style_sizes (id, size_code, size_name)
    `);

  if (cartId) {
    query = query.eq('cart_id', cartId);
  } else {
    query = query.eq('customer_id', customerId);
  }

  const { data: items, error } = await query;

  if (error) throw error;

  // 计算总价
  let subtotal = 0;
  const itemsWithPrice = (items || []).map((item: any) => {
    const price = item.styles?.wholesale_price || 0;
    const itemTotal = price * (item.quantity || 0);
    subtotal += itemTotal;

    return {
      ...item,
      unitPrice: price,
      totalPrice: itemTotal
    };
  });

  // 应用折扣
  let discount = 0;
  if (customerId) {
    const { data: customerDiscount } = await client
      .from('customer_discounts')
      .select('discount_rate')
      .eq('customer_id', customerId)
      .single();

    if (customerDiscount) {
      discount = subtotal * customerDiscount.discount_rate;
    }
  }

  const total = subtotal - discount;

  return NextResponse.json({
    success: true,
    data: {
      items: itemsWithPrice,
      summary: {
        itemCount: items?.length || 0,
        totalQuantity: items?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0,
        subtotal,
        discount,
        total
      }
    }
  });
}

/**
 * 客户订单列表
 */
async function getCustomerOrders(client: any, searchParams: URLSearchParams) {
  const customerId = searchParams.get('customer_id');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!customerId) {
    return NextResponse.json({ success: false, error: '缺少客户ID' }, { status: 400 });
  }

  let query = client
    .from('customer_orders')
    .select(`
      *,
      customer_order_items (
        id, style_id, quantity, unit_price, total_price,
        styles (style_no, style_name)
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // 状态统计
  const { data: statusStats } = await client
    .from('customer_orders')
    .select('status')
    .eq('customer_id', customerId);

  const stats: Record<string, number> = {};
  statusStats?.forEach((s: any) => {
    stats[s.status] = (stats[s.status] || 0) + 1;
  });

  return NextResponse.json({
    success: true,
    data: {
      orders: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      statusStats: stats
    }
  });
}

/**
 * 订单详情
 */
async function getOrderDetail(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const orderNo = searchParams.get('order_no');

  if (!orderId && !orderNo) {
    return NextResponse.json({ success: false, error: '缺少订单ID或订单号' }, { status: 400 });
  }

  let query = client
    .from('customer_orders')
    .select(`
      *,
      customers (id, name, email, phone),
      customer_order_items (
        *,
        styles (id, style_no, style_name, style_images(url)),
        style_colors (color_code, color_name),
        style_sizes (size_code, size_name)
      ),
      order_payments (*),
      order_shipping (*)
    `);

  if (orderId) {
    query = query.eq('id', orderId);
  } else {
    query = query.eq('order_no', orderNo);
  }

  const { data: order, error } = await query.single();

  if (error || !order) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  // 获取生产进度（如果已进入生产）
  let productionProgress = null;
  if (order.production_order_id) {
    const { data: production } = await client
      .from('production_orders')
      .select(`
        id, order_no, status, completed_quantity,
        process_tracking (stage, status, completed_at)
      `)
      .eq('id', order.production_order_id)
      .single();

    productionProgress = production;
  }

  return NextResponse.json({
    success: true,
    data: {
      order,
      productionProgress
    }
  });
}

/**
 * 订单追踪
 */
async function trackOrder(client: any, searchParams: URLSearchParams) {
  const orderNo = searchParams.get('order_no');
  const trackingCode = searchParams.get('tracking_code');

  if (!orderNo && !trackingCode) {
    return NextResponse.json({ success: false, error: '缺少订单号或追踪码' }, { status: 400 });
  }

  // 查找订单
  let query = client
    .from('customer_orders')
    .select(`
      id, order_no, status, created_at, estimated_delivery,
      customer_order_items (styles(style_no, style_name))
    `);

  if (orderNo) {
    query = query.eq('order_no', orderNo);
  } else {
    query = query.eq('tracking_code', trackingCode);
  }

  const { data: order } = await query.single();

  if (!order) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  // 获取状态历史
  const { data: statusHistory } = await client
    .from('order_status_history')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  // 构建追踪时间线
  const timeline = buildTrackingTimeline(statusHistory || [], order);

  // 获取物流信息
  const { data: shipping } = await client
    .from('order_shipping')
    .select('*')
    .eq('order_id', order.id)
    .single();

  return NextResponse.json({
    success: true,
    data: {
      order: {
        orderNo: order.order_no,
        status: order.status,
        createdAt: order.created_at,
        estimatedDelivery: order.estimated_delivery,
        items: order.customer_order_items
      },
      timeline,
      shipping
    }
  });
}

/**
 * 订单历史（统计）
 */
async function getOrderHistory(client: any, searchParams: URLSearchParams) {
  const customerId = searchParams.get('customer_id');
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  if (!customerId) {
    return NextResponse.json({ success: false, error: '缺少客户ID' }, { status: 400 });
  }

  // 月度订单统计
  const { data: monthlyOrders } = await client
    .from('customer_orders')
    .select('total_amount, created_at, status')
    .eq('customer_id', customerId)
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`);

  const monthlyStats: Record<string, { count: number; total: number }> = {};
  monthlyOrders?.forEach((o: any) => {
    const month = o.created_at.slice(0, 7);
    if (!monthlyStats[month]) {
      monthlyStats[month] = { count: 0, total: 0 };
    }
    monthlyStats[month].count++;
    monthlyStats[month].total += o.total_amount || 0;
  });

  // 购买款式统计
  const { data: stylePurchases } = await client
    .from('customer_order_items')
    .select(`
      quantity, total_price,
      styles (id, style_no, style_name, category)
    `)
    .eq('customer_order.customer_id', customerId);

  const styleStats: Record<string, { count: number; total: number }> = {};
  stylePurchases?.forEach((p: any) => {
    const category = p.styles?.category || '其他';
    if (!styleStats[category]) {
      styleStats[category] = { count: 0, total: 0 };
    }
    styleStats[category].count += p.quantity || 0;
    styleStats[category].total += p.total_price || 0;
  });

  // 总计
  const totalSpent = Object.values(monthlyStats).reduce((sum: number, m: any) => sum + m.total, 0);
  const totalOrders = Object.values(monthlyStats).reduce((sum: number, m: any) => sum + m.count, 0);

  return NextResponse.json({
    success: true,
    data: {
      year,
      monthlyStats,
      styleStats,
      summary: {
        totalOrders,
        totalSpent,
        avgOrderValue: totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0
      }
    }
  });
}

/**
 * 推荐款式
 */
async function getRecommendations(client: any, searchParams: URLSearchParams) {
  const customerId = searchParams.get('customer_id');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!customerId) {
    return NextResponse.json({ success: false, error: '缺少客户ID' }, { status: 400 });
  }

  // 获取客户购买历史
  const { data: purchaseHistory } = await client
    .from('customer_order_items')
    .select('style_id, styles(category)')
    .eq('customer_order.customer_id', customerId);

  // 统计偏好类别
  const categoryPreferences: Record<string, number> = {};
  purchaseHistory?.forEach((p: any) => {
    const category = p.styles?.category;
    if (category) {
      categoryPreferences[category] = (categoryPreferences[category] || 0) + 1;
    }
  });

  // 获取推荐的款式
  const topCategories = Object.entries(categoryPreferences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  const { data: recommendedStyles } = await client
    .from('styles')
    .select('id, style_no, style_name, wholesale_price, category, style_images(url, is_primary)')
    .in('category', topCategories.length > 0 ? topCategories : ['tshirt'])
    .not('id', 'in', `(${(purchaseHistory || []).map((p: any) => p.style_id).join(',')})`)
    .limit(limit);

  // 热门款式推荐
  const { data: hotStyles } = await client
    .from('customer_order_items')
    .select(`
      style_id,
      styles (id, style_no, style_name, wholesale_price, style_images(url))
    `)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .limit(limit);

  return NextResponse.json({
    success: true,
    data: {
      basedOnHistory: recommendedStyles || [],
      hotStyles: (hotStyles || []).map((h: any) => h.styles).filter(Boolean),
      preferences: categoryPreferences
    }
  });
}

/**
 * 加入购物车
 */
async function addToCart(client: any, data: any) {
  const { customerId, cartId, styleId, colorId, sizeId, quantity, notes } = data;

  // 检查是否已存在相同商品
  let query = client
    .from('cart_items')
    .select('*')
    .eq('style_id', styleId);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }
  if (cartId) {
    query = query.eq('cart_id', cartId);
  }
  if (colorId) {
    query = query.eq('color_id', colorId);
  }
  if (sizeId) {
    query = query.eq('size_id', sizeId);
  }

  const { data: existing } = await query.single();

  if (existing) {
    // 更新数量
    const { data: updated, error } = await client
      .from('cart_items')
      .update({
        quantity: (existing.quantity || 0) + quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: updated,
      message: '数量已更新'
    });
  }

  // 新增购物车项
  const cartItem = {
    customer_id: customerId,
    cart_id: cartId,
    style_id: styleId,
    color_id: colorId,
    size_id: sizeId,
    quantity,
    notes,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('cart_items')
    .insert(cartItem)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: created,
    message: '已加入购物车'
  });
}

/**
 * 更新购物车
 */
async function updateCart(client: any, data: any) {
  const { itemId, quantity, notes } = data;

  const { data: updated, error } = await client
    .from('cart_items')
    .update({
      quantity,
      notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: updated,
    message: '购物车已更新'
  });
}

/**
 * 从购物车移除
 */
async function removeFromCart(client: any, data: any) {
  const { itemId } = data;

  const { error } = await client
    .from('cart_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: '已从购物车移除'
  });
}

/**
 * 结算
 */
async function checkout(client: any, data: any) {
  const { customerId, cartId, shippingAddress, billingAddress, paymentMethod, discountCode } = data;

  // 获取购物车
  let query = client.from('cart_items').select(`
    *,
    styles (id, style_no, wholesale_price)
  `);

  if (cartId) {
    query = query.eq('cart_id', cartId);
  } else {
    query = query.eq('customer_id', customerId);
  }

  const { data: cartItems } = await query;

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ success: false, error: '购物车为空' }, { status: 400 });
  }

  // 计算金额
  let subtotal = 0;
  const orderItems = cartItems.map((item: any) => {
    const price = item.styles?.wholesale_price || 0;
    const total = price * item.quantity;
    subtotal += total;

    return {
      style_id: item.style_id,
      color_id: item.color_id,
      size_id: item.size_id,
      quantity: item.quantity,
      unit_price: price,
      total_price: total,
      notes: item.notes
    };
  });

  // 应用折扣
  let discount = 0;
  if (discountCode) {
    const { data: discountInfo } = await client
      .from('discount_codes')
      .select('*')
      .eq('code', discountCode)
      .eq('is_active', true)
      .single();

    if (discountInfo && new Date(discountInfo.valid_until) > new Date()) {
      discount = discountInfo.discount_type === 'percentage'
        ? subtotal * discountInfo.discount_value
        : discountInfo.discount_value;
    }
  }

  // 计算运费
  const shippingFee = await calculateShipping(shippingAddress, orderItems);

  const total = subtotal - discount + shippingFee;

  return NextResponse.json({
    success: true,
    data: {
      items: orderItems,
      pricing: {
        subtotal,
        discount,
        shippingFee,
        total
      },
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod
    }
  });
}

/**
 * 创建订单
 */
async function createOrder(client: any, data: any) {
  const { 
    customerId, 
    items, 
    shippingAddress, 
    billingAddress, 
    paymentMethod, 
    discountCode,
    notes 
  } = data;

  // 生成订单号
  const orderNo = `ORD${Date.now().toString(36).toUpperCase()}`;

  // 计算金额
  let subtotal = 0;
  for (const item of items) {
    subtotal += (item.unit_price || 0) * (item.quantity || 0);
  }

  // 应用折扣
  let discount = 0;
  if (discountCode) {
    const { data: discountInfo } = await client
      .from('discount_codes')
      .select('*')
      .eq('code', discountCode)
      .single();

    if (discountInfo) {
      discount = discountInfo.discount_type === 'percentage'
        ? subtotal * discountInfo.discount_value
        : discountInfo.discount_value;
    }
  }

  // 计算运费
  const shippingFee = await calculateShipping(shippingAddress, items);

  const total = subtotal - discount + shippingFee;

  // 创建订单
  const order = {
    order_no: orderNo,
    customer_id: customerId,
    subtotal,
    discount,
    shipping_fee: shippingFee,
    total_amount: total,
    status: 'pending',
    payment_status: 'unpaid',
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    payment_method: paymentMethod,
    notes,
    created_at: new Date().toISOString()
  };

  const { data: createdOrder, error } = await client
    .from('customer_orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;

  // 创建订单项
  const orderItems = items.map((item: any) => ({
    order_id: createdOrder.id,
    ...item
  }));

  await client
    .from('customer_order_items')
    .insert(orderItems);

  // 清空购物车
  await client
    .from('cart_items')
    .delete()
    .eq('customer_id', customerId);

  // 记录状态变更
  await client
    .from('order_status_history')
    .insert({
      order_id: createdOrder.id,
      status: 'pending',
      notes: '订单创建',
      created_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: {
      order: createdOrder,
      items: orderItems,
      message: '订单创建成功'
    }
  });
}

/**
 * 取消订单
 */
async function cancelOrder(client: any, data: any) {
  const { orderId, reason } = data;

  const { data: order } = await client
    .from('customer_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  if (!['pending', 'confirmed'].includes(order.status)) {
    return NextResponse.json({ 
      success: false, 
      error: '订单状态不允许取消' 
    }, { status: 400 });
  }

  const { data: updated, error } = await client
    .from('customer_orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  // 记录状态变更
  await client
    .from('order_status_history')
    .insert({
      order_id: orderId,
      status: 'cancelled',
      notes: reason || '订单取消',
      created_at: new Date().toISOString()
    });

  // 如果已付款，创建退款
  if (order.payment_status === 'paid') {
    await client
      .from('refunds')
      .insert({
        order_id: orderId,
        amount: order.total_amount,
        status: 'pending',
        reason: '订单取消退款',
        created_at: new Date().toISOString()
      });
  }

  return NextResponse.json({
    success: true,
    data: updated,
    message: '订单已取消'
  });
}

/**
 * 处理支付
 */
async function processPayment(client: any, data: any) {
  const { orderId, paymentMethod, amount, transactionId } = data;

  // 更新订单支付状态
  const { data: order, error } = await client
    .from('customer_orders')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      status: 'confirmed',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  // 记录支付
  await client
    .from('order_payments')
    .insert({
      order_id: orderId,
      payment_method: paymentMethod,
      amount,
      transaction_id: transactionId,
      status: 'completed',
      paid_at: new Date().toISOString()
    });

  // 记录状态变更
  await client
    .from('order_status_history')
    .insert({
      order_id: orderId,
      status: 'confirmed',
      notes: '支付完成，订单确认',
      created_at: new Date().toISOString()
    });

  // 触发后续流程（生成生产订单等）
  // 这里可以调用生产订单创建逻辑

  return NextResponse.json({
    success: true,
    data: order,
    message: '支付成功'
  });
}

// 辅助函数
function buildTrackingTimeline(statusHistory: any[], order: any): any[] {
  const statusNames: Record<string, string> = {
    pending: '订单待确认',
    confirmed: '订单已确认',
    in_production: '生产中',
    quality_check: '质检中',
    ready_to_ship: '待发货',
    shipped: '已发货',
    delivered: '已送达',
    cancelled: '已取消'
  };

  const defaultTimeline: any[] = [
    { status: 'pending', name: '订单创建', completed: false, timestamp: null, notes: null },
    { status: 'confirmed', name: '订单确认', completed: false, timestamp: null, notes: null },
    { status: 'in_production', name: '生产中', completed: false, timestamp: null, notes: null },
    { status: 'quality_check', name: '质检中', completed: false, timestamp: null, notes: null },
    { status: 'ready_to_ship', name: '待发货', completed: false, timestamp: null, notes: null },
    { status: 'shipped', name: '已发货', completed: false, timestamp: null, notes: null },
    { status: 'delivered', name: '已送达', completed: false, timestamp: null, notes: null }
  ];

  // 标记已完成状态
  statusHistory.forEach((h: any) => {
    const index = defaultTimeline.findIndex(t => t.status === h.status);
    if (index >= 0) {
      defaultTimeline[index].completed = true;
      defaultTimeline[index].timestamp = h.created_at;
      defaultTimeline[index].notes = h.notes;
    }
  });

  return defaultTimeline;
}

async function calculateShipping(address: any, items: any[]): Promise<number> {
  // 简化的运费计算
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // 根据地区和数量计算
  const baseRate = 10;
  const perItemRate = 2;

  return baseRate + perItemRate * Math.ceil(totalQuantity / 10);
}
