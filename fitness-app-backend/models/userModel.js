// models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    roles: { type: [String], default: ['user'], index: true }
  },
  { timestamps: true }
);

// helpers
UserSchema.statics.hashPassword = async function (password) {
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  return bcrypt.hash(password, rounds);
};

UserSchema.methods.checkPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

UserSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    roles: this.roles,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', UserSchema);
