import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for WithdrawalRequest document
 */
export interface IWithdrawalRequest extends Document {
  userId: mongoose.Types.ObjectId;
  chainId: string;
  tokenSymbol: string;
  tokenContract: string;
  amount: string;
  destinationAddress: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  adminNotes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  processedAt?: Date;
  txHash?: string;
  gasUsed?: string;
  gasFee?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for WithdrawalRequest
 */
const WithdrawalRequestSchema: Schema = new Schema({
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
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  destinationAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  adminNotes: {
    type: String
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  processedAt: {
    type: Date
  },
  txHash: {
    type: String,
    index: true
  },
  gasUsed: {
    type: String
  },
  gasFee: {
    type: String
  }
}, {
  timestamps: true
});

// Create indexes for efficient queries
WithdrawalRequestSchema.index({ userId: 1, status: 1 });
WithdrawalRequestSchema.index({ chainId: 1, status: 1 });
WithdrawalRequestSchema.index({ createdAt: -1 });

const WithdrawalRequest = mongoose.model<IWithdrawalRequest>('WithdrawalRequest', WithdrawalRequestSchema);

export default WithdrawalRequest;