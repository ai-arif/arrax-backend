const Counter = require("../models/Counter"); // Import Counter model

const getNextSequence = async (counterName) => {
  const counter = await Counter.findByIdAndUpdate(
    counterName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true } // Create the counter if it doesn't exist
  );
  return counter.seq;
};

module.exports = getNextSequence;
