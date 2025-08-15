const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchoolSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 12,
        match: [/^[A-Z0-9_-]+$/i, 'School code may contain only letters, numbers, underscore and hyphen']
    },
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    contactEmail: {
        type: String,
        required: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    contactPhone: {
        type: String,
        required: true,
        trim: true
    },
    headmaster: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tradesOffered: [{
        type: Schema.Types.ObjectId,
        ref: 'Trade'
    }],
    category: {
        type: String,
        required: true,
        enum: ['REB', 'TVET', 'PRIMARY', 'OLEVEL', "CAMBRIDGE", 'UNIVERSITY'],
        trim: true
    },
    logo: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                return /^https?:\/\/.*\.(png|jpg|jpeg|svg|gif)$/i.test(v) ||
                    /^\/uploads\/.*\.(png|jpg|jpeg|svg|gif)$/i.test(v);
            },
            message: 'Please enter a valid image URL or local upload path'
        },
        default: null
    },
    website: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                if (!v) return true; // optional
                return /^https?:\/\/[\w.-]+(\.[\w\.-]+)+(\:[0-9]+)?(\/[^\s]*)?$/i.test(v);
            },
            message: 'Invalid website URL'
        },
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

SchoolSchema.index({ name: 1, category: 1 });
SchoolSchema.index({ code: 1 }, { unique: true });

SchoolSchema.pre('save', async function (next) {
    const User = mongoose.model('User');
    const Trade = mongoose.model('Trade');

    // Validate headmaster
    if (this.isModified('headmaster')) {
        const user = await User.findById(this.headmaster);
        if (!user || user.role !== 'headmaster') {
            return next(new Error('Headmaster must be a user with role "headmaster"'));
        }
    }

    // Validate tradesOffered against category
    if (this.isModified('tradesOffered') || this.isModified('category')) {
        if (this.tradesOffered.length > 0) {
            const trades = await Trade.find({ _id: { $in: this.tradesOffered }, isDeleted: false });
            const invalidTrades = trades.filter(trade => trade.category !== this.category);
            if (invalidTrades.length > 0) {
                return next(new Error(`All trades must belong to the school's category: ${this.category}`));
            }
        }
    }

    next();
});

module.exports = mongoose.model('School', SchoolSchema);
