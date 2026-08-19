const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AppError = require('./appError');

const MAX_PRODUCT_IMAGES = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const PUBLIC_IMAGE_PREFIX = '/public/images/products/';
const uploadDirectory = path.join(__dirname, '..', 'public', 'images', 'products');

fs.mkdirSync(uploadDirectory, { recursive: true });

const extensionByMimeType = {
    'image/avif': '.avif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, uploadDirectory),
    filename: (req, file, callback) => {
        const extension = extensionByMimeType[file.mimetype];
        callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
});

const uploader = multer({
    storage,
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: MAX_PRODUCT_IMAGES,
        fields: 20,
        parts: 30,
    },
    fileFilter: (req, file, callback) => {
        if (!extensionByMimeType[file.mimetype]) {
            return callback(new AppError('يسمح فقط بصور JPG وPNG وWebP وAVIF.', 400, {
                code: 'INVALID_PRODUCT_IMAGE_TYPE',
            }));
        }

        callback(null, true);
    },
}).array('images', MAX_PRODUCT_IMAGES);

const removeProductImage = (imagePath) => {
    if (typeof imagePath !== 'string' || !imagePath.startsWith(PUBLIC_IMAGE_PREFIX)) return;

    const filename = path.basename(imagePath);
    const filePath = path.join(uploadDirectory, filename);

    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (error) {
        console.error(`Failed to remove product image ${filename}:`, error.message);
    }
};

const removeUploadedFiles = (files = []) => {
    files.forEach((file) => removeProductImage(`${PUBLIC_IMAGE_PREFIX}${file.filename}`));
};

const uploadProductImages = (req, res, next) => {
    uploader(req, res, (error) => {
        if (!error) return next();

        removeUploadedFiles(req.files);

        if (error instanceof multer.MulterError) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'حجم كل صورة يجب ألا يتجاوز 5 ميغابايت.'
                : `يمكن رفع ${MAX_PRODUCT_IMAGES} صور كحد أقصى.`;
            return next(new AppError(message, 400, { code: error.code }));
        }

        next(error);
    });
};

const parseJsonField = (body, field, fallback) => {
    if (typeof body[field] !== 'string') return;

    try {
        body[field] = JSON.parse(body[field]);
    } catch {
        throw new AppError(`تعذر قراءة حقل ${field}.`, 400, {
            code: 'INVALID_MULTIPART_FIELD',
        });
    }

    if (body[field] === null || body[field] === undefined) body[field] = fallback;
};

const hasValidImageSignature = (file) => {
    const descriptor = fs.openSync(file.path, 'r');
    const header = Buffer.alloc(16);

    try {
        fs.readSync(descriptor, header, 0, header.length, 0);
    } finally {
        fs.closeSync(descriptor);
    }

    if (file.mimetype === 'image/jpeg') return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    if (file.mimetype === 'image/png') return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (file.mimetype === 'image/webp') return header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
    if (file.mimetype === 'image/avif') return header.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis', 'mif1'].includes(header.toString('ascii', 8, 12));
    return false;
};

const parseProductMultipartFields = (req, res, next) => {
    try {
        if ((req.files || []).some((file) => !hasValidImageSignature(file))) {
            throw new AppError('محتوى أحد الملفات لا يطابق صيغة صورة صالحة.', 400, {
                code: 'INVALID_PRODUCT_IMAGE_CONTENT',
            });
        }

        parseJsonField(req.body, 'options', []);
        parseJsonField(req.body, 'tags', []);
        parseJsonField(req.body, 'existingImages', []);

        if (typeof req.body.active === 'string') req.body.active = req.body.active === 'true';
        if (typeof req.body.price === 'string') req.body.price = Number(req.body.price);

        next();
    } catch (error) {
        removeUploadedFiles(req.files);
        next(error);
    }
};

const uploadedImagePaths = (files = []) => files.map((file) => `${PUBLIC_IMAGE_PREFIX}${file.filename}`);

module.exports = {
    MAX_PRODUCT_IMAGES,
    parseProductMultipartFields,
    removeProductImage,
    removeUploadedFiles,
    uploadProductImages,
    uploadedImagePaths,
};
