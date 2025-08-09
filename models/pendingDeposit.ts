import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for PendingDeposit document
 */
export interface IPendingDeposit extends Document {
  userId: mongoose.Types.ObjectId;
  chainId: string;
  tokenSymbol: string;
  tokenContract: string;
  amount: string;
  expectedTxHash?: string;
  actualTxHash?: string;
  treasuryAddress: string;
  userWalletAddress: string;
  status: 'initiated' | 'signed' | 'confirmed' | 'failed' | 'expired';
  initiatedAt: Date;
  signedAt?: Date;
  confirmedAt?: Date;
  expiresAt: Date;
  failureReason?: string;
}

/**
 * Schema for PendingDeposit
 * Tracks deposits initiated through the UI that are awaiting confirmation
 */
const PendingDepositSchema: Schema = new Schema({
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
    required: true
  },
  tokenContract: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  expectedTxHash: {
    type: String,
    index: true
  },
  actualTxHash: {
    type: String,
    index: true
  },
  treasuryAddress: {
    type: String,
    required: true
  },
  userWalletAddress: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['initiated', 'signed', 'confirmed', 'failed', 'expired'],
    default: 'initiated',
    index: true
  },
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  signedAt: {
    type: Date
  },
  confirmedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  failureReason: {
    type: String
  }
}, {
  timestamps: true
});

// Create indexes for efficient queries
PendingDepositSchema.index({ userId: 1, status: 1 });
PendingDepositSchema.index({ actualTxHash: 1 }, { sparse: true });
PendingDepositSchema.index({ expiresAt: 1 });

const PendingDeposit = mongoose.model<IPendingDeposit>('PendingDeposit', PendingDepositSchema);

export default PendingDeposit;