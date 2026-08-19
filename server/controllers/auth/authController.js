const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const Admin = require('../../models/auth/adminModel');
const User = require('../../models/auth/userModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

const parsePositiveIntegerEnv = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_JWT_EXPIRES_IN_DAYS = parsePositiveIntegerEnv(process.env.JWT_EXPIRES_IN_DAYS, 60);
const DEFAULT_JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || `${DEFAULT_JWT_EXPIRES_IN_DAYS}d`;
const DEFAULT_JWT_COOKIE_EXPIRES_IN_DAYS = parsePositiveIntegerEnv(
    process.env.JWT_COOKIE_EXPIRES_IN,
    DEFAULT_JWT_EXPIRES_IN_DAYS
);
const ADMIN_JWT_EXPIRES_IN_DAYS = parsePositiveIntegerEnv(process.env.ADMIN_JWT_EXPIRES_IN_DAYS, 1);
const ADMIN_JWT_EXPIRES_IN = `${ADMIN_JWT_EXPIRES_IN_DAYS}d`;
const ADMIN_JWT_COOKIE_EXPIRES_IN_DAYS = parsePositiveIntegerEnv(
    process.env.ADMIN_JWT_COOKIE_EXPIRES_IN,
    ADMIN_JWT_EXPIRES_IN_DAYS
);

const parseBooleanEnv = (value, fallback = false) => {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return fallback;
};

const getTokenFromRequest = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        return req.headers.authorization.split(' ')[1];
    }

    if (req.cookies.jwt) {
        return req.cookies.jwt;
    }

    return null;
};

const signToken = (id, expiresIn = DEFAULT_JWT_EXPIRES_IN) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });

const buildJwtCookieOptions = (
    expiresInDays = process.env.JWT_COOKIE_EXPIRES_IN || DEFAULT_JWT_COOKIE_EXPIRES_IN_DAYS
) => {
    const secureCookies = parseBooleanEnv(
        process.env.JWT_COOKIE_SECURE,
        process.env.NODE_ENV === 'production'
    );
    const sameSite = process.env.JWT_COOKIE_SAMESITE || (secureCookies ? 'none' : 'lax');
    const cookieOptions = {
        expires: new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite,
        secure: secureCookies,
        path: process.env.JWT_COOKIE_PATH || '/',
    };

    if (process.env.JWT_COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.JWT_COOKIE_DOMAIN;
    }

    return cookieOptions;
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    res.cookie('jwt', token, buildJwtCookieOptions());
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user },
    });
};

const createSendAdminSession = (user, statusCode, res) => {
    const token = signToken(user._id, ADMIN_JWT_EXPIRES_IN);
    res.cookie('jwt', token, buildJwtCookieOptions(ADMIN_JWT_COOKIE_EXPIRES_IN_DAYS));
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        data: { user },
    });
};

exports.signupUser = catchAsync(async (req, res) => {
    const { phone, name, password } = req.body;
    const user = await User.create({
        name,
        phone,
        password,
        passwordConfirm: password,
    });

    createSendToken(user, 201, res);
});

exports.loginUser = catchAsync(async (req, res, next) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return next(new AppError('يرجى إدخال رقم الهاتف وكلمة المرور!', 400));
    }

    const user = await User.findOne({ phone }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('رقم الهاتف أو كلمة المرور غير صحيحة!', 401));
    }

    createSendToken(user, 200, res);
});

exports.loginAdmin = catchAsync(async (req, res, next) => {
    const { userID, password } = req.body;
    if (!userID || !password) {
        return next(new AppError('يرجى إدخال اسم المستخدم وكلمة المرور!', 400));
    }

    const user = await Admin.findOne({ userID }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('اسم المستخدم أو كلمة المرور غير صحيحة!', 401));
    }

    createSendAdminSession(user, 200, res);
});

exports.protect = (Model) => catchAsync(async (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (!token) {
        return next(new AppError('أنت غير مسجل الدخول! يرجى تسجيل الدخول للوصول.', 401));
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await Model.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('المستخدم المرتبط بهذا التوكن لم يعد موجودًا.', 401));
    }

    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

exports.protectAnyRole = catchAsync(async (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (!token) {
        return next(new AppError('أنت غير مسجل الدخول! يرجى تسجيل الدخول للوصول.', 401));
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const models = [Admin, User];
    let currentUser = null;

    for (const Model of models) {
        currentUser = await Model.findById(decoded.id);
        if (currentUser) {
            break;
        }
    }

    if (!currentUser) {
        return next(new AppError('المستخدم المرتبط بهذا التوكن لم يعد موجودًا.', 401));
    }

    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

exports.checkToken = catchAsync(async (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (!token) {
        return next(new AppError('أنت غير مسجل الدخول! يرجى إرسال التوكن أولاً.', 401));
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const models = [Admin, User];
    let currentUser = null;

    for (const Model of models) {
        currentUser = await Model.findById(decoded.id);
        if (currentUser) {
            break;
        }
    }

    if (!currentUser) {
        return next(new AppError('المستخدم المرتبط بهذا التوكن لم يعد موجودًا.', 401));
    }

    currentUser.password = undefined;
    res.status(200).json({
        status: 'success',
        valid: true,
        data: { user: currentUser },
    });
});

exports.logout = catchAsync(async (req, res) => {
    const cookieOptions = {
        ...buildJwtCookieOptions(),
        expires: new Date(0),
    };

    res.clearCookie('jwt', cookieOptions);
    res.clearCookie('id', cookieOptions);
    res.status(201).json({ status: 'success' });
});

exports.restrictTo = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return next(new AppError('ليس لديك الصلاحية لتنفيذ هذا الإجراء', 403));
    }
    next();
};

exports.updatePassword = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.correctPassword(req.body.passwordConfirm, user.password))) {
        return next(new AppError('كلمة المرور الحالية غير صحيحة.', 401));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.password;
    await user.save();
    createSendToken(user, 200, res);
});
