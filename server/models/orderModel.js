const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const normalizeChoiceTitle = (value) => String(value || '').trim();

const getProductTagPrice = (product, selectedTag) => {
    const selectedTitle = normalizeChoiceTitle(selectedTag?.title);

    if (!selectedTitle) {
        return null;
    }

    const matchedTag = (product?.tags || []).find((tag) => normalizeChoiceTitle(tag?.title) === selectedTitle);

    if (!matchedTag) {
        return null;
    }

    return Number(matchedTag.price || 0);
};

const getProductOptionPrice = (product, selectedOption) => {
    const selectedTitle = normalizeChoiceTitle(selectedOption?.title);
    const productOptions = product?.options || [];

    if (!productOptions.length) {
        return null;
    }

    if (!selectedTitle) {
        return Math.max(0, Number(productOptions[0]?.price || 0));
    }

    const matchedOption = productOptions.find((option) => normalizeChoiceTitle(option?.title) === selectedTitle);

    if (!matchedOption) {
        return null;
    }

    return Math.max(0, Number(matchedOption.price || 0));
};

const orderSchema = new mongoose.Schema(
    {
        item: [
            {
                Id: {
                    type: mongoose.Schema.ObjectId,
                    ref: 'Product',
                    required: [true, 'يرجى إدخال رقم الوجبة'],
                },
                notes: [
                    {
                        title: {
                            type: String,
                        },
                    }
                ],
                tags: [
                    {
                        title: {
                            type: String,
                        },
                        price: {
                            type: Number,
                            default: 0,
                        },
                    }
                ],
                option: {
                    title: {
                        type: String,
                    },
                    price: {
                        type: Number,
                        default: 0,
                    },
                },
                count: {
                    type: Number,
                    required: [true, 'يرجى إدخال عدد الوجبات'],
                }
            }
        ],
        userId: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'يرجى إدخال رقم المستخدم'],
        },
        location: {
            type: Object,
            required: [true, 'يرجى إدخال الموقع'],
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        couponCode: {
            type: String,
            trim: true,
            uppercase: true,
        },
        status: {
            type: String,
            enum: ['0', '1', '2', '3', '4'], // 0=deleted, 1=pending, 2=preparing, 3=on the way, 4=delivered
            default: '1'
        },
        totalPrice: {
            type: Number,
            default: 0
        },
        totalPriceBeforeDiscount: {
            type: Number,
            default: 0
        }
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

orderSchema.index({ status: 1, createdAt: 1 });

// Auto populate relations when finding
orderSchema.pre(/^find/, function () {
    if (!this.getOptions().includeDeleted) {
        this.find({ status: { $ne: '0' } });
    }

    this.populate({
        path: 'userId',
        select: '-__v -location -role'
    }).populate({
        path: 'item.Id',
        select: '-__v -role',
        options: { includeInactive: true }
    });
});

// Calculate total price before saving
orderSchema.pre('save', async function () {
    if (!this.isModified('item')) return;

    await this.populate({
        path: 'item.Id',
        options: { includeInactive: true }
    });

    let total = 0;

    for (const el of this.item) {
        if (!el?.Id) {
            throw new AppError('هذا المنتج غير موجود أو غير متاح للطلب.', 400);
        }

        if (el.Id.active === false) {
            throw new AppError('هذا المنتج غير متاح للطلب حالياً.', 400);
        }

        if (el?.Id) {
            const productOptions = el.Id.options || [];
            const optionSource = el.option?.title ? el.option : productOptions[0];
            const backendOptionPrice = productOptions.length ? getProductOptionPrice(el.Id, optionSource) : null;

            if (productOptions.length && backendOptionPrice === null) {
                throw new AppError('خيار المنتج غير صالح.', 400);
            }

            const productBasePrice = productOptions.length
                ? Number(backendOptionPrice || 0)
                : Number(el.Id.price || 0);
            const basePrice = productBasePrice * el.count;

            // Tags price × count
            let tagsPrice = 0;
            if (el.tags && el.tags.length > 0) {
                for (const tag of el.tags) {
                    const backendTagPrice = getProductTagPrice(el.Id, tag);

                    if (backendTagPrice === null) {
                        throw new AppError('خيار الإضافة غير صالح لهذا المنتج.', 400);
                    }

                    tag.price = backendTagPrice;
                    tagsPrice += backendTagPrice;
                }

                tagsPrice *= el.count;
            }

            if (productOptions.length) {
                const selectedBackendOption = optionSource || productOptions[0];
                el.option = {
                    title: selectedBackendOption?.title,
                    price: backendOptionPrice,
                };
            }

            total += basePrice + tagsPrice;
        }
    }

    this.totalPriceBeforeDiscount = total;
    this.totalPrice = total;
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
