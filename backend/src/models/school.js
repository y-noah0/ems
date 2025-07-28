const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchoolSchema = new Schema({
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
    logo: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/i, 'Please enter a valid image URL'],
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

SchoolSchema.index({ name: 1 });

SchoolSchema.pre('save', async function (next) {
    if (this.isModified('headmaster')) {
        const User = mongoose.model('User');
        const user = await User.findById(this.headmaster);
        if (!user || user.role !== 'headmaster') {
            return next(new Error('Headmaster must be a user with role "headmaster"'));
        }
    }
    next();
});

module.exports = mongoose.model('School', SchoolSchema);