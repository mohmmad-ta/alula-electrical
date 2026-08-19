const User = require('../../models/auth/userModel');
const Admin = require('../../models/auth/adminModel');
const catchAsync = require('../../utils/catchAsync');
const Order = require("../../models/orderModel");
const Product = require("../../models/productModel");
const Category = require('../../models/categoryModel');
const APIFeatures = require("../../utils/apiFeatures");
const factory = require('./../handlerFactory');
const AppError = require('../../utils/appError');
const { assertSafeObject } = require('../../utils/sanitizeRequest');
const {
    MAX_PRODUCT_IMAGES,
    removeProductImage,
    removeUploadedFiles,
    uploadedImagePaths,
} = require('../../utils/productImageUpload');

exports.getMeAdmin = catchAsync(async (req, res) => {
    req.params.id = req.user.id;
    const user = await Admin.findById(req.params.id);
    res.status(200).json({
        status: 'success',
        data: user
    });
});


// ###  === CRUD User ===  ###
exports.adminGetUser = factory.getOne(User);
exports.adminGetAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.adminUpdateUser = factory.updateOne(User);
exports.adminDeleteUser = factory.deleteOne(User);



// ### === CRUD Orders === ###
exports.adminGetOrder = factory.getOne(Order);
exports.adminUpdateOrder = factory.updateOne(Order);
exports.adminDeleteOrder = factory.deleteOne(Order);

exports.adminGetAllOrders = catchAsync(async (req, res) => {
    const features = new APIFeatures(Order.find(), req.query)
        .filter()
        .sort("-createdAt")
        .limitFields()
        .paginate();

    const data = await features.query;

    res.status(200).json({
        status: 'success',
        results: data.length,
        data
    });
});
// ### === CRUD Products === ###
exports.adminGetProduct = factory.getOne(Product, { includeInactive: true });

const productPayload = (body) => {
    const { name, price, description, category, active, tags, options } = body;
    return { name, price, description, category, active, tags, options };
};

const storedProductImages = (product) => {
    if (Array.isArray(product.images) && product.images.length) return product.images;
    return product.image ? [product.image] : [];
};

const ensureCategoryExists = async (categoryId) => {
    const categoryExists = categoryId && await Category.exists({ _id: categoryId });

    if (!categoryExists) {
        throw new AppError('الصنف المحدد غير موجود.', 400, {
            code: 'INVALID_PRODUCT_CATEGORY',
        });
    }
};

exports.adminCreateProduct = catchAsync(async (req, res, next) => {
    assertSafeObject(req.body, 'body');
    const images = uploadedImagePaths(req.files);

    if (!images.length) {
        return next(new AppError('يرجى رفع صورة واحدة على الأقل للمنتج.', 400, {
            code: 'PRODUCT_IMAGE_REQUIRED',
        }));
    }

    try {
        await ensureCategoryExists(req.body.category);
        const product = await Product.create({
            ...productPayload(req.body),
            image: images[0],
            images,
        });

        res.status(201).json({ status: 'success', data: product });
    } catch (error) {
        removeUploadedFiles(req.files);
        throw error;
    }
});

exports.adminUpdateProduct = catchAsync(async (req, res, next) => {
    assertSafeObject(req.body, 'body');
    const product = await Product.findById(req.params.id).setOptions({ includeInactive: true });

    if (!product) {
        removeUploadedFiles(req.files);
        return next(new AppError('العنصر المطلوب غير موجود أو تم حذفه.', 404, {
            code: 'RESOURCE_NOT_FOUND',
        }));
    }

    try {
        await ensureCategoryExists(req.body.category || product.category?._id || product.category);
    } catch (error) {
        removeUploadedFiles(req.files);
        throw error;
    }

    const previousImages = storedProductImages(product);
    const requestedImages = Array.isArray(req.body.existingImages)
        ? req.body.existingImages
        : previousImages;
    const retainedImages = requestedImages.filter((image) => previousImages.includes(image));

    if (retainedImages.length !== requestedImages.length) {
        removeUploadedFiles(req.files);
        return next(new AppError('تحتوي قائمة الصور على مسار غير صالح.', 400, {
            code: 'INVALID_PRODUCT_IMAGE_PATH',
        }));
    }

    const images = [...new Set([...retainedImages, ...uploadedImagePaths(req.files)])];

    if (!images.length) {
        removeUploadedFiles(req.files);
        return next(new AppError('يجب الاحتفاظ بصورة واحدة على الأقل للمنتج.', 400, {
            code: 'PRODUCT_IMAGE_REQUIRED',
        }));
    }

    if (images.length > MAX_PRODUCT_IMAGES) {
        removeUploadedFiles(req.files);
        return next(new AppError(`يمكن حفظ ${MAX_PRODUCT_IMAGES} صور كحد أقصى.`, 400, {
            code: 'TOO_MANY_PRODUCT_IMAGES',
        }));
    }

    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
                ...productPayload(req.body),
                image: images[0],
                images,
            },
            { returnDocument: 'after', runValidators: true }
        ).setOptions({ includeInactive: true });

        previousImages.filter((image) => !images.includes(image)).forEach(removeProductImage);
        res.status(200).json({ status: 'success', data: updatedProduct });
    } catch (error) {
        removeUploadedFiles(req.files);
        throw error;
    }
});

exports.adminDeleteProduct = catchAsync(async (req, res, next) => {
    const product = await Product.findByIdAndDelete(req.params.id).setOptions({ includeInactive: true });

    if (!product) {
        return next(new AppError('العنصر المطلوب غير موجود أو تم حذفه.', 404, {
            code: 'RESOURCE_NOT_FOUND',
        }));
    }

    storedProductImages(product).forEach(removeProductImage);
    res.status(204).json({ status: 'success', data: null });
});

exports.adminGetAllProduct = catchAsync(async (req, res) => {
    const features = new APIFeatures(Product.find().setOptions({ includeInactive: true }), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const data = await features.query;

    res.status(200).json({
        status: 'success',
        results: data.length,
        data
    });
});
