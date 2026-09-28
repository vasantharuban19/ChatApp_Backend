import mongoose, { Schema, Types, model } from "mongoose";

const messageSchema = new Schema(
  {
    content: {
      type: String,
      trim: true,
      default: "",
    },

    attachments: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],

    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    chat: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },

    deliveredTo: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],

    readBy: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ chat: 1, createdAt: -1 });

export const Message =
  mongoose.models.Message || model("Message", messageSchema);
