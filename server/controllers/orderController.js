const Order = require('../models/orderModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { assertSafeObject } = require('../utils/sanitizeRequest');

const MAX_ORDER_ITEMS = 50;
const MAX_ITEM_QUANTITY = 99;

const cleanText = (value, maxLength = 160) => String(value || '').trim().slice(0, maxLength);

const normalizeChoice = (choice) => {
    const title = cleanText(choice?.title, 80);
    return title ? { title } : undefined;
};

const normalizeOrderItems = (items) => {
    if (!Array.isArray(items) || !items.length || items.length > MAX_ORDER_ITEMS) {
        throw new AppError('يجب أن يحتوي الطلب على منتج واحد على الأقل.', 400, {
            code: 'INVALID_ORDER_ITEMS',
        });
    }

    return items.map((item) => {
        const productId = item?.Id || item?.id || item?._id;
        const count = Number(item?.count);

        if (!productId || !Number.isInteger(count) || count < 1 || count > MAX_ITEM_QUANTITY) {
            throw new AppError('تحتوي السلة على منتج أو كمية غير صالحة.', 400, {
                code: 'INVALID_ORDER_ITEM',
            });
        }

        return {
            Id: productId,
            count,
            option: normalizeChoice(item.option),
            tags: Array.isArray(item.tags) ? item.tags.map(normalizeChoice).filter(Boolean) : [],
        };
    });
};

const normalizeLocation = (location) => {
    if (!location || typeof location !== 'object' || Array.isArray(location)) {
        throw new AppError('يرجى إدخال عنوان التوصيل.', 400, {
            code: 'DELIVERY_LOCATION_REQUIRED',
        });
    }

    const city = cleanText(location.city, 80);
    const address = cleanText(location.address, 240);

    if (!city || address.length < 5) {
        throw new AppError('يرجى إدخال المدينة وعنوان توصيل واضح.', 400, {
            code: 'INVALID_DELIVERY_LOCATION',
        });
    }

    return {
        city,
        district: cleanText(location.district, 120),
        address,
        notes: cleanText(location.notes, 300),
    };
};

exports.createOrder = catchAsync(async (req, res) => {
    assertSafeObject(req.body, 'body');

    const order = await Order.create({
        userId: req.user.id,
        item: normalizeOrderItems(req.body.item),
        location: normalizeLocation(req.body.location),
    });

    res.status(201).json({
        status: 'success',
        data: { order },
    });
});

exports.getMyOrders = catchAsync(async (req, res) => {
    const orders = await Order.find({ userId: req.user.id }).sort('-createdAt').limit(50);

    res.status(200).json({
        status: 'success',
        results: orders.length,
        data: orders,
    });
});
