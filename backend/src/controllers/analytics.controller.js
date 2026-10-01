const { Order, OrderItem, Product, Address, User } = require('../models');
const { Op } = require('sequelize');
const { sendOrderShippedEmail } = require('../services/email.service');

// Only for displaying orders to process....
const getAnalytics = async (req, res) => {
  try {
    const vendorId = req.user?.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        error: 'Vendor access required',
      });
    }

    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          {
            status: 'paid',
            payment_method: 'Stripe',
          },
          {
            status: 'unpaid',
            payment_method: 'COD',
          },
          {
            status: 'shipped',
          },
        ],
      },
      include: [
        {
          model: OrderItem,
          as: 'items',
          required: true,
          include: [
            {
              model: Product,
              as: 'product',
              where: { vendorId },
              attributes: ['id', 'name', 'price', 'image_urls', 'vendorId'],
            },
          ],
        },
        {
          model: Address,
          as: 'address',
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    // Concise the response body
    const formattedOrders = orders.map(order => {
      let vendorSubtotal = 0;
      const items = (order.items || []).map(item => {
        const itemPrice = parseFloat(item.price);
        const itemQuantity = item.quantity;
        const itemTotal = itemPrice * itemQuantity;
        vendorSubtotal += itemTotal;

        return {
          id: item.id,
          productId: item.productId,
          name: item.product?.name || 'Unknown Product',
          imageUrl: item.product?.imageUrl || '',
          quantity: itemQuantity,
          price: itemPrice,
          total: Number(itemTotal.toFixed(2)),
        };
      });

      return {
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        paymentMethod: order.payment_method,
        customerName: order.user?.name || 'Guest Customer',
        customerEmail: order.user?.email || '',
        shippingAddress: order.address ? {
          fullName: order.address.fullName,
          phone: order.address.phone,
          addressLine1: order.address.addressLine1,
          addressLine2: order.address.addressLine2,
          city: order.address.city,
          state: order.address.state,
          postalCode: order.address.postalCode,
          country: order.address.country,
        } : null,
        items,
        vendorSubtotal: Number(vendorSubtotal.toFixed(2)),
        // JD shipment details — persisted in orders table
        jdShipmentId: order.jdShipmentId || null,
        jdAwb:        order.jdAwb        || null,
        jdCourier:    order.jdCourier    || null,
        jdLabelUrl:   order.jdLabelUrl   || null,
      };
    });

    return res.status(200).json({
      success: true,
      orders: formattedOrders,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
};

const updateOrderStatus = async (req, res) => {
	const orderId = req.params.id;
    const { pickup_address_id, weight, courier_code } = req.body;

	try {
		const order = await Order.findByPk(orderId, {
            include: [
                { model: Address, as: 'address' },
                { model: User,    as: 'user'    },
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{ model: Product, as: 'product' }]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Validate JD inputs
        if (!pickup_address_id || !weight || !courier_code) {
            return res.status(400).json({
                error: "pickup_address_id, weight, and courier_code are required"
            });
        }

        // ── Build shipment payload (matches POST /api/shipments spec) ──────────
        const nameParts = (order.user?.name || 'Customer Name').split(' ');
        const firstName = nameParts[0] || 'Customer';
        const lastName  = nameParts.slice(1).join(' ') || 'Name';

        const productName = order.items?.length > 0
            ? order.items.map(i => i.product?.name || 'Product').join(', ').substring(0, 50)
            : 'Products';

        // Build a clean SKU: use first 8 chars of product name, uppercased, joined
        const productSku = order.items?.length > 0
            ? order.items.map(i => {
                const n = (i.product?.name || 'PRD').replace(/\s+/g, '-').toUpperCase();
                return n.substring(0, 8);
              }).join('-').substring(0, 30)
            : 'SKU';

        const totalQuantity = order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 1;

        const shipmentData = {
            pickup_address_id:    parseInt(pickup_address_id, 10),
            courier_code:         String(courier_code),   // passed exactly as received from serviceability API
            weight:               Number(weight) / 1000,                     // grams → kg (shipment API expects kg)
            payment_method:       order.payment_method === 'Stripe' ? 'Prepaid' : 'COD',
            merchant_reference_id: order.id,
            declared_value:       parseFloat(order.netAmount) || 1000,
            first_name:           firstName,
            last_name:            lastName,
            email:                order.user?.email    || 'customer@example.com',
            phone_number:         order.address?.phone || '0000000000',
            address:              `${order.address?.addressLine1 || ''} ${order.address?.addressLine2 || ''}`.trim(),
            city:                 order.address?.city       || '',
            state:                order.address?.state      || '',
            pincode:              order.address?.postalCode || '',
            product_name:         productName,
            product_sku:          productSku,
            quantity:             totalQuantity,
        };

        console.log('[JD] Creating shipment:', JSON.stringify(shipmentData, null, 2));

        // ── Call JD API ────────────────────────────────────────────────────────
        const { createShipment } = require('../services/jdApiService');
        const jdResponse = await createShipment(shipmentData);

        console.log('[JD] Shipment response:', JSON.stringify(jdResponse, null, 2));

        if (jdResponse.status !== 200) {
            throw new Error(`JD API Error: ${jdResponse.message || 'Unknown error'}`);
        }

        const jdShipmentId = jdResponse.data?.shipment_id?.toString();
        const jdAwb        = jdResponse.data?.awb        || null;
        const labelUrl     = jdResponse.data?.label_url  || null;
        const courierName  = jdResponse.data?.courier    || courier_code;

        // ── Persist to DB ──────────────────────────────────────────────────────
        await order.update({
            status:       'shipped',
            jdShipmentId: jdShipmentId,
            jdAwb:        jdAwb,
            jdCourier:    courierName,
            jdLabelUrl:   labelUrl,
        });

        // send inform email to customer (currently disabled)
        // const customer = await User.findByPk(order.userId);
        // await sendOrderShippedEmail(customer.email, orderId, customer.name, ...);

        return res.status(200).json({
            success:      true,
            jdShipmentId: jdShipmentId,
            awb:          jdAwb,
            label_url:    labelUrl,
            courier:      courierName,
        });

	} catch(err) {
		console.error('[Ship Order]', err);
		res.status(500).json({ error: err.message || "Internal server error" });
	}
}

module.exports = { getAnalytics, updateOrderStatus };