const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'يجب إدخال اسم المنتج'],
            trim: true,
            maxlength: [40, 'اسم المنتج يجب ألا يزيد عن 40 حرفًا'],
            minlength: [3, 'اسم المنتج يجب ألا يقل عن 3 أحرف'],
        },
        slug: String,
        price: {
            type: Number,
            required: [true, 'يجب إدخال سعر المنتج']
        },
        description: {
            type: String,
            trim: true,
        },
        category: {
            type: mongoose.Schema.ObjectId,
            required: [true, 'يجب إدخال الصنف'],
            ref: "Category"
        },
        image: {
            type: String,
            required: [true, 'يجب إدخال صورة للمنتج']
        },
        images: [
            {
                type: String,
            }
        ],
        active: {
            type: Boolean,
            default: true,
        },
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
        options: [
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
        createdAt: {
            type: Date,
            default: Date.now,
            select: false
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);


productSchema.index({ price: 1 });
productSchema.index({ slug: 1 });

productSchema.pre('save', function () {
    this.slug = slugify(this.name, { lower: true });
});

productSchema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate() || {};
    const name = update?.name || update?.$set?.name;

    if (name) {
        const slug = slugify(name, { lower: true });

        if (update.$set) {
            update.$set.slug = slug;
        } else {
            update.slug = slug;
        }

        this.setUpdate(update);
    }
});

productSchema.pre(/^find/, function () {
    if (!this.getOptions().includeInactive) {
        this.find({ active: { $ne: false } });
    }

    this.populate({
        path: 'category',
        select: '-__v -createdAt -updatedAt'
    });
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
