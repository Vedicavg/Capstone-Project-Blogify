import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,  // Ensures no leading or trailing spaces
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Convert email to lowercase
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'], // Email validation
  },
  password: {
    type: String,
    required: true,
    minlength: 6,  // Minimum password length
  },
  createdAt: {
    type: Date,
    default: Date.now,  // Auto-generates the creation date
  },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    // Hash the password with a salt rounds of 10
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare provided password with stored hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create a User model based on the schema
const User = mongoose.model('User', userSchema);

export default User;
