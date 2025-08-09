import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for TokenBalance document
 */
export interface ITokenBalance extends Document {
  userId: mongoose.Types.ObjectId;
  chainId: string;
  tokenSymbol: string;
  tokenContract: string;
  tokenDecimals: number;
  balance: string;
  isNativeToken: boolean;
  lastUpdated: Date;
}

/**
 * Schema for TokenBalance
 * Tracks user balances across multiple chains with separate balances per chain/layer
 */
const TokenBalanceSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  chainId: {
    type: String,
    required: true,
    index: true
  },
  tokenSymbol: {
    type: String,
    required: true,
    index: true
  },
  tokenContract: {
    type: String,
    required: true,
    index: true
  },
  tokenDecimals: {
    type: Number,
    required: true
  },
  balance: {
    type: String,
    required: true,
    default: '0'
  },
  isNativeToken: {
    type: Boolean,
    required: true,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index for efficient lookups
TokenBalanceSchema.index({ userId: 1, chainId: 1, tokenContract: 1 }, { unique: true });

// Create a model from the schema
const TokenBalance = mongoose.model<ITokenBalance>('TokenBalance', TokenBalanceSchema);

export default TokenBalance;