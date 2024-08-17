import mongoose, { Schema } from 'mongoose'

// create a schema
const tweetSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    content: {
        type: String,
        required: true
    },

}, { timestamps: true })

// create a model

export const Tweet = mongoose.model('Tweet', tweetSchema)