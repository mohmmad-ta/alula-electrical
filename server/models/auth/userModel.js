const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
        name: {
            type: String,
            required: [true, 'يرجى إدخال الاسم'],
            unique: [true, 'هذا الاسم مستخدم مسبقًا'],
            trim: true,
            maxlength: [40, 'الاسم يجب ألا يزيد عن 40 حرفًا'],
            minlength: [3, 'الاسم يجب ألا يقل عن 3 أحرف']
        },
        phone: {
            type: String,
            unique: [true, 'رقم الهاتف مستخدم مسبقًا'],
            trim: true,
            required: [true, 'يرجى إدخال رقم الهاتف'],
        },
        role: {
            type: String,
            enum: ['user'],
            default: 'user'
        },
        active: {
            type: Boolean,
            default: true,
            select: false
        },
        password: {
            type: String,
            required: [true, 'يرجى إدخال كلمة المرور'],
            minlength: [8, 'كلمة المرور يجب ألا تقل عن 8 أحرف'],
            select: false
        },
        passwordConfirm: {
            type: String,
            required: [true, 'يرجى تأكيد كلمة المرور'],
            validate: {
                validator: function (el) {
                    return el === this.password;
                },
                message: 'كلمتا المرور غير متطابقتين!'
            }
        },
        passwordChangedAt: Date,
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true
    });



userSchema.pre(/^find/, function () {
    if (!this.getOptions().includeInactive) {
        this.find({ active: { $ne: false } });
    }
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
});

userSchema.pre('save', function () {
    if (!this.isModified('password') || this.isNew) return;

    this.passwordChangedAt = Date.now() - 1000;
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );

        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
