import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for UnassociatedDeposit document
 */
export interface IUnassociatedDeposit extends Document {
  txHash: string;
  fromAddress: string;
  toAddress: string; // Treasury wallet address
  amount: string;
  tokenSymbol: string;
  tokenContract: string;
  chainId: string;
  blockNumber: number;
  timestamp: Date;
  detectedAt: Date;
  status: 'detected' | 'reviewed' | 'ignored';
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
}

/**
 * Schema for UnassociatedDeposit
 * Tracks deposits sent directly to treasury that weren't initiated through UI
 */
const UnassociatedDepositSchema: Schema = new Schema({
  txHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  fromAddress: {
    type: String,
    required: true,
    index: true
  },
  toAddress: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: String,
    required: true
  },
  tokenSymbol: {
    type: String,
    required: true,
    index: true
  },
  tokenContract: {
    type: String,
    required: true
  },
  chainId: {
    type: String,
    required: true,
    index: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  detectedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['detected', 'reviewed', 'ignored'],
    default: 'detected',
    index: true
  },
  adminNotes: {
    type: String
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create indexes for efficient queries
UnassociatedDepositSchema.index({ chainId: 1, status: 1 });
UnassociatedDepositSchema.index({ detectedAt: -1 });
UnassociatedDepositSchema.index({ fromAddress: 1, chainId: 1 });

const UnassociatedDeposit = mongoose.model<IUnassociatedDeposit>('UnassociatedDeposit', UnassociatedDepositSchema);

export default UnassociatedDeposit;