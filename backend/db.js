const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const CowSchema = new mongoose.Schema({
  _id: String,
  name: { type: String, required: true },
  breed: { type: String, required: true },
  birthDate: String,
  ageYears: Number,
  weight: Number,
  status: { type: String, enum: ['active', 'inactive', 'dry', 'pregnant'], default: 'active' },
  image: String,
  notes: String,
  calvingDate: String,
  lactationNumber: { type: Number, default: 0 },
  pregnancyDate: String,
  heatDate: String,
  dryDate: String
}, { timestamps: true });

const MilkSchema = new mongoose.Schema({
  _id: String,
  cowId: { type: String, required: true },
  date: { type: String, required: true },
  morning: { type: Number, default: 0 },
  evening: { type: Number, default: 0 },
  fatPercent: Number,
  snfPercent: Number,
  buyerId: String
}, { timestamps: true });

const ExpenseSchema = new mongoose.Schema({
  _id: String,
  cowId: String,
  date: { type: String, required: true },
  type: { type: String, enum: ['feed', 'medicine', 'misc', 'equipment', 'labor'], default: 'misc' },
  amount: { type: Number, required: true },
  note: String
}, { timestamps: true });

const RateSchema = new mongoose.Schema({
  _id: String,
  value: { type: Number, required: true },
  date: String
}, { timestamps: true });

const HealthSchema = new mongoose.Schema({
  _id: String,
  cowId: { type: String, required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['vaccination', 'treatment', 'checkup', 'deworming'], required: true },
  description: { type: String, required: true },
  medicine: String,
  vet: String,
  nextDueDate: String,
  cost: { type: Number, default: 0 },
  notes: String
}, { timestamps: true });

const BuyerSchema = new mongoose.Schema({
  _id: String,
  name: { type: String, required: true },
  phone: String,
  address: String,
  defaultRate: Number,
  notes: String
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
  farmName: { type: String, default: 'Usman Dairy Farm' }
}, { timestamps: true });

const RateHistorySchema = new mongoose.Schema({
  _id: String,
  value: Number,
  date: String,
  note: String
}, { timestamps: true });

// ─── Models ──────────────────────────────────────────────────────────────────
const Cow = mongoose.model('Cow', CowSchema);
const Milk = mongoose.model('Milk', MilkSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);
const Rate = mongoose.model('Rate', RateSchema);
const Health = mongoose.model('Health', HealthSchema);
const Buyer = mongoose.model('Buyer', BuyerSchema);
const User = mongoose.model('User', UserSchema);
const RateHistory = mongoose.model('RateHistory', RateHistorySchema);

module.exports = { connectDB, Cow, Milk, Expense, Rate, Health, Buyer, User, RateHistory };
